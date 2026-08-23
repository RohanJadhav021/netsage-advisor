import { createServerFn } from "@tanstack/react-start";

import { NETSAGE_SYSTEM_PROMPT, buildUserPrompt } from "./ai-prompt";
import { aiDiagnosisSchema, caseInputSchema } from "./netsage";

const AI_MODEL = "google/gemini-3.5-flash";

const diagnoseInputSchema = caseInputSchema.pick({
  case_id: true,
  symptom: true,
  topology: true,
  device_info: true,
  show_output: true,
  additional_notes: true,
});

/** Reports whether the AI service and the Python rule checker are configured. */
export const getServiceStatus = createServerFn({ method: "GET" }).handler(async () => {
  return {
    aiConfigured: Boolean(process.env["LOVABLE_API_KEY"]),
    aiModel: AI_MODEL,
    pythonCheckerConfigured: Boolean(process.env["PYTHON_RULE_CHECKER_URL"]),
  };
});

function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) throw new Error("The AI response did not contain a JSON object.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/** Sends a case to the AI gateway and returns a validated structured diagnosis. */
export const diagnoseCase = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => diagnoseInputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      throw new Error("AI service not configured. Add an AI API key in Settings / API Configuration.");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: NETSAGE_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(data) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      let message = body;
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
        message = parsed.error?.message ?? parsed.message ?? body;
      } catch {
        /* keep raw body */
      }
      if (res.status === 429) throw new Error(`AI rate limit reached. Wait a moment and retry. (${message})`);
      if (res.status === 402) throw new Error(`AI credits exhausted: ${message}`);
      if (res.status === 401 || res.status === 403)
        throw new Error(`AI service rejected the request (${res.status}): ${message}`);
      throw new Error(`AI service error ${res.status}: ${message}`);
    }

    const payload = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("The AI service returned an empty response. Please retry.");

    let raw: unknown;
    try {
      raw = extractJson(content);
    } catch (error) {
      throw new Error(
        `The AI returned invalid JSON, so no diagnosis was produced. ${error instanceof Error ? error.message : ""} Raw response: ${content.slice(0, 400)}`,
      );
    }

    const parsed = aiDiagnosisSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; ");
      throw new Error(`The AI response was missing or invalid fields (${issues}). Nothing was saved — please retry.`);
    }

    return { diagnosis: { ...parsed.data, confidence: Math.round(parsed.data.confidence) }, model: AI_MODEL };
  });

/** Runs the deterministic rule checker (Python service when configured). */
export const runChecks = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    caseInputSchema
      .pick({ show_output: true, device_info: true, topology: true })
      .partial({ device_info: true, topology: true })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { runRuleChecks } = await import("./rule-checker.server");
    return runRuleChecks({
      show_output: data.show_output,
      device_info: data.device_info ?? "",
      topology: data.topology ?? "",
    });
  });
