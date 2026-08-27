import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AddCaseDialog } from "@/components/AddCaseDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ISSUE_TYPES, SEVERITIES, severityTone } from "@/lib/netsage";

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — NetSage AI" },
      { name: "description", content: "Search and filter all stored network troubleshooting cases." },
    ],
  }),
  component: CasesPage,
});

const ALL = "__all__";

type ReviewStatusFilter = "all" | "not_diagnosed" | "pending" | "ACCEPTED" | "EDITED" | "REJECTED";

function CasesPage() {
  const [casesRes, diagnosesRes, reviewsRes] = useQueries({
    queries: [casesQuery, diagnosesQuery, reviewsQuery],
  });

  const [search, setSearch] = useState("");
  const [issueType, setIssueType] = useState(ALL);
  const [severity, setSeverity] = useState(ALL);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatusFilter>("all");

  const cases = casesRes.data ?? [];
  const diagnoses = diagnosesRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const diagnosedCaseIds = useMemo(() => new Set(diagnoses.map((d) => d.case_id)), [diagnoses]);
  const reviewByCase = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reviews) if (!map.has(r.case_id)) map.set(r.case_id, r.decision);
    return map;
  }, [reviews]);

  function statusFor(caseId: string): ReviewStatusFilter | "PENDING" {
    const decision = reviewByCase.get(caseId);
    if (decision) return decision as "ACCEPTED" | "EDITED" | "REJECTED";
    return diagnosedCaseIds.has(caseId) ? "PENDING" : "not_diagnosed";
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (issueType !== ALL && c.issue_type !== issueType) return false;
      if (severity !== ALL && c.severity !== severity) return false;
      if (reviewStatus !== "all") {
        const status = statusFor(c.id);
        if (reviewStatus === "pending" ? status !== "PENDING" : status !== reviewStatus) return false;
      }
      if (q) {
        const haystack =
          `${c.case_id} ${c.symptom} ${c.expected_fault} ${c.issue_type} ${c.concept}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cases, search, issueType, severity, reviewStatus, reviewByCase, diagnosedCaseIds]);

  const error = casesRes.error ?? diagnosesRes.error ?? reviewsRes.error;
  const loading = casesRes.isLoading;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-sm">All cases</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} of ${cases.length} case(s) shown`}
            </p>
          </div>
          <AddCaseDialog />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder="Search case ID, symptom, fault…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger>
                <SelectValue placeholder="Issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All issue types</SelectItem>
                {ISSUE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All severities</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as ReviewStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Review status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All review statuses</SelectItem>
                <SelectItem value="not_diagnosed">Not diagnosed</SelectItem>
                <SelectItem value="pending">Pending review</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="EDITED">Edited</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </p>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Issue type</TableHead>
                <TableHead>Symptom</TableHead>
                <TableHead>Expected fault</TableHead>
                <TableHead>OSI layer</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Review status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const status = statusFor(c.id);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        {c.case_id}
                        {c.is_demo && (
                          <Badge variant="secondary" className="text-[10px]">
                            DEMO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{c.issue_type}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">
                      {c.symptom}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {c.expected_fault || "—"}
                    </TableCell>
                    <TableCell>{c.osi_layer || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityTone(c.severity)}>
                        {c.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {status === "not_diagnosed" ? "NOT DIAGNOSED" : status}
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
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    {cases.length === 0
                      ? "No cases stored yet."
                      : "No cases match the current search and filters."}
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
