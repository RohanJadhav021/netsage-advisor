import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DiagnosisResult } from "@/components/DiagnosisResult";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  caseQuery,
  diagnosesQuery,
  responsibleAiQuery,
  reviewsQuery,
  ruleChecksQuery,
  saveDiagnosis,
  saveRuleChecks,
} from "@/lib/data";
import { diagnoseCase, runChecks } from "@/lib/netsage.functions";
import { decisionTone, severityTone } from "@/lib/netsage";
import type { AiDiagnosis, DiagnosisRow, ReviewDecision } from "@/lib/netsage";

export const Route = createFileRoute("/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Case Detail — NetSage AI" },
      {
        name: "description",
        content:
          "Full case record: submitted evidence, AI diagnosis, deterministic rule checks and human review history.",
      },
      { property: "og:title", content: "Case Detail — NetSage AI" },
      { property: "og:description", content: "Case evidence, AI diagnosis and human review history." },
    ],
  }),
  component: CaseDetail,
});

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre
        className={
          mono
            ? "mt-1 whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px]"
            : "mt-1 whitespace-pre-wrap break-words text-sm"
        }
      >
        {value}
      </pre>
    </div>
  );
}

function CaseDetail() {
  const { caseId } = Route.useParams();
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState<ReviewDecision | null>(null);
  const [reviewTarget, setReviewTarget] = useState<DiagnosisRow | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  const diagnose = useServerFn(diagnoseCase);
  const check = useServerFn(runChecks);

  const [caseRes, diagnosesRes, checksRes, reviewsRes, logsRes] = useQueries({
    queries: [caseQuery(caseId), diagnosesQuery, ruleChecksQuery, reviewsQuery, responsibleAiQuery],
  });

  if (caseRes.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading case…</p>;
  }

  if (caseRes.error || !caseRes.data) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Could not load this case</CardTitle>
          <CardDescription>{caseRes.error?.message ?? "Case not found."}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => caseRes.refetch()}>Retry</Button>
          <Button asChild variant="outline">
            <Link to="/cases">Back to cases</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const c = caseRes.data;
  const diagnoses = (diagnosesRes.data ?? []).filter((d) => d.case_id === c.id);
  const checks = (checksRes.data ?? []).filter((r) => r.case_id === c.id);
  const reviews = (reviewsRes.data ?? []).filter((r) => r.case_id === c.id);
  const logs = (logsRes.data ?? []).filter((l) => l.case_id === c.id);
  const latest = diagnoses[0] ?? null;

  async function analyse() {
    setRunning(true);
    setRunError(null);
    try {
      const result = await diagnose({
        data: {
          case_id: c.case_id,
          symptom: c.symptom,
          topology: c.topology,
          device_info: c.device_info,
          show_output: c.show_output,
          additional_notes: c.additional_notes,
        },
      });
      await saveDiagnosis(c.id, result.diagnosis, result.model);
      try {
        const run = await check({
          data: { show_output: c.show_output, device_info: c.device_info, topology: c.topology },
        });
        await saveRuleChecks(c.id, run.results, run.engine);
      } catch (e) {
        toast.warning(
          `Diagnosis saved, but the rule checker failed: ${e instanceof Error ? e.message : "unknown error"}`,
        );
      }
      await queryClient.invalidateQueries();
      toast.success("AI diagnosis stored. Human review is required.");
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "The diagnosis request failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm">
                <span className="font-mono">{c.case_id}</span>
                {c.is_demo && (
                  <Badge variant="outline" className="ml-2">
                    demo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {c.issue_type} • {c.osi_layer || "layer not set"} •{" "}
                {new Date(c.created_at).toLocaleString()}
              </CardDescription>
            </div>
            <Badge variant="outline" className={severityTone(c.severity)}>
              {c.severity}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Symptom" value={c.symptom} />
          <Field label="Topology" value={c.topology} />
          <Field label="Device information" value={c.device_info} />
          <Field label="Show-command output" value={c.show_output} mono />
          <Field label="Additional notes" value={c.additional_notes} />
          <Field label="Expected fault (lab reference)" value={c.expected_fault} />
        </CardContent>
      </Card>

      {runError && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">Diagnosis failed</CardTitle>
            <CardDescription>{runError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {latest ? (
        <DiagnosisResult
          diagnosis={{
            root_cause: latest.root_cause,
            confidence: latest.confidence,
            osi_layer: latest.osi_layer,
            evidence: latest.evidence,
            next_command: latest.next_command,
            fix_steps: latest.fix_steps,
            severity: latest.severity,
            concept: latest.concept,
          }}
          title={`AI diagnosis (${latest.model})`}
          checks={checks.length ? checks.map((r) => ({
            check: r.check_name,
            status: r.status,
            evidence: r.evidence,
            explanation: r.explanation,
          })) : null}
          checksEngine={checks[0]?.engine}
          onDecision={
            reviews.length === 0
              ? (d) => {
                  setReviewTarget(latest);
                  setDecision(d);
                }
              : undefined
          }
          footer={
            <Button variant="outline" size="sm" onClick={analyse} disabled={running}>
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Re-run AI diagnosis
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">No AI diagnosis yet</CardTitle>
            <CardDescription>
              Run the AI analysis on this stored evidence. Nothing is fabricated — the diagnosis comes from
              the configured AI model.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={analyse} disabled={running}>
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {running ? "Analysing evidence…" : "Run AI diagnosis"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Human review history</CardTitle>
          <CardDescription>Reviews are append-only; the AI output is never overwritten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviews.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No review recorded yet{latest ? " — this diagnosis is pending review." : "."}
            </p>
          )}
          {reviews.map((r) => (
            <div key={r.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline" className={decisionTone(r.decision)}>
                  {r.decision}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {r.reviewer} • {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm">{r.comment}</p>}
              {r.correction && (
                <>
                  <Separator className="my-2" />
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Corrected root cause
                  </div>
                  <p className="mt-1 text-sm">{(r.correction as AiDiagnosis).root_cause}</p>
                </>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Responsible AI log entries</CardTitle>
            <CardDescription>Recorded whenever a human corrected or rejected the AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {logs.map((l) => (
              <div key={l.id} className="rounded-md border border-border p-3 text-sm">
                <Badge variant="outline" className={decisionTone(l.decision)}>
                  {l.decision}
                </Badge>
                <p className="mt-2 text-muted-foreground">{l.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ReviewDialog
        diagnosis={reviewTarget}
        decision={decision}
        onClose={() => setDecision(null)}
        onSaved={() => queryClient.invalidateQueries()}
      />
    </div>
  );
}
