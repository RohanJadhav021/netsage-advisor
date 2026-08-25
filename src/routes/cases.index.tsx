import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { casesQuery, diagnosesQuery, reviewsQuery } from "@/lib/data";
import { ISSUE_TYPES, SEVERITIES, decisionTone, severityTone } from "@/lib/netsage";

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — NetSage AI" },
      {
        name: "description",
        content: "Browse, search and filter every stored network troubleshooting case and its review status.",
      },
      { property: "og:title", content: "Cases — NetSage AI" },
      { property: "og:description", content: "All stored NetSage AI troubleshooting cases." },
    ],
  }),
  component: CasesPage,
});

function CasesPage() {
  const [search, setSearch] = useState("");
  const [issueType, setIssueType] = useState("all");
  const [severity, setSeverity] = useState("all");

  const [casesRes, diagnosesRes, reviewsRes] = useQueries({
    queries: [casesQuery, diagnosesQuery, reviewsQuery],
  });

  const error = casesRes.error ?? diagnosesRes.error ?? reviewsRes.error;
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Could not load cases</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => casesRes.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const loading = casesRes.isLoading || diagnosesRes.isLoading || reviewsRes.isLoading;
  const cases = casesRes.data ?? [];
  const diagnosedCaseIds = new Set((diagnosesRes.data ?? []).map((d) => d.case_id));
  const reviewByCase = new Map((reviewsRes.data ?? []).map((r) => [r.case_id, r.decision]));

  const q = search.trim().toLowerCase();
  const filtered = cases.filter((c) => {
    if (issueType !== "all" && c.issue_type !== issueType) return false;
    if (severity !== "all" && c.severity !== severity) return false;
    if (!q) return true;
    return (
      c.case_id.toLowerCase().includes(q) ||
      c.symptom.toLowerCase().includes(q) ||
      c.concept.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Stored cases</CardTitle>
          <CardDescription>
            {loading ? "Loading cases…" : `${filtered.length} of ${cases.length} cases shown`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Search case ID, symptom or concept…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={issueType} onValueChange={setIssueType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Issue type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All issue types</SelectItem>
              {ISSUE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setIssueType("all");
              setSeverity("all");
            }}
          >
            Reset
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Issue type</TableHead>
                <TableHead>Symptom</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Review</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const decision = reviewByCase.get(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.case_id}
                      {c.is_demo && (
                        <Badge variant="outline" className="ml-2">
                          demo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{c.issue_type}</TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">{c.symptom}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityTone(c.severity)}>
                        {c.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {decision ? (
                        <Badge variant="outline" className={decisionTone(decision)}>
                          {decision}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {diagnosedCaseIds.has(c.id) ? "PENDING" : "NOT DIAGNOSED"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/cases/$caseId" params={{ caseId: c.id }}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    {cases.length === 0
                      ? "No cases stored yet. Submit one from New Diagnosis."
                      : "No cases match the current filters."}
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
