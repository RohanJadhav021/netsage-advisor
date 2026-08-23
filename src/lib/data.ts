import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  AiDiagnosis,
  CaseInput,
  CaseRow,
  DiagnosisRow,
  ResponsibleAiLogRow,
  ReviewDecision,
  ReviewRow,
  RuleCheckResult,
  RuleCheckRow,
} from "./netsage";

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export const casesQuery = queryOptions({
  queryKey: ["cases"],
  queryFn: async (): Promise<CaseRow[]> => {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .order("created_at", { ascending: false });
    fail("Could not load cases", error);
    return (data ?? []) as CaseRow[];
  },
});

export const diagnosesQuery = queryOptions({
  queryKey: ["diagnoses"],
  queryFn: async (): Promise<DiagnosisRow[]> => {
    const { data, error } = await supabase
      .from("diagnoses")
      .select("*")
      .order("created_at", { ascending: false });
    fail("Could not load diagnoses", error);
    return (data ?? []) as DiagnosisRow[];
  },
});

export const reviewsQuery = queryOptions({
  queryKey: ["reviews"],
  queryFn: async (): Promise<ReviewRow[]> => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    fail("Could not load reviews", error);
    return (data ?? []) as ReviewRow[];
  },
});

export const ruleChecksQuery = queryOptions({
  queryKey: ["rule_checks"],
  queryFn: async (): Promise<RuleCheckRow[]> => {
    const { data, error } = await supabase
      .from("rule_check_results")
      .select("*")
      .order("created_at", { ascending: false });
    fail("Could not load rule check results", error);
    return (data ?? []) as RuleCheckRow[];
  },
});

export const responsibleAiQuery = queryOptions({
  queryKey: ["responsible_ai_logs"],
  queryFn: async (): Promise<ResponsibleAiLogRow[]> => {
    const { data, error } = await supabase
      .from("responsible_ai_logs")
      .select("*")
      .order("created_at", { ascending: false });
    fail("Could not load the responsible AI log", error);
    return (data ?? []) as ResponsibleAiLogRow[];
  },
});

export function caseQuery(caseId: string) {
  return queryOptions({
    queryKey: ["case", caseId],
    queryFn: async () => {
      const { data, error } = await supabase.from("cases").select("*").eq("id", caseId).maybeSingle();
      fail("Could not load the case", error);
      if (!data) throw new Error("Case not found");
      return data as CaseRow;
    },
  });
}

export async function createCase(input: CaseInput): Promise<CaseRow> {
  const { data, error } = await supabase.from("cases").insert(input).select("*").single();
  if (error) {
    if (error.code === "23505" || error.message.includes("duplicate key")) {
      throw new Error(`Case ID "${input.case_id}" already exists. Use a different Case ID.`);
    }
    throw new Error(`Could not save the case: ${error.message}`);
  }
  return data as CaseRow;
}

export async function saveDiagnosis(
  caseUuid: string,
  diagnosis: AiDiagnosis,
  model: string,
): Promise<DiagnosisRow> {
  const { data, error } = await supabase
    .from("diagnoses")
    .insert({ case_id: caseUuid, ...diagnosis, model, raw_response: diagnosis })
    .select("*")
    .single();
  fail("Could not save the AI diagnosis", error);
  return data as DiagnosisRow;
}

export async function saveRuleChecks(
  caseUuid: string,
  results: RuleCheckResult[],
  engine: string,
): Promise<void> {
  const { error: deleteError } = await supabase.from("rule_check_results").delete().eq("case_id", caseUuid);
  fail("Could not clear previous rule check results", deleteError);
  const { error } = await supabase.from("rule_check_results").insert(
    results.map((r) => ({
      case_id: caseUuid,
      check_name: r.check,
      status: r.status,
      evidence: r.evidence,
      explanation: r.explanation,
      engine,
    })),
  );
  fail("Could not save rule check results", error);
}

export async function saveReview(args: {
  caseUuid: string;
  diagnosis: DiagnosisRow;
  decision: ReviewDecision;
  correction: AiDiagnosis | null;
  comment: string;
  reviewer: string;
}): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      case_id: args.caseUuid,
      diagnosis_id: args.diagnosis.id,
      decision: args.decision,
      correction: args.correction,
      comment: args.comment,
      reviewer: args.reviewer,
    })
    .select("*")
    .single();
  fail("Could not save the review", error);
  const review = data as ReviewRow;

  if (args.decision !== "ACCEPTED") {
    const original: AiDiagnosis = {
      root_cause: args.diagnosis.root_cause,
      confidence: args.diagnosis.confidence,
      osi_layer: args.diagnosis.osi_layer,
      evidence: args.diagnosis.evidence,
      next_command: args.diagnosis.next_command,
      fix_steps: args.diagnosis.fix_steps,
      severity: args.diagnosis.severity,
      concept: args.diagnosis.concept,
    };
    const { error: logError } = await supabase.from("responsible_ai_logs").insert({
      case_id: args.caseUuid,
      diagnosis_id: args.diagnosis.id,
      review_id: review.id,
      decision: args.decision,
      original_diagnosis: original,
      human_correction: args.correction,
      reason: args.comment,
      final_diagnosis: args.decision === "EDITED" ? args.correction : null,
    });
    fail("Could not write the responsible AI log entry", logError);
  }
  return review;
}
