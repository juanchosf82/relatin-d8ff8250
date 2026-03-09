import { supabase } from "@/integrations/supabase/client";

interface NotifyParams {
  type: string;
  to: string;
  data: Record<string, unknown>;
  userId: string;
  projectId: string;
  subject?: string;
}

/**
 * Sends a notification email and logs it to notifications_log.
 * Checks notification preferences before sending.
 */
export async function sendNotification({ type, to, data, userId, projectId, subject }: NotifyParams) {
  try {
    // Check notification preferences from user_project_access
    const prefKey = getPreferenceKey(type);
    if (prefKey) {
      const { data: accessRows } = await supabase
        .from("user_project_access")
        .select("permissions")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .limit(1);

      if (accessRows && accessRows.length > 0) {
        const perms = accessRows[0].permissions as Record<string, unknown> | null;
        const notifications = (perms?.notifications ?? {}) as Record<string, boolean>;
        if (notifications[prefKey] === false) {
          console.log(`Notification ${type} skipped — user preference disabled`);
          return { skipped: true };
        }
      }
    }

    const { data: result, error } = await supabase.functions.invoke("send-notification", {
      body: { type, to, data },
    });

    // Log the notification
    await supabase.from("notifications_log" as any).insert({
      user_id: userId,
      project_id: projectId,
      type,
      subject: subject || type,
      status: error ? "failed" : "sent",
    });

    if (error) {
      console.error("Notification error:", error);
      return { error };
    }

    return { success: true, ...result };
  } catch (err) {
    console.error("sendNotification failed:", err);
    return { error: err };
  }
}

function getPreferenceKey(type: string): string | null {
  const map: Record<string, string> = {
    report_published: "reports",
    draw_status_changed: "draws",
    project_issue: "alerts",
    weekly_summary: "weekly_summary",
  };
  return map[type] || null;
}

/**
 * Helper to fetch client info for a project
 */
export async function getClientInfoForProject(projectId: string) {
  const { data: project } = await supabase
    .from("projects")
    .select("client_user_id, code, address")
    .eq("id", projectId)
    .single();

  if (!project?.client_user_id) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", project.client_user_id)
    .single();

  if (!profile?.email) return null;

  return {
    userId: profile.id,
    email: profile.email,
    clientName: profile.full_name || profile.email,
    projectCode: project.code,
    projectAddress: project.address,
    projectId,
  };
}
