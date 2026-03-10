import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANK_SOV_SYSTEM_PROMPT = `You are a construction loan document data extractor.
Extract the Schedule of Values (SOV) from this bank construction loan document.
The SOV typically has approximately 38 line items.
If the document appears to be a scanned image, do your best to extract visible text and numbers. Return partial results rather than failing.
Return ONLY valid JSON, no markdown, no code fences, no other text:
{
  "sov_lines": [
    {
      "line_number": number,
      "description": "string",
      "scheduled_value": number
    }
  ],
  "total_contract_value": number or null
}`;

const DRAW_REQUEST_SYSTEM_PROMPT = `You are a construction draw request data extractor for Florida residential construction loans.
The bank SOV typically has approximately 38 line items.
Extract ALL data exactly as it appears in the PDF.
If the document appears to be a scanned image, do your best to extract visible text and numbers. Return partial results rather than failing.
IMPORTANT: Return ONLY valid JSON. Do NOT wrap in markdown code fences. Do NOT add any text before or after the JSON.
{
  "draw_number": number or null,
  "draw_date": "YYYY-MM-DD" or null,
  "period_from": "YYYY-MM-DD" or null,
  "period_to": "YYYY-MM-DD" or null,
  "total_amount_this_draw": number or null,
  "total_amount_cumulative": number or null,
  "bank_name": "string" or null,
  "inspector_name": "string" or null,
  "sov_lines": [
    {
      "line_number": number or null,
      "description": "string",
      "scheduled_value": number or null,
      "work_completed_previous": number or null,
      "work_completed_this_period": number or null,
      "work_completed_total": number or null,
      "pct_complete": number or null,
      "balance_to_finish": number or null
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const makeError = (error: string, details: string, step: string, status = 500) =>
    new Response(JSON.stringify({ error, details, step }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY secret is missing");
      return makeError("API key not configured", "LOVABLE_API_KEY secret is missing", "api_key_check");
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      console.error("Failed to parse request body:", e);
      return makeError("Invalid request body", String(e), "parse_request", 400);
    }

    const { pdf_base64: rawBase64, extraction_type } = body;

    if (!rawBase64 || !extraction_type) {
      return makeError("Missing required fields", "pdf_base64 and extraction_type are required", "validate_input", 400);
    }

    // Strip data URL prefix if present
    const pdf_base64 = rawBase64.replace(/^data:application\/pdf;base64,/, "");

    const systemPrompt =
      extraction_type === "bank_sov"
        ? BANK_SOV_SYSTEM_PROMPT
        : DRAW_REQUEST_SYSTEM_PROMPT;

    console.log(`Processing ${extraction_type}, base64 length: ${pdf_base64.length}`);

    let response: Response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${pdf_base64}`,
                  },
                },
                {
                  type: "text",
                  text: "Extract the data from this document. Return ONLY raw JSON, no markdown code fences.",
                },
              ],
            },
          ],
          max_tokens: 16000,
        }),
      });
    } catch (fetchErr) {
      console.error("AI gateway fetch error:", fetchErr);
      return makeError("AI gateway unreachable", String(fetchErr), "ai_fetch");
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return makeError("Rate limit exceeded", errText, "ai_response", 429);
      }
      if (response.status === 402) {
        return makeError("AI credits exhausted", errText, "ai_response", 402);
      }
      return makeError(`AI extraction failed [${response.status}]`, errText, "ai_response");
    }

    let aiResult: any;
    try {
      aiResult = await response.json();
    } catch (e) {
      console.error("Failed to parse AI gateway response as JSON:", e);
      return makeError("AI response not valid JSON", String(e), "parse_ai_response");
    }

    const content = aiResult.choices?.[0]?.message?.content ?? "";
    const finishReason = aiResult.choices?.[0]?.finish_reason ?? "unknown";

    console.log(`AI finish_reason: ${finishReason}, content length: ${content.length}`);

    if (finishReason === "length") {
      console.error("AI response was TRUNCATED (finish_reason=length). Content preview:", content.slice(-200));
      return makeError(
        "AI response truncated",
        "The document produced too much data and the response was cut off. Try a simpler document or contact support.",
        "ai_truncated"
      );
    }

    // Parse JSON from response (may be wrapped in ```json ... ```)
    let parsed: any;
    try {
      // Try direct parse first
      const cleaned = content.trim();
      // Remove markdown fences if present
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : cleaned;
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw content (last 500 chars):", content.slice(-500));
      return makeError(
        "Failed to parse AI response as JSON",
        `${parseErr}`,
        "json_parse",
        422
      );
    }

    console.log(`Successfully extracted ${extraction_type}: ${parsed.sov_lines?.length ?? 0} lines`);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-draw-pdf unexpected error:", e);
    return makeError(
      e instanceof Error ? e.message : "Unknown error",
      e instanceof Error ? (e.stack ?? "") : String(e),
      "unexpected"
    );
  }
});
