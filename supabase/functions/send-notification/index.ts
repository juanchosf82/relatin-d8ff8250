import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = "notificaciones@relatin.co";
const PORTAL_BASE = "https://www.relatin.co";

// ── HTML helpers ──────────────────────────────────────────────

function layout(body: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl
    ? `<div style="text-align:center;margin:32px 0">
        <a href="${ctaUrl}" style="display:inline-block;background:#0F1B2D;color:#ffffff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none">${ctaLabel ?? "VER EN PORTAL →"}</a>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5">
    <tr><td align="center" style="padding:24px 16px">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:#0F1B2D;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
          <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px">relatin.co</div>
          <div style="color:#0D7377;font-size:11px;margin-top:4px">powered by Relatin.co</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#ffffff;padding:36px 32px;font-size:16px;color:#333333;line-height:1.65;border-left:1px solid #e5e5e5;border-right:1px solid #e5e5e5">
          ${body}
          ${cta}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e5e5;border-top:none;text-align:center;font-size:12px;color:#9ca3af">
          relatin.co · Relatin.co OPR Services · St.&nbsp;Petersburg, FL<br>
          Para dejar de recibir notificaciones: <a href="mailto:ops@relatin.co" style="color:#0D7377">ops@relatin.co</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Email builders ────────────────────────────────────────────

function buildReportPublished(data: Record<string, unknown>) {
  const { client_name, project_code, project_address, week_number, highlight_text, project_id } = data as Record<string, string>;
  return {
    subject: `Nuevo reporte disponible — ${project_code}`,
    html: layout(
      `<p>Hola <strong>${client_name}</strong>,</p>
       <p>El reporte de la <strong>Semana ${week_number}</strong> para tu proyecto <strong>${project_address}</strong> ya está disponible en el portal.</p>
       ${highlight_text ? `<div style="background:#f0fdfa;border-left:3px solid #0D7377;padding:12px 16px;margin:16px 0;font-size:14px;color:#333">${highlight_text}</div>` : ""}
       <p style="color:#6b7280;font-size:14px">Si tienes preguntas, responde a este email.</p>
       <p>— Equipo Relatin.co</p>`,
      `${PORTAL_BASE}/portal/proyecto/${project_id}`,
      "VER REPORTE →"
    ),
  };
}

const drawStatusMap: Record<string, string> = {
  pending: "En revisión por el OPR",
  review: "En revisión — documentos verificados",
  sent: "Enviado al banco para aprobación",
  paid: "Aprobado y pagado ✓",
};

function buildDrawStatusChanged(data: Record<string, unknown>) {
  const { client_name, project_code, draw_number, amount, status, project_id } = data as Record<string, string>;
  const statusText = drawStatusMap[status] ?? status;
  const formatted = Number(amount).toLocaleString("en-US", { style: "currency", currency: "USD" });
  return {
    subject: `Draw #${draw_number} actualizado — ${project_code}`,
    html: layout(
      `<p>Hola <strong>${client_name}</strong>,</p>
       <p>El estado de tu <strong>Draw #${draw_number}</strong> por <strong>${formatted}</strong> ha cambiado a:</p>
       <div style="background:#f0fdfa;border-left:3px solid #0D7377;padding:12px 16px;margin:16px 0;font-size:15px;font-weight:600;color:#0F1B2D">${statusText}</div>
       <p>— Equipo Relatin.co</p>`,
      `${PORTAL_BASE}/portal/proyecto/${project_id}`,
      "VER EN PORTAL →"
    ),
  };
}

