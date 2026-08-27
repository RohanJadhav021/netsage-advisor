import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { NETSAGE_SYSTEM_PROMPT, buildUserPrompt } from "./ai-prompt";
import { aiDiagnosisSchema, caseInputSchema } from "./netsage";

const AI_MODEL = "gemini-3.6-flash";

// Simple in-memory per-user rate limiter (diagnoses are expensive, so guard
// against API-cost abuse now that AI calls require authentication). This is
// per-process; a distributed deployment would move this to a store like Redis.
const RATE_LIMIT_MAX = 10; // diagnoses per user per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

const rateLimitBucket = new Map<string, number[]>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const history = (rateLimitBucket.get(userId) ?? []).filter((t) => t > windowStart);

  if (history.length >= RATE_LIMIT_MAX) {
    const oldest = history[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSec };
  }

  history.push(now);
  rateLimitBucket.set(userId, history);
  return { allowed: true, retryAfterSec: 0 };
}

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
    aiConfigured: Boolean(process.env["GEMINI_API_KEY"]),
    aiModel: AI_MODEL,
    // NOTE: aiConfigured only reflects presence of the key env var, not that a
    // real Gemini call would succeed. A live check is not performed here to keep
    // this endpoint cheap; the Settings UI should communicate this limitation.
    aiConfiguredIsLive: false,
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

    if (start === -1 || end <= start) {
      throw new Error("The AI response did not contain a JSON object.");
    }

    console.warn(
      "[extractJson] responseMimeType: application/json was expected to yield strict JSON, but the brace-matching fallback was triggered. Inspect the raw AI response if this is frequent.",
    );

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

/** Sends a case directly to Google Gemini and returns a validated structured diagnosis. */
export const diagnoseCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => diagnoseInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.userId as string;

    const limit = checkRateLimit(userId);
    if (!limit.allowed) {
      throw new Error(
        `Rate limit reached: too many diagnoses. Please wait ${limit.retryAfterSec}s and try again.`,
      );
    }

    const apiKey = process.env["GEMINI_API_KEY"];

    if (!apiKey) {
      throw new Error(
        "Gemini AI service is not configured. Add GEMINI_API_KEY to the server environment and restart the dev server.",
      );
    }

    const userPrompt = buildUserPrompt(data);

    const responseSchema = {
      type: "OBJECT",
      properties: {
        root_cause: {
          type: "STRING",
        },
        confidence: {
          type: "NUMBER",
        },
        osi_layer: {
          type: "STRING",
        },
        evidence: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
        },
        next_command: {
          type: "STRING",
        },
        fix_steps: {
          type: "ARRAY",
          items: {
            type: "STRING",
          },
        },
        severity: {
          type: "STRING",
        },
        concept: {
          type: "STRING",
        },
      },
      required: [
        "root_cause",
        "confidence",
        "osi_layer",
        "evidence",
        "next_command",
        "fix_steps",
        "severity",
        "concept",
      ],
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: NETSAGE_SYSTEM_PROMPT,
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: userPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema,
          },
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();

      let detail = body;

      try {
        const parsed = JSON.parse(body) as {
          error?: {
            message?: string;
            status?: string;
          };
        };

        detail =
          parsed.error?.message ??
          parsed.error?.status ??
          body;
      } catch {
        // Keep raw response when it isn't JSON.
      }

      // Log the full upstream detail server-side; only send a generic,
      // non-leaking message back to the client.
      console.error(`[diagnoseCase] Gemini error ${res.status}: ${detail}`);

      if (res.status === 400) {
        throw new Error("The request was rejected by the AI service. Please adjust the input and try again.");
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "AI authentication failed. Check that GEMINI_API_KEY is configured correctly.",
        );
      }

      if (res.status === 429) {
        throw new Error(
          "The AI service is rate limited right now. Wait a moment and retry.",
        );
      }

      if (res.status >= 500) {
        throw new Error(
          "The AI service is temporarily unavailable. Please retry shortly.",
        );
      }

      throw new Error("The AI service returned an unexpected error. Please retry.");
    }

    const payload = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
          }>;
        };
        finishReason?: string;
      }>;
      promptFeedback?: {
        blockReason?: string;
      };
    };

    const candidate = payload.candidates?.[0];

    const content = candidate?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!content) {
      const blockReason = payload.promptFeedback?.blockReason;

      if (blockReason) {
        throw new Error(
          `Gemini blocked the request. Reason: ${blockReason}`,
        );
      }

      throw new Error(
        `Gemini returned an empty response${
          candidate?.finishReason
            ? ` (${candidate.finishReason})`
            : ""
        }. Please retry.`,
      );
    }

    let raw: unknown;

    try {
      raw = extractJson(content);
    } catch (error) {
      throw new Error(
        `Gemini returned invalid JSON, so no diagnosis was produced. ${
          error instanceof Error ? error.message : ""
        }`,
      );
    }

    const parsed = aiDiagnosisSchema.safeParse(raw);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map(
          (issue) =>
            `${issue.path.join(".") || "root"}: ${issue.message}`,
        )
        .join("; ");

      throw new Error(
        `Gemini returned an invalid diagnosis structure (${issues}). Nothing was saved.`,
      );
    }

    return {
      diagnosis: {
        ...parsed.data,
        confidence: Math.round(parsed.data.confidence),
      },
      model: AI_MODEL,
    };
  });

/** Runs the deterministic rule checker (Python service when configured). */
export const runChecks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    caseInputSchema
      .pick({
        show_output: true,
        device_info: true,
        topology: true,
      })
      .partial({
        device_info: true,
        topology: true,
      })
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