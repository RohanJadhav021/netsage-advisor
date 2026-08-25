import { Check, Pencil, X } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { severityTone, statusTone } from "@/lib/netsage";
import type { AiDiagnosis, ReviewDecision, RuleCheckResult } from "@/lib/netsage";

export function RuleCheckList({
  checks,
  engine,
}: {
  checks: RuleCheckResult[] | null;
  engine?: string | undefined;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Deterministic rule checks</CardTitle>
        <CardDescription>
          {engine ? `Engine: ${engine}. ` : ""}
          Non-AI checks computed directly from the supplied output.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!checks && <p className="text-sm text-muted-foreground">Rule checks have not been run for this case.</p>}
        {checks && checks.length === 0 && (
          <p className="text-sm text-muted-foreground">No rule checks produced a result.</p>
        )}
        {checks?.map((c) => (
          <div key={c.check} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{c.check}</span>
              <Badge variant="outline" className={statusTone(c.status)}>
                {c.status}
              </Badge>
            </div>
            {c.evidence && (
              <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
                {c.evidence}
              </pre>
            )}
            {c.explanation && <p className="mt-2 text-xs text-muted-foreground">{c.explanation}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function DiagnosisResult({
  diagnosis,
  checks,
  checksEngine,
  onDecision,
  footer,
  title = "AI diagnosis",
}: {
  diagnosis: AiDiagnosis;
  checks?: RuleCheckResult[] | null | undefined;
  checksEngine?: string | undefined;
  onDecision?: ((decision: ReviewDecision) => void) | undefined;
  footer?: ReactNode | undefined;
  title?: string | undefined;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">{title}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={severityTone(diagnosis.severity)}>
                {diagnosis.severity}
              </Badge>
              <Badge variant="outline">{diagnosis.osi_layer}</Badge>
            </div>
          </div>
          <CardDescription>{diagnosis.concept}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Root cause</div>
            <p className="mt-1 text-sm">{diagnosis.root_cause}</p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium uppercase tracking-wide">Confidence</span>
              <span className="tabular-nums">{diagnosis.confidence}%</span>
            </div>
            <Progress className="mt-1.5 h-2" value={diagnosis.confidence} />
          </div>

          <Separator />

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence used</div>
            {diagnosis.evidence.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">The AI cited no evidence lines.</p>
            ) : (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
                {diagnosis.evidence.map((e, i) => (
                  <li key={i} className="font-mono text-xs">
                    {e}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Next command to run
            </div>
            <pre className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/40 p-2 font-mono text-xs">
              {diagnosis.next_command}
            </pre>
          </div>

          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fix steps</div>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
              {diagnosis.fix_steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>

          {(onDecision || footer) && <Separator />}

          <div className="flex flex-wrap gap-2">
            {onDecision && (
              <>
                <Button size="sm" onClick={() => onDecision("ACCEPTED")}>
                  <Check className="mr-1.5 h-4 w-4" /> Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDecision("EDITED")}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onDecision("REJECTED")}>
                  <X className="mr-1.5 h-4 w-4" /> Reject
                </Button>
              </>
            )}
            {footer}
          </div>
        </CardContent>
      </Card>

      {checks !== undefined && <RuleCheckList checks={checks} engine={checksEngine} />}
    </div>
  );
}