function buildProjectIssue(data: Record<string, unknown>) {
  const { client_name, project_code, project_address, level, description, project_id } = data as Record<string, string>;
  const levelColors: Record<string, string> = { critical: "#dc2626", high: "#ea580c", medium: "#d97706" };
  const levelLabels: Record<string, string> = { critical: "CRÍTICO", high: "ALTO", medium: "MEDIO" };
  const color = levelColors[level] ?? "#d97706";
  const label = levelLabels[level] ?? level.toUpperCase();
  return {
    subject: `⚠️ Alerta ${label} — ${project_code}`,
    html: layout(
      `<p>Hola <strong>${client_name}</strong>,</p>
       <p>Se ha registrado una alerta en tu proyecto <strong>${project_address}</strong>:</p>
       <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0">
         <tr><td style="padding:8px 0;font-size:13px;color:#6b7280">Nivel</td>
             <td style="padding:8px 0;font-weight:700;color:${color}">${label}</td></tr>
         <tr><td style="padding:8px 0;font-size:13px;color:#6b7280">Detalle</td>
             <td style="padding:8px 0">${description}</td></tr>
       </table>
       <p>Tu OPR está gestionando la situación.</p>
       <p>— Equipo Relatin.co</p>`,
      `${PORTAL_BASE}/portal/proyecto/${project_id}`,
      "VER EN PORTAL →"
    ),
  };
}

function buildWelcome(data: Record<string, unknown>) {
  const { client_name, project_code, project_address } = data as Record<string, string>;
  return {
    subject: `Bienvenido al portal relatin.co — ${project_code}`,
    html: layout(
      `<p>Hola <strong>${client_name}</strong>,</p>
       <p>Tu OPR Relatin.co ha configurado el acceso a tu proyecto.</p>
       <div style="background:#f9fafb;padding:16px;border-radius:8px;margin:16px 0">
         <div style="font-size:13px;color:#6b7280">Proyecto</div>
         <div style="font-size:15px;font-weight:600;color:#0F1B2D">${project_address}</div>
       </div>
       <p>No necesitas contraseña — solo ingresa tu email y recibirás un link de acceso.</p>
       <p>— Equipo Relatin.co</p>`,
      `${PORTAL_BASE}/login`,
      "ACCEDER AL PORTAL →"
    ),
  };
}

function buildWeeklySummary(data: Record<string, unknown>) {
  const { client_name, projects } = data as { client_name: string; projects: Array<Record<string, unknown>> };
  const rows = (projects ?? [])
    .map(
      (p) => `
      <div style="border:1px solid #e5e5e5;border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="font-weight:700;color:#0F1B2D;margin-bottom:8px">${p.code} — ${p.address}</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#333">
          <tr><td style="padding:3px 0;color:#6b7280">Avance físico</td><td style="text-align:right;font-weight:600">${p.progress_pct ?? 0}%</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280">Avance presupuestal</td><td style="text-align:right;font-weight:600">${p.budget_progress ?? 0}%</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280">Último reporte</td><td style="text-align:right">Semana ${p.last_week ?? "—"}</td></tr>
          <tr><td style="padding:3px 0;color:#6b7280">Estado</td><td style="text-align:right">${p.status ?? "—"}</td></tr>
        </table>
      </div>`
    )
    .join("");

  return {
    subject: "Resumen semanal — tus proyectos relatin.co",
    html: layout(
      `<p>Hola <strong>${client_name}</strong>,</p>
       <p>Aquí el resumen de tus proyectos esta semana:</p>
       ${rows}
       <p>— Equipo Relatin.co</p>`,
      `${PORTAL_BASE}/portal`,
      "VER PORTAL →"
    ),
  };
}

// ── Type router ───────────────────────────────────────────────

const builders: Record<string, (data: Record<string, unknown>) => { subject: string; html: string }> = {
  report_published: buildReportPublished,
  draw_status_changed: buildDrawStatusChanged,
  project_issue: buildProjectIssue,
  welcome: buildWelcome,
  weekly_summary: buildWeeklySummary,
};

// ── Main handler ──────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { type, to, data } = await req.json();

    if (!type || !to) {
      return new Response(JSON.stringify({ error: "Missing type or to" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const builder = builders[type];
    if (!builder) {
      return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = builder(data ?? {});

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendBody);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendBody.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-notification error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
