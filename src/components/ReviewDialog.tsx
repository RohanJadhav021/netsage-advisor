import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveReview } from "@/lib/data";
import type { AiDiagnosis, DiagnosisRow, ReviewDecision } from "@/lib/netsage";

export function ReviewDialog({
  diagnosis,
  decision,
  onClose,
  onSaved,
}: {
  diagnosis: DiagnosisRow | null;
  decision: ReviewDecision | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [comment, setComment] = useState("");
  const [reviewer, setReviewer] = useState("Reviewer");
  const [rootCause, setRootCause] = useState("");
  const [severity, setSeverity] = useState("");
  const [osiLayer, setOsiLayer] = useState("");
  const [fixSteps, setFixSteps] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = Boolean(diagnosis && decision);

  function reset() {
    setComment("");
    setRootCause("");
    setSeverity("");
    setOsiLayer("");
    setFixSteps("");
    setError(null);
  }

  async function submit() {
    if (!diagnosis || !decision) return;
    if (decision !== "ACCEPTED" && comment.trim().length < 5) {
      setError("A reason/comment of at least 5 characters is required for EDITED and REJECTED decisions.");
      return;
    }
    let correction: AiDiagnosis | null = null;
    if (decision === "EDITED") {
      if (rootCause.trim().length < 3) {
        setError("Provide the corrected root cause.");
        return;
      }
      correction = {
        root_cause: rootCause.trim(),
        confidence: diagnosis.confidence,
        osi_layer: osiLayer.trim() || diagnosis.osi_layer,
        evidence: diagnosis.evidence,
        next_command: diagnosis.next_command,
        fix_steps: fixSteps.trim()
          ? fixSteps.split("\n").map((s) => s.trim()).filter(Boolean)
          : diagnosis.fix_steps,
        severity: severity.trim() || diagnosis.severity,
        concept: diagnosis.concept,
      };
    }
    setSaving(true);
    setError(null);
    try {
      await saveReview({
        caseUuid: diagnosis.case_id,
        diagnosis,
        decision,
        correction,
        comment: comment.trim(),
        reviewer: reviewer.trim() || "Reviewer",
      });
      toast.success(`Review saved as ${decision}. The original AI diagnosis is unchanged.`);
      reset();
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the review.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Human review — {decision ?? ""}</DialogTitle>
          <DialogDescription>
            The AI diagnosis is stored immutably. Your decision is recorded separately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reviewer">Reviewer</Label>
            <Input id="reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} />
          </div>

          {decision === "EDITED" && (
            <div className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
              <div className="space-y-1.5">
                <Label htmlFor="rootCause">Corrected root cause</Label>
                <Textarea
                  id="rootCause"
                  rows={3}
                  placeholder={diagnosis?.root_cause}
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="osi">OSI layer</Label>
                  <Input
                    id="osi"
                    placeholder={diagnosis?.osi_layer}
                    value={osiLayer}
                    onChange={(e) => setOsiLayer(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sev">Severity</Label>
                  <Input
                    id="sev"
                    placeholder={diagnosis?.severity}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fix">Corrected fix steps (one per line)</Label>
                <Textarea id="fix" rows={3} value={fixSteps} onChange={(e) => setFixSteps(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="comment">
              {decision === "ACCEPTED" ? "Comment (optional)" : "Reason for correction / rejection (required)"}
            </Label>
            <Textarea id="comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
