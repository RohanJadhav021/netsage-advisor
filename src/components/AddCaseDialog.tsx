import { useQueryClient } from "@tanstack/react-query";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCase } from "@/lib/data";
import { ISSUE_TYPES, OSI_LAYERS, SEVERITIES, caseInputSchema } from "@/lib/netsage";

const EMPTY = {
  case_id: "",
  symptom: "",
  topology: "",
  device_info: "",
  show_output: "",
  additional_notes: "",
  expected_fault: "",
  issue_type: "Unknown",
  osi_layer: "Layer 1",
  concept: "",
  severity: "Medium",
};

/**
 * Manually add a case to the case library without running the AI diagnosis
 * pipeline — for importing known/expected-fault cases directly. Uses the
 * same case data model and validation as New Diagnosis.
 */
export function AddCaseDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm(EMPTY);
    setError(null);
  }

  async function submit() {
    setError(null);
    const parsed = caseInputSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" • "));
      return;
    }
    setSaving(true);
    try {
      await createCase(parsed.data);
      await queryClient.invalidateQueries({ queryKey: ["cases"] });
      toast.success(`Case "${parsed.data.case_id}" added.`);
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the case.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">Add case</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add case</DialogTitle>
          <DialogDescription>
            Adds a case to the library without running an AI diagnosis. Use New Diagnosis instead
            if you want NetSage AI to analyse it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="add-case-id">Case ID</Label>
            <Input
              id="add-case-id"
              placeholder="CASE-030"
              value={form.case_id}
              onChange={(e) => set("case_id", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-symptom">Symptom</Label>
            <Textarea
              id="add-symptom"
              rows={2}
              value={form.symptom}
              onChange={(e) => set("symptom", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Issue type</Label>
              <Select value={form.issue_type} onValueChange={(v) => set("issue_type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unknown">Unknown</SelectItem>
                  {ISSUE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => set("severity", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>OSI layer</Label>
            <Select value={form.osi_layer} onValueChange={(v) => set("osi_layer", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an OSI layer" />
              </SelectTrigger>
              <SelectContent>
                {OSI_LAYERS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-concept">Concept</Label>
            <Input
              id="add-concept"
              value={form.concept}
              onChange={(e) => set("concept", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-topology">Topology notes</Label>
            <Textarea
              id="add-topology"
              rows={2}
              value={form.topology}
              onChange={(e) => set("topology", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-device-info">Device information</Label>
            <Textarea
              id="add-device-info"
              rows={2}
              value={form.device_info}
              onChange={(e) => set("device_info", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-show-output">Show-command output</Label>
            <Textarea
              id="add-show-output"
              rows={5}
              className="font-mono text-xs"
              value={form.show_output}
              onChange={(e) => set("show_output", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-expected-fault">Expected fault</Label>
            <Textarea
              id="add-expected-fault"
              rows={2}
              value={form.expected_fault}
              onChange={(e) => set("expected_fault", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-notes">Additional notes</Label>
            <Textarea
              id="add-notes"
              rows={2}
              value={form.additional_notes}
              onChange={(e) => set("additional_notes", e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save case"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
