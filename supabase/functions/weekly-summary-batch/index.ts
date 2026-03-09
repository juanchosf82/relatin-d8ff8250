import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active projects with client_user_id
    const { data: projects } = await supabase
      .from("projects")
      .select("id, code, address, progress_pct, status, client_user_id")
      .not("client_user_id", "is", null);

    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ message: "No projects with clients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group projects by client
    const clientProjects: Record<string, { profile: any; projects: any[] }> = {};

    for (const proj of projects) {
      const uid = proj.client_user_id!;
      if (!clientProjects[uid]) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, email, full_name")
          .eq("id", uid)
          .single();
        if (!profile?.email) continue;
        clientProjects[uid] = { profile, projects: [] };
      }

      // Get latest report week
      const { data: reports } = await supabase
        .from("weekly_reports")
        .select("week_number")
        .eq("project_id", proj.id)
        .order("week_number", { ascending: false })
        .limit(1);

      // Get budget progress from SOV
      const { data: sovLines } = await supabase
        .from("sov_lines")
        .select("budget_progress_pct")
        .eq("project_id", proj.id);

      const budgetProgress = sovLines
        ? Math.round(sovLines.reduce((a, c) => a + (c.budget_progress_pct ?? 0), 0))
        : 0;

      // Check notification preference
      const { data: accessRows } = await supabase
        .from("user_project_access")
        .select("permissions")
        .eq("user_id", uid)
        .eq("project_id", proj.id)
        .limit(1);

      if (accessRows && accessRows.length > 0) {
        const perms = accessRows[0].permissions as Record<string, any> | null;
        const notifs = perms?.notifications ?? {};
        if (notifs.weekly_summary === false) continue;
      }

      clientProjects[uid].projects.push({
        code: proj.code,
        address: proj.address,
        progress_pct: proj.progress_pct ?? 0,
        budget_progress: budgetProgress,
        last_week: reports?.[0]?.week_number ?? null,
        status: proj.status ?? "on_track",
      });
    }

    // Send emails
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    let sent = 0;

    for (const [userId, { profile, projects: clientProjs }] of Object.entries(clientProjects)) {
      if (clientProjs.length === 0) continue;

      const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          type: "weekly_summary",
          to: profile.email,
          data: {
            client_name: profile.full_name || profile.email,
            projects: clientProjs,
          },
        }),
      });

      // Log
      await supabase.from("notifications_log").insert({
        user_id: userId,
        project_id: clientProjs[0]?.code ? null : null,
        type: "weekly_summary",
        subject: "Resumen semanal",
        status: res.ok ? "sent" : "failed",
      });

      if (res.ok) sent++;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("weekly-summary-batch error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
