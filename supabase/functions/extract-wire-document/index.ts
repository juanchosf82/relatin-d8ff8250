import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a bank wire transfer document extractor.
Extract all wire transfer information from this bank document or screenshot.
Return ONLY valid JSON, no markdown, no code fences, no other text:
{
  "wire_number": string or null,
  "wire_date": "YYYY-MM-DD" or null,
  "amount": number or null,
  "beneficiary": string or null,
  "bank_reference": string or null,
  "concept": string or null,
  "status": "sent" | "confirmed" | "pending" or null,
  "confidence": "high" | "medium" | "low"
}
Extract exactly what appears in the document.
For dates use YYYY-MM-DD format.
For amounts extract only the number, no symbols or currency signs.
If the document is a scanned image, do your best to extract visible text. Return partial results rather than failing.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const makeError = (error: string, status = 500) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return makeError("LOVABLE_API_KEY is not configured", 500);
    }

    const body = await req.json();
    const { file_base64, file_type } = body;

    if (!file_base64 || !file_type) {
      return makeError("file_base64 and file_type are required", 400);
    }

    // Determine mime type for the AI request
    let mimeType: string;
    if (file_type === "pdf") {
      mimeType = "application/pdf";
    } else {
      // For images, try to detect from base64 header or default to jpeg
      if (file_base64.startsWith("/9j/")) mimeType = "image/jpeg";
      else if (file_base64.startsWith("iVBOR")) mimeType = "image/png";
      else if (file_base64.startsWith("UklGR")) mimeType = "image/webp";
      else mimeType = "image/jpeg";
    }

    // Strip data URL prefix if present
    const cleanBase64 = file_base64.replace(/^data:[^;]+;base64,/, "");

    console.log(`Processing wire ${file_type}, base64 length: ${cleanBase64.length}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                image_url: {
                  url: `data:${mimeType};base64,${cleanBase64}`,
                },
              },
              {
                type: "text",
                text: "Extract the wire transfer data from this document. Return ONLY raw JSON.",
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) return makeError("Rate limit exceeded, please try again later.", 429);
      if (response.status === 402) return makeError("AI credits exhausted.", 402);
      return makeError(`AI extraction failed [${response.status}]`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content ?? "";

    console.log(`AI response length: ${content.length}`);

    // Parse JSON from response
    let parsed: any;
    try {
      const cleaned = content.trim();
      const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : cleaned;
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("JSON parse error:", parseErr, "Content:", content.slice(-300));
      return makeError("Could not parse extraction result", 422);
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-wire-document error:", e);
    return makeError(e instanceof Error ? e.message : "Unknown error");
  }
});
