import { useQueries } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
import { casesQuery, diagnosesQuery, reviewsQuery } from "@/lib/data";
import {
  CORRECTED_CASES_TARGET,
  ISSUE_TYPES,
  SEVERITIES,
  severityTone,
} from "@/lib/netsage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetSage AI — Network Troubleshooting Dashboard" },
      {
        name: "description",
        content:
          "Dashboard for NetSage AI: case volume, AI diagnoses, human review decisions and AI-human agreement rate.",
      },
      { property: "og:title", content: "NetSage AI — Network Troubleshooting Dashboard" },
      {
        property: "og:description",
        content: "AI-assisted Cisco network troubleshooting with mandatory human review.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [casesRes, diagnosesRes, reviewsRes] = useQueries({
    queries: [casesQuery, diagnosesQuery, reviewsQuery],
  });

  const error = casesRes.error ?? diagnosesRes.error ?? reviewsRes.error;
  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Could not load dashboard data</CardTitle>
          <CardDescription>{error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => { casesRes.refetch(); diagnosesRes.refetch(); reviewsRes.refetch(); }}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const loading = casesRes.isLoading || diagnosesRes.isLoading || reviewsRes.isLoading;
  const cases = casesRes.data ?? [];
  const diagnoses = diagnosesRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const diagnosedCaseIds = new Set(diagnoses.map((d) => d.case_id));
  const accepted = reviews.filter((r) => r.decision === "ACCEPTED").length;
  const edited = reviews.filter((r) => r.decision === "EDITED").length;
  const rejected = reviews.filter((r) => r.decision === "REJECTED").length;
  const reviewed = reviews.length;
  const agreement = reviewed > 0 ? Math.round((accepted / reviewed) * 100) : 0;
  const correctedCases = new Set(
    reviews.filter((r) => r.decision !== "ACCEPTED").map((r) => r.case_id),
  ).size;

  const reviewByCase = new Map(reviews.map((r) => [r.case_id, r.decision]));

  const issueData = ISSUE_TYPES.map((t) => ({
    name: t,
    count: cases.filter((c) => c.issue_type === t).length,
  }));
  const severityData = SEVERITIES.map((s, i) => ({
    name: s,
    count: cases.filter((c) => c.severity === s).length,
    fill: `var(--chart-${i + 1})`,
  })).filter((d) => d.count > 0);
  const reviewStatusData = [
    { name: "Accepted", count: accepted, fill: "var(--success)" },
    { name: "Edited", count: edited, fill: "var(--warning)" },
    { name: "Rejected", count: rejected, fill: "var(--destructive)" },
    {
      name: "Pending",
      count: diagnoses.filter((d) => !reviewByCase.has(d.case_id)).length,
      fill: "var(--muted-foreground)",
    },
  ].filter((d) => d.count > 0);

  return (
    <div className="space-y-6">
      {loading && <p className="text-sm text-muted-foreground">Loading stored cases…</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total cases" value={cases.length} />
        <Stat label="Diagnosed cases" value={diagnosedCaseIds.size} hint={`${diagnoses.length} AI diagnoses`} />
        <Stat label="AI–human agreement" value={`${agreement}%`} hint={`${reviewed} reviews recorded`} />
        <Stat
          label="Pending review"
          value={diagnoses.filter((d) => !reviewByCase.has(d.case_id)).length}
        />
        <Stat label="Accepted" value={accepted} />
        <Stat label="Edited" value={edited} />
        <Stat label="Rejected" value={rejected} />
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
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cases by issue type</CardTitle>
            <CardDescription>Computed from stored cases</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={issueData}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Review status</CardTitle>
            <CardDescription>Human decisions on AI diagnoses</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {reviewStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={reviewStatusData} dataKey="count" nameKey="name" innerRadius={45} outerRadius={80}>
                    {reviewStatusData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Severity distribution</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {severityData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases yet.</p>
          ) : (
            severityData.map((s) => (
              <div key={s.name} className="rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">{s.name}: </span>
                <span className="font-semibold tabular-nums">{s.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm">Recent cases</CardTitle>
            <CardDescription>Latest 8 stored cases</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/cases">All cases</Link>
          </Button>
        </CardHeader>
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
              {cases.slice(0, 8).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.case_id}</TableCell>
                  <TableCell>{c.issue_type}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">{c.symptom}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={severityTone(c.severity)}>
                      {c.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {reviewByCase.get(c.id) ?? (diagnosedCaseIds.has(c.id) ? "PENDING" : "NOT DIAGNOSED")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="ghost">
                      <Link to="/cases/$caseId" params={{ caseId: c.id }}>
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && cases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No cases stored yet.
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
