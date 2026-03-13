import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateTempPassword() {
  return (
    Math.random().toString(36).slice(-10) +
    Math.random().toString(36).toUpperCase().slice(-4) +
    "!2"
  );
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, step: string, error: unknown) {
  const err = error as {
    message?: string;
    code?: string;
    status?: number;
    name?: string;
  };

  return jsonResponse(
    {
      success: false,
      step,
      error: err?.message || String(error),
      code: err?.code || null,
      error_status: err?.status || null,
      error_name: err?.name || null,
    },
    status
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse(401, "validate_auth_header", new Error("Unauthorized"));
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return errorResponse(
        500,
        "validate_env",
        new Error(
          "Missing required backend secrets (SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY)"
        )
      );
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      return errorResponse(401, "validate_token", claimsError || new Error("Invalid token"));
    }

    const callerId = claimsData.claims.sub;

    // Service role client for admin operations
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const { data: roleData, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      return errorResponse(500, "verify_admin_role", roleError);
    }

    if (!roleData) {
      return errorResponse(403, "verify_admin_role", new Error("Not admin"));
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return errorResponse(400, "parse_body", new Error("Invalid JSON body"));
    }

    const email = String(body.email || "").trim();
    const full_name = String(body.full_name || "").trim();
    const company_name = String(body.company_name || "").trim();
    const license_number = body.license_number ? String(body.license_number) : null;
    const phone = body.phone ? String(body.phone) : null;
    const address = body.address ? String(body.address) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!email || !company_name) {
      return errorResponse(
        400,
        "validate_payload",
        new Error("Email and company_name required")
      );
    }

    // Create auth user with service role
    const tempPassword = generateTempPassword();

    const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || company_name,
        company: company_name,
        role: "gc",
      },
    });

    if (createError || !newUser?.user?.id) {
      console.error("[create-gc-user] createUser failed", {
        email,
        message: createError?.message,
        code: createError?.code,
        status: createError?.status,
      });
      return errorResponse(400, "create_auth_user", createError || new Error("Unable to create user"));
    }

    const userId = newUser.user.id;

    // The handle_new_user trigger assigns 'user' role, so update it to 'gc'
    const { error: roleUpdateError } = await serviceClient
      .from("user_roles")
      .update({ role: "gc" })
      .eq("user_id", userId);

    if (roleUpdateError) {
      console.error("[create-gc-user] role update failed", {
        userId,
        message: roleUpdateError.message,
      });
      return errorResponse(500, "assign_gc_role", roleUpdateError);
    }

    // Create GC profile
    const { error: profileError } = await serviceClient.from("gc_profiles").insert({
      user_id: userId,
      company_name,
      license_number,
      contact_name: full_name || null,
      email,
      phone,
      address,
      notes,
      status: "active",
    });

    if (profileError) {
      console.error("[create-gc-user] profile insert failed", {
        userId,
        email,
        message: profileError.message,
      });
      return errorResponse(500, "create_gc_profile", profileError);
    }

    // Send password reset email so GC can set their own password
    const { error: resetError } = await serviceClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://www.relatin.co/gc/login",
      },
    });

    if (resetError) {
      console.error("[create-gc-user] password recovery link failed", {
        email,
        message: resetError.message,
      });
    }

    return jsonResponse({
      success: true,
      userId,
      warning: resetError?.message || null,
    });
  } catch (err) {
    console.error("[create-gc-user] unexpected error", err);
    return errorResponse(500, "unhandled", err);
  }
});
