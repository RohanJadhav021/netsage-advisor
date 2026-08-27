import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AiDiagnosis, ReviewDecision, RuleCheckResult } from "@/lib/netsage";
import { severityTone, statusTone } from "@/lib/netsage";

function statusIcon(status: RuleCheckResult["status"]) {
  if (status === "PASS") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "WARNING") return <AlertTriangle className="h-3.5 w-3.5" />;
  return <XCircle className="h-3.5 w-3.5" />;
}

/**
 * Displays a structured AI diagnosis (root cause, confidence, evidence, fix
 * steps) alongside deterministic rule-check results, with optional human
 * review action buttons. The original AI output is rendered as returned —
 * nothing here is invented or altered.
 */
export function DiagnosisResult({
  diagnosis,
  checks,
  onDecision,
  footer,
}: {
  diagnosis: AiDiagnosis;
  checks?: RuleCheckResult[] | null | undefined;
  onDecision?: ((decision: ReviewDecision) => void) | undefined;
  footer?: ReactNode;
}) {
  const passCount = checks?.filter((c) => c.status === "PASS").length ?? 0;
  const warnCount = checks?.filter((c) => c.status === "WARNING").length ?? 0;
  const failCount = checks?.filter((c) => c.status === "FAIL").length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">AI diagnosis</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className={severityTone(diagnosis.severity)}>
                {diagnosis.severity}
              </Badge>
              <Badge variant="outline">{diagnosis.osi_layer}</Badge>
              <Badge variant="outline">{diagnosis.concept}</Badge>
            </div>
          </div>
          <CardDescription>Root cause identified from the supplied evidence</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>AI-generated diagnosis — human review required.</AlertTitle>
            <AlertDescription>
              This output has not been validated by a human reviewer. Treat it as a hypothesis,
              not a confirmed fault.
            </AlertDescription>
          </Alert>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Root cause
            </div>
            <p className="mt-1 text-sm leading-relaxed">{diagnosis.root_cause}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Confidence
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{diagnosis.confidence}%</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                OSI layer
              </div>
              <div className="mt-1 text-sm font-medium">{diagnosis.osi_layer}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Concept
              </div>
              <div className="mt-1 text-sm font-medium">{diagnosis.concept}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Severity
              </div>
              <div className="mt-1 text-sm font-medium">{diagnosis.severity}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Evidence cited
            </div>
            {diagnosis.evidence.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                No specific evidence lines were cited by the AI.
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {diagnosis.evidence.map((line, i) => (
                  <li
                    key={`${i}-${line.slice(0, 24)}`}
                    className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 font-mono text-xs leading-relaxed"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next command to run
            </div>
            <p className="mt-1 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 font-mono text-xs">
              {diagnosis.next_command}
            </p>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fix steps
            </div>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm">
              {diagnosis.fix_steps.map((step, i) => (
                <li key={`${i}-${step.slice(0, 24)}`}>{step}</li>
              ))}
            </ol>
          </div>

          {onDecision && (
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button size="sm" onClick={() => onDecision("ACCEPTED")}>
                Accept
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecision("EDITED")}>
                Edit &amp; correct
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDecision("REJECTED")}>
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {checks && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Deterministic rule check results</CardTitle>
            <CardDescription>
              {checks.length === 0
                ? "No checks were run."
                : `${passCount} passed, ${warnCount} warning${warnCount === 1 ? "" : "s"}, ${failCount} failed`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            {checks.length === 0 ? (
              <p className="px-6 text-sm text-muted-foreground">No rule check results available.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead>Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checks.map((c) => (
                    <TableRow key={c.check}>
                      <TableCell className="font-medium">{c.check}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${statusTone(c.status)}`}>
                          {statusIcon(c.status)}
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {c.evidence || "—"}
                      </TableCell>
                      <TableCell className="max-w-[320px] text-xs text-muted-foreground">
                        {c.explanation}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {footer}
    </div>
  );
}
