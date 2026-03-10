import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BANK_SOV_SYSTEM_PROMPT = `You are a construction loan document data extractor.
Extract the Schedule of Values (SOV) from this bank construction loan document.
The SOV typically has approximately 38 line items.
Return ONLY valid JSON, no other text:
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
Return ONLY valid JSON, no other text:
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

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { pdf_base64, extraction_type } = await req.json();

    if (!pdf_base64 || !extraction_type) {
      return new Response(
        JSON.stringify({ error: "Missing pdf_base64 or extraction_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt =
      extraction_type === "bank_sov"
        ? BANK_SOV_SYSTEM_PROMPT
        : DRAW_REQUEST_SYSTEM_PROMPT;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                text: "Extract the data from this document.",
              },
            ],
          },
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI extraction failed [${response.status}]` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (may be wrapped in ```json ... ```)
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/({[\s\S]*})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsed = JSON.parse(jsonStr.trim());
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Raw content:", content);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response as JSON", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-draw-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
