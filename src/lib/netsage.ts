import { z } from "zod";

/**
 * Shared domain types + validation for NetSage AI.
 * This file is client-safe (no secrets, no server-only imports).
 */

export const ISSUE_TYPES = [
  "VLAN",
  "Gateway",
  "DHCP",
  "DNS",
  "Routing",
  "ACL",
  "NAT",
  "Wireless",
] as const;

export const SEVERITIES = ["Low", "Medium", "High", "Critical"] as const;

export const OSI_LAYERS = [
  "Layer 1",
  "Layer 1/2",
  "Layer 2",
  "Layer 3",
  "Layer 3/4",
  "Layer 4",
  "Layer 7",
] as const;

export const REVIEW_DECISIONS = ["ACCEPTED", "EDITED", "REJECTED"] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];
export type Severity = (typeof SEVERITIES)[number];
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

/** The exact JSON contract the AI must return. */
export const aiDiagnosisSchema = z.object({
  root_cause: z.string().min(3),
  confidence: z.number().min(0).max(100),
  osi_layer: z.string().min(1),
  evidence: z.array(z.string()),
  next_command: z.string().min(1),
  fix_steps: z.array(z.string()).min(1),
  severity: z.string().min(1),
  concept: z.string().min(1),
});

export type AiDiagnosis = z.infer<typeof aiDiagnosisSchema>;

/** Result of a single deterministic rule check. */
export const ruleCheckResultSchema = z.object({
  check: z.string(),
  status: z.enum(["PASS", "FAIL", "WARNING"]),
  evidence: z.string(),
  explanation: z.string(),
});

export type RuleCheckResult = z.infer<typeof ruleCheckResultSchema>;

export const caseInputSchema = z.object({
  case_id: z.string().trim().min(1, "Case ID is required"),
  symptom: z.string().trim().min(10, "Describe the symptom (at least 10 characters)"),
  topology: z.string().trim().default(""),
  device_info: z.string().trim().default(""),
  show_output: z.string().trim().min(1, "Show-command output is required for evidence-based analysis"),
  additional_notes: z.string().trim().default(""),
  expected_fault: z.string().trim().default(""),
  issue_type: z.string().trim().default("Unknown"),
  osi_layer: z.string().trim().default(""),
  concept: z.string().trim().default(""),
  severity: z.string().trim().default("Medium"),
});

export type CaseInput = z.infer<typeof caseInputSchema>;

// ---------- Database row shapes ----------

export type CaseRow = {
  id: string;
  case_id: string;
  symptom: string;
  topology: string;
  device_info: string;
  show_output: string;
  additional_notes: string;
  expected_fault: string;
  issue_type: string;
  osi_layer: string;
  concept: string;
  severity: string;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
};

export type DiagnosisRow = {
  id: string;
  case_id: string;
  root_cause: string;
  confidence: number;
  osi_layer: string;
  evidence: string[];
  next_command: string;
  fix_steps: string[];
  severity: string;
  concept: string;
  model: string;
  created_by: string | null;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  case_id: string;
  diagnosis_id: string;
  decision: ReviewDecision;
  correction: AiDiagnosis | null;
  comment: string;
  reviewer: string;
  created_by: string | null;
  created_at: string;
};

export type RuleCheckRow = {
  id: string;
  case_id: string;
  check_name: string;
  status: RuleCheckResult["status"];
  evidence: string;
  explanation: string;
  engine: string;
  created_at: string;
};

export type ResponsibleAiLogRow = {
  id: string;
  case_id: string;
  diagnosis_id: string;
  review_id: string;
  decision: string;
  original_diagnosis: AiDiagnosis;
  human_correction: AiDiagnosis | null;
  reason: string;
  final_diagnosis: AiDiagnosis | null;
  created_at: string;
};

export const CORRECTED_CASES_TARGET = 5;

export function severityTone(severity: string): string {
  const s = severity.toLowerCase();
  if (s.includes("critical")) return "bg-destructive/15 text-destructive border-destructive/40";
  if (s.includes("high")) return "bg-warning/15 text-warning border-warning/40";
  if (s.includes("medium")) return "bg-accent/15 text-accent border-accent/40";
  return "bg-muted text-muted-foreground border-border";
}

export function decisionTone(decision: string): string {
  switch (decision) {
    case "ACCEPTED":
      return "bg-success/15 text-success border-success/40";
    case "EDITED":
      return "bg-warning/15 text-warning border-warning/40";
    case "REJECTED":
      return "bg-destructive/15 text-destructive border-destructive/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusTone(status: string): string {
  switch (status) {
    case "PASS":
      return "bg-success/15 text-success border-success/40";
    case "WARNING":
      return "bg-warning/15 text-warning border-warning/40";
    case "FAIL":
      return "bg-destructive/15 text-destructive border-destructive/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
