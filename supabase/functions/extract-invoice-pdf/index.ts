import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a construction invoice data extractor.
Extract all information from this GC invoice PDF.
Return ONLY valid JSON, no markdown, no code fences, no other text:
{
  "invoice_number": string or null,
  "invoice_date": "YYYY-MM-DD" or null,
  "period_from": "YYYY-MM-DD" or null,
  "period_to": "YYYY-MM-DD" or null,
  "total_amount": number or null,
  "subtotal": number or null,
  "tax_amount": number or null,
  "lines": [
    {
      "line_number": number or null,
      "product_service": string,
      "description": string or null,
      "quantity": number or null,
      "unit_price": number or null,
      "amount": number
    }
  ]
}
Extract every line item exactly as it appears.`;

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
      return makeError("API key not configured", "LOVABLE_API_KEY secret is missing", "api_key_check");
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return makeError("Invalid request body", String(e), "parse_request", 400);
    }

    const { pdf_base64: rawBase64 } = body;
    if (!rawBase64) {
      return makeError("Missing pdf_base64", "pdf_base64 is required", "validate_input", 400);
    }

    const pdf_base64 = rawBase64.replace(/^data:application\/pdf;base64,/, "");

    console.log(`Processing invoice extraction, base64 length: ${pdf_base64.length}`);

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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:application/pdf;base64,${pdf_base64}` },
                },
                {
                  type: "text",
                  text: "Extract all data from this invoice. Return ONLY raw JSON, no markdown code fences.",
                },
              ],
            },
          ],
          max_tokens: 8000,
        }),
      });
    } catch (fetchErr) {
      console.error("AI gateway fetch error:", fetchErr);
      return makeError("AI gateway unreachable", String(fetchErr), "ai_fetch");
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) return makeError("Rate limit exceeded", errText, "ai_response", 429);
      if (response.status === 402) return makeError("AI credits exhausted", errText, "ai_response", 402);
      return makeError(`AI extraction failed [${response.status}]`, errText, "ai_response");
    }

    let aiResult: any;
    try {
      aiResult = await response.json();
    } catch (e) {
      return makeError("AI response not valid JSON", String(e), "parse_ai_response");
    }

    const content = aiResult.choices?.[0]?.message?.content ?? "";
    const finishReason = aiResult.choices?.[0]?.finish_reason ?? "unknown";

    if (finishReason === "length") {
      return makeError("AI response truncated", "Document too complex", "ai_truncated");
    }

    let parsed: any;
    try {
      const cleaned = content.trim();
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : cleaned;
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw:", content.slice(-500));
      return makeError("Failed to parse AI response", `${parseErr}`, "json_parse", 422);
    }

    console.log(`Successfully extracted invoice: ${parsed.lines?.length ?? 0} lines`);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-invoice-pdf unexpected error:", e);
    return makeError(
      e instanceof Error ? e.message : "Unknown error",
      e instanceof Error ? (e.stack ?? "") : String(e),
      "unexpected"
    );
  }
});
