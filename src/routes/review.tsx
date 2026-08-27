import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ReviewDialog } from "@/components/ReviewDialog";
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
import { casesQuery, diagnosesQuery, reviewsQuery } from "@/lib/data";
import { decisionTone, severityTone, type DiagnosisRow, type ReviewDecision } from "@/lib/netsage";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Human Review — NetSage AI" },
      {
        name: "description",
        content: "Review, accept, edit or reject AI diagnoses before they are treated as final.",
      },
    ],
  }),
  component: HumanReview,
});

function HumanReview() {
  const [casesRes, diagnosesRes, reviewsRes] = useQueries({
    queries: [casesQuery, diagnosesQuery, reviewsQuery],
  });
  const queryClient = useQueryClient();

  const [active, setActive] = useState<DiagnosisRow | null>(null);
  const [decision, setDecision] = useState<ReviewDecision | null>(null);

  const cases = casesRes.data ?? [];
  const diagnoses = diagnosesRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const caseById = useMemo(() => new Map(cases.map((c) => [c.id, c])), [cases]);
  const reviewByCase = useMemo(() => {
    const map = new Map<string, (typeof reviews)[number]>();
    for (const r of reviews) if (!map.has(r.case_id)) map.set(r.case_id, r);
    return map;
  }, [reviews]);

  const pending = diagnoses.filter((d) => !reviewByCase.has(d.case_id));
  const reviewed = diagnoses.filter((d) => reviewByCase.has(d.case_id));

  const error = casesRes.error ?? diagnosesRes.error ?? reviewsRes.error;
  const loading = casesRes.isLoading || diagnosesRes.isLoading || reviewsRes.isLoading;

  function open(d: DiagnosisRow, dec: ReviewDecision) {
    setActive(d);
    setDecision(dec);
  }

  return (
    <div className="space-y-5">
      {error && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Could not load the review queue</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Pending review</CardTitle>
          <CardDescription>
            {loading ? "Loading…" : `${pending.length} AI diagnosis(es) awaiting a human decision`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Root cause</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((d) => {
                const c = caseById.get(d.case_id);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">
                      <Link to="/cases/$caseId" params={{ caseId: d.case_id }} className="hover:underline">
                        {c?.case_id ?? d.case_id}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">
                      {d.root_cause}
                    </TableCell>
                    <TableCell className="tabular-nums">{d.confidence}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={severityTone(d.severity)}>
                        {d.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" onClick={() => open(d, "ACCEPTED")}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => open(d, "EDITED")}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => open(d, "REJECTED")}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Nothing is waiting on review right now.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recently reviewed</CardTitle>
          <CardDescription>{reviewed.length} diagnosis(es) already reviewed</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case ID</TableHead>
                <TableHead>Root cause</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.map((d) => {
                const c = caseById.get(d.case_id);
                const r = reviewByCase.get(d.case_id);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{c?.case_id ?? d.case_id}</TableCell>
                    <TableCell className="max-w-[320px] truncate text-muted-foreground">
                      {d.root_cause}
                    </TableCell>
                    <TableCell>
                      {r && (
                        <Badge variant="outline" className={decisionTone(r.decision)}>
                          {r.decision}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r?.reviewer ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/cases/$caseId" params={{ caseId: d.case_id }}>
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && reviewed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No reviews recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ReviewDialog
        diagnosis={active}
        decision={decision}
        onClose={() => {
          setActive(null);
          setDecision(null);
        }}
        onSaved={() => queryClient.invalidateQueries()}
      />
    </div>
  );
}
