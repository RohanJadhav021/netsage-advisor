import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { casesQuery } from "@/lib/data";
import { getServiceStatus } from "@/lib/netsage.functions";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — NetSage AI" },
      { name: "description", content: "Service and integration status for NetSage AI." },
    ],
  }),
  component: Settings,
});

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
      <Badge
        variant="outline"
        className={
          ok
            ? "gap-1 border-success/40 bg-success/15 text-success"
            : "gap-1 border-destructive/40 bg-destructive/15 text-destructive"
        }
      >
        {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {ok ? "Configured" : "Not configured"}
      </Badge>
    </div>
  );
}

function Settings() {
  const getStatus = useServerFn(getServiceStatus);
  const statusRes = useQuery({
    queryKey: ["service-status"],
    queryFn: () => getStatus(),
  });
  const dbRes = useQuery(casesQuery);

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Service status</CardTitle>
          <CardDescription>
            Live status of the integrations NetSage AI depends on. No secrets are shown here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {statusRes.isLoading ? (
            <p className="text-sm text-muted-foreground">Checking service status…</p>
          ) : statusRes.error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Could not check service status: {statusRes.error.message}
            </p>
          ) : (
            <>
              <StatusRow
                label="AI diagnosis service"
                ok={statusRes.data?.aiConfigured ?? false}
                detail={
                  statusRes.data?.aiConfigured
                    ? `Model: ${statusRes.data.aiModel}. Configured reflects that GEMINI_API_KEY is present, not that a live call succeeds — verify a real diagnosis in New Diagnosis.`
                    : "LOVABLE_API_KEY is not set. New Diagnosis will not be able to produce AI diagnoses until it is configured."
                }
              />
            </>
          )}
          <StatusRow
            label="Database"
            ok={!dbRes.error && !dbRes.isLoading}
            detail={
              dbRes.isLoading
                ? "Checking connection…"
                : dbRes.error
                  ? `Could not reach the database: ${dbRes.error.message}`
                  : `Connected — ${dbRes.data?.length ?? 0} case(s) stored.`
            }
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              statusRes.refetch();
              dbRes.refetch();
            }}
          >
            Recheck
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
          <p>
            NetSage AI diagnoses network faults from evidence you supply, cross-checks them with a
            deterministic rule engine, and requires a human decision (accept, edit or reject)
            before a diagnosis is considered final.
          </p>
          <p>Human-in-the-loop review is mandatory for every AI diagnosis produced by this app.</p>
        </CardContent>
      </Card>
    </div>
  );
}
