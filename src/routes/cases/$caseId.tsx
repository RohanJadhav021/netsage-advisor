import { useQueries } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DiagnosisResult } from "@/components/DiagnosisResult";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  caseQuery,
  diagnosisForCaseQuery,
  reviewsForCaseQuery,
  ruleChecksForCaseQuery,
} from "@/lib/data";
import { decisionTone, severityTone, type AiDiagnosis, type RuleCheckResult } from "@/lib/netsage";

export const Route = createFileRoute("/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Diagnosis Details — NetSage AI" },
      { name: "description", content: "Case detail, AI diagnosis, rule checks and human review." },
    ],
  }),
  component: CaseDetail,
});

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <p
        className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${mono ? "font-mono text-xs" : ""} ${value ? "" : "text-muted-foreground"}`}
      >
        {value || "Not available"}
      </p>
    </div>
  );
}

function CaseDetail() {
  const { caseId } = Route.useParams();
  const [caseRes, diagnosisRes, checksRes, reviewsRes] = useQueries({
    queries: [
      caseQuery(caseId),
      diagnosisForCaseQuery(caseId),
      ruleChecksForCaseQuery(caseId),
      reviewsForCaseQuery(caseId),
    ],
  });

  if (caseRes.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading case…</p>;
  }

  if (caseRes.error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Could not load this case</CardTitle>
          <CardDescription>{caseRes.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => caseRes.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const c = caseRes.data;
  if (!c) return null;

  const diagnosisRow = diagnosisRes.data ?? null;
  const checks: RuleCheckResult[] = (checksRes.data ?? []).map((r) => ({
    check: r.check_name,
    status: r.status,
    evidence: r.evidence,
    explanation: r.explanation,
  }));
  const reviews = reviewsRes.data ?? [];
  const latestReview = reviews[0] ?? null;

  const aiDiagnosis: AiDiagnosis | null = diagnosisRow
    ? {
        root_cause: diagnosisRow.root_cause,
        confidence: diagnosisRow.confidence,
        osi_layer: diagnosisRow.osi_layer,
        evidence: diagnosisRow.evidence,
        next_command: diagnosisRow.next_command,
        fix_steps: diagnosisRow.fix_steps,
        severity: diagnosisRow.severity,
        concept: diagnosisRow.concept,
      }
    : null;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-mono">
              {c.case_id}
              {c.is_demo && <Badge variant="secondary">DEMO CASE</Badge>}
            </CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={severityTone(c.severity)}>
                {c.severity}
              </Badge>
              {c.issue_type && <Badge variant="outline">{c.issue_type}</Badge>}
              {c.osi_layer && <Badge variant="outline">{c.osi_layer}</Badge>}
            </div>
          </div>
          <CardDescription>
            Submitted {new Date(c.created_at).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Symptom" value={c.symptom} />
          <Field label="Expected fault" value={c.expected_fault} />
          <Field label="Topology notes" value={c.topology} />
          <Field label="Device information" value={c.device_info} />
          <div className="sm:col-span-2">
            <Field label="Show-command output" value={c.show_output} mono />
          </div>
          <div className="sm:col-span-2">
            <Field label="Additional notes" value={c.additional_notes} />
          </div>
        </CardContent>
      </Card>

      {aiDiagnosis ? (
        <DiagnosisResult diagnosis={aiDiagnosis} checks={checksRes.data ? checks : null} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI diagnosis</CardTitle>
            <CardDescription>Not yet diagnosed.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This case has no AI diagnosis on record. Diagnoses are produced by submitting a case
              through New Diagnosis.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Human review</CardTitle>
          <CardDescription>
            {reviews.length === 0
              ? "No review recorded yet."
              : `${reviews.length} review record(s), most recent first`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {aiDiagnosis ? "This diagnosis is pending human review." : "Not yet diagnosed."}
            </p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className={decisionTone(r.decision)}>
                  {r.decision}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {r.reviewer} · {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm leading-relaxed">{r.comment}</p>}
              {r.decision === "EDITED" && r.correction && (
                <div className="mt-3 space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-warning">
                    Human correction — the original AI diagnosis above is unchanged
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Corrected root cause: </span>
                    {r.correction.root_cause}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Severity: </span>
                    {r.correction.severity}
                    <span className="text-muted-foreground"> · OSI layer: </span>
                    {r.correction.osi_layer}
                  </p>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Corrected fix steps:</span>
                    <ol className="mt-1 list-decimal space-y-0.5 pl-5">
                      {r.correction.fix_steps.map((s, i) => (
                        <li key={`${i}-${s.slice(0, 20)}`}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          ))}
          {latestReview && (
            <p className="text-xs text-muted-foreground">
              The original AI diagnosis is preserved immutably; human decisions are stored
              separately and never overwrite it.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
