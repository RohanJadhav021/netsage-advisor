import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { casesQuery, responsibleAiQuery } from "@/lib/data";
import { CORRECTED_CASES_TARGET, decisionTone } from "@/lib/netsage";

export const Route = createFileRoute("/responsible-ai")({
  head: () => ({
    meta: [
      { title: "Responsible AI Log — NetSage AI" },
      {
        name: "description",
        content: "Every case where a human edited or rejected an AI diagnosis, with the reason recorded.",
      },
    ],
  }),
  component: ResponsibleAiLog,
});

function ResponsibleAiLog() {
  const [logsRes, casesRes] = useQueries({ queries: [responsibleAiQuery, casesQuery] });
  const logs = logsRes.data ?? [];
  const cases = casesRes.data ?? [];
  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const correctedCases = useMemo(() => new Set(logs.map((l) => l.case_id)).size, [logs]);
  const loading = logsRes.isLoading;

  return (
    <div className="space-y-5">
      {logsRes.error && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Could not load the responsible AI log</CardTitle>
            <CardDescription>{logsRes.error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Corrected AI cases
          </div>
          <div className="mt-1.5 text-2xl font-semibold tabular-nums">
            {correctedCases} / {CORRECTED_CASES_TARGET}
          </div>
          <Progress
            className="mt-2 h-2"
            value={Math.min(100, (correctedCases / CORRECTED_CASES_TARGET) * 100)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Counted from stored responsible-AI log records — every case where a human edited or
            rejected the AI's diagnosis.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Edited &amp; rejected AI diagnoses</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${logs.length} logged decision(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Original AI diagnosis</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Human correction</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>When</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const c = caseById.get(log.case_id);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{c?.case_id ?? log.case_id}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {log.original_diagnosis.root_cause}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={decisionTone(log.decision)}>
                        {log.decision}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {log.human_correction?.root_cause ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-muted-foreground">
                      {log.reason || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/cases/$caseId" params={{ caseId: log.case_id }}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No edited or rejected diagnoses recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
