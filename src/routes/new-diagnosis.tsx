import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DiagnosisResult } from "@/components/DiagnosisResult";
import { ReviewDialog } from "@/components/ReviewDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCase, saveDiagnosis, saveRuleChecks } from "@/lib/data";
import { diagnoseCase, runChecks } from "@/lib/netsage.functions";
import {
  caseInputSchema,
  type AiDiagnosis,
  type DiagnosisRow,
  type ReviewDecision,
  type RuleCheckResult,
} from "@/lib/netsage";

export const Route = createFileRoute("/new-diagnosis")({
  head: () => ({
    meta: [
      { title: "New Diagnosis — NetSage AI" },
      {
        name: "description",
        content:
          "Submit a network troubleshooting case with symptom, topology and show-command output for AI-assisted diagnosis.",
      },
      { property: "og:title", content: "New Diagnosis — NetSage AI" },
      { property: "og:description", content: "Evidence-based AI diagnosis of Cisco lab network faults." },
    ],
  }),
  component: NewDiagnosis,
});

const EMPTY = {
  case_id: "",
  symptom: "",
  topology: "",
  device_info: "",
  show_output: "",
  additional_notes: "",
};

function NewDiagnosis() {
  const [form, setForm] = useState(EMPTY);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diagnosis, setDiagnosis] = useState<AiDiagnosis | null>(null);
  const [savedRow, setSavedRow] = useState<DiagnosisRow | null>(null);
  const [checks, setChecks] = useState<RuleCheckResult[] | null>(null);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);

  const queryClient = useQueryClient();
  const diagnose = useServerFn(diagnoseCase);
  const check = useServerFn(runChecks);

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    const parsed = caseInputSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" • "));
      return;
    }
    setRunning(true);
    setDiagnosis(null);
    setSavedRow(null);
    setChecks(null);
    try {
      const result = await diagnose({ data: parsed.data });
      setDiagnosis(result.diagnosis);

      const caseRow = await createCase({
        ...parsed.data,
        issue_type: result.diagnosis.concept,
        osi_layer: result.diagnosis.osi_layer,
        concept: result.diagnosis.concept,
        severity: result.diagnosis.severity,
      });
      const row = await saveDiagnosis(caseRow.id, result.diagnosis, result.model);
      setSavedRow(row);

      try {
        const checkResults = await check({
          data: {
            show_output: parsed.data.show_output,
            device_info: parsed.data.device_info,
            topology: parsed.data.topology,
          },
        });
        setChecks(checkResults);
        await saveRuleChecks(caseRow.id, checkResults, "builtin");
      } catch (e) {
        toast.warning(
          `Diagnosis saved, but the rule checker failed: ${e instanceof Error ? e.message : "unknown error"}`,
        );
      }

      await queryClient.invalidateQueries();
      toast.success("Diagnosis complete and stored. Human review is required.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The diagnosis request failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Case input</CardTitle>
          <CardDescription>
            Show-command output is required — NetSage AI only reasons from supplied evidence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="case_id">Case ID</Label>
            <Input
              id="case_id"
              placeholder="CASE-009"
              value={form.case_id}
              onChange={(e) => set("case_id", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="symptom">Symptom</Label>
            <Textarea
              id="symptom"
              rows={3}
              placeholder="PC1 in VLAN 30 cannot reach the server in VLAN 10…"
              value={form.symptom}
              onChange={(e) => set("symptom", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="topology">Topology notes</Label>
            <Textarea
              id="topology"
              rows={3}
              value={form.topology}
              onChange={(e) => set("topology", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="device_info">Device information</Label>
            <Textarea
              id="device_info"
              rows={3}
              value={form.device_info}
              onChange={(e) => set("device_info", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="show_output">Show-command output</Label>
            <Textarea
              id="show_output"
              rows={8}
              className="font-mono text-xs"
              placeholder="Switch# show vlan brief …"
              value={form.show_output}
              onChange={(e) => set("show_output", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="additional_notes">Additional notes</Label>
            <Textarea
              id="additional_notes"
              rows={2}
              value={form.additional_notes}
              onChange={(e) => set("additional_notes", e.target.value)}
            />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={submit} disabled={running}>
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {running ? "Analysing evidence…" : "Diagnose Network Issue"}
            </Button>
            <Button variant="outline" onClick={() => setForm(EMPTY)} disabled={running}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!diagnosis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Diagnosis result</CardTitle>
              <CardDescription>
                Submit a case to see the structured AI diagnosis, evidence and deterministic rule checks here.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {diagnosis && (
          <DiagnosisResult
            diagnosis={diagnosis}
            checks={checks}
            onDecision={savedRow ? setDecision : undefined}
            footer={
              savedRow ? (
                <Button asChild variant="outline" size="sm">
                  <Link to="/cases/$caseId" params={{ caseId: savedRow.case_id }}>
                    Open full case
                  </Link>
                </Button>
              ) : null
            }
          />
        )}
      </div>

      <ReviewDialog
        diagnosis={savedRow}
        decision={decision}
        onClose={() => setDecision(null)}
        onSaved={() => queryClient.invalidateQueries()}
      />
    </div>
  );
}
