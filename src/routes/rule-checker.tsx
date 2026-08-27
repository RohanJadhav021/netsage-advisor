import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { casesQuery, saveRuleChecks } from "@/lib/data";
import { runChecks } from "@/lib/netsage.functions";
import { statusTone, type RuleCheckResult } from "@/lib/netsage";

export const Route = createFileRoute("/rule-checker")({
  head: () => ({
    meta: [
      { title: "Rule Checker — NetSage AI" },
      {
        name: "description",
        content: "Run the deterministic network rule checker against show-command output.",
      },
    ],
  }),
  component: RuleCheckerPage,
});

const NONE = "__none__";

function RuleCheckerPage() {
  const casesRes = useQuery(casesQuery);
  const queryClient = useQueryClient();
  const check = useServerFn(runChecks);
  const { user } = useAuth();

  const [selectedCase, setSelectedCase] = useState(NONE);
  const [showOutput, setShowOutput] = useState("");
  const [deviceInfo, setDeviceInfo] = useState("");
  const [topology, setTopology] = useState("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RuleCheckResult[] | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!user) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="text-base font-semibold">Please sign in</div>
          <p className="max-w-md text-sm text-muted-foreground">
            Rule checks require an authenticated session.
          </p>
          <Button asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function loadCase(caseUuid: string) {
    setSelectedCase(caseUuid);
    if (caseUuid === NONE) return;
    const c = (casesRes.data ?? []).find((row) => row.id === caseUuid);
    if (!c) return;
    setShowOutput(c.show_output);
    setDeviceInfo(c.device_info);
    setTopology(c.topology);
    setResults(null);
    setError(null);
  }

  async function run() {
    setError(null);
    if (!showOutput.trim()) {
      setError("Show-command output is required to run the checker.");
      return;
    }
    setRunning(true);
    setResults(null);
    try {
      const outcome = await check({
        data: { show_output: showOutput, device_info: deviceInfo, topology },
      });
      setResults(outcome.results);
      setEngine(outcome.engine);
      setNote(outcome.note ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The rule checker failed to run.");
    } finally {
      setRunning(false);
    }
  }

  async function saveToCase() {
    if (!results || selectedCase === NONE) return;
    setSaving(true);
    try {
      await saveRuleChecks(selectedCase, results, engine ?? "typescript");
      await queryClient.invalidateQueries({ queryKey: ["rule_checks"] });
      await queryClient.invalidateQueries({ queryKey: ["rule_checks", "case", selectedCase] });
      toast.success("Rule check results saved to the case.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save rule check results.");
    } finally {
      setSaving(false);
    }
  }

  const passCount = results?.filter((r) => r.status === "PASS").length ?? 0;
  const warnCount = results?.filter((r) => r.status === "WARNING").length ?? 0;
  const failCount = results?.filter((r) => r.status === "FAIL").length ?? 0;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Deterministic rule checker</CardTitle>
          <CardDescription>
            Runs the same duplicate-IP, subnet mask, gateway, interface, VLAN and routing checks
            used during diagnosis. Uses the Python service when configured, otherwise the built-in
            reference implementation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Load from an existing case (optional)</label>
            <Select value={selectedCase} onValueChange={loadCase}>
              <SelectTrigger>
                <SelectValue placeholder="Start from scratch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Start from scratch</SelectItem>
                {(casesRes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.case_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Show-command output</label>
            <Textarea
              rows={8}
              className="font-mono text-xs"
              placeholder="Switch# show vlan brief …"
              value={showOutput}
              onChange={(e) => setShowOutput(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Device information</label>
            <Textarea rows={2} value={deviceInfo} onChange={(e) => setDeviceInfo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Topology notes</label>
            <Textarea rows={2} value={topology} onChange={(e) => setTopology(e.target.value)} />
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={run} disabled={running}>
              {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {running ? "Running checks…" : "Run checks"}
            </Button>
            {results && selectedCase !== NONE && (
              <Button variant="outline" onClick={saveToCase} disabled={saving}>
                {saving ? "Saving…" : "Save results to case"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Results</CardTitle>
          <CardDescription>
            {results
              ? `${passCount} passed, ${warnCount} warning(s), ${failCount} failed · engine: ${engine}`
              : "Run the checker to see check-by-check results here."}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {note && (
            <p className="mx-6 mb-3 rounded-md border border-border bg-muted/30 p-2.5 text-xs text-muted-foreground">
              {note}
            </p>
          )}
          {results && results.length > 0 && (
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
                {results.map((r) => (
                  <TableRow key={r.check}>
                    <TableCell className="font-medium">{r.check}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusTone(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                      {r.evidence || "—"}
                    </TableCell>
                    <TableCell className="max-w-[280px] text-xs text-muted-foreground">
                      {r.explanation}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {!results && (
            <p className="px-6 text-sm text-muted-foreground">No checks have been run yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
