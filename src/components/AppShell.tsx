import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Database,
  FileSearch,
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, title: "Dashboard", subtitle: "Case, diagnosis and review overview" },
  { to: "/new-diagnosis", label: "New Diagnosis", icon: PlusCircle, title: "New Diagnosis", subtitle: "Submit a case for AI-assisted analysis" },
  { to: "/cases", label: "Cases", icon: Database, title: "Cases", subtitle: "All stored troubleshooting cases" },
  { to: "/rule-checker", label: "Rule Checker", icon: ListChecks, title: "Rule Checker", subtitle: "Deterministic checks on show-command output" },
  { to: "/review", label: "Human Review", icon: UserCheck, title: "Human Review", subtitle: "Validate or correct AI diagnoses" },
  { to: "/responsible-ai", label: "Responsible AI Log", icon: ShieldCheck, title: "Responsible AI Log", subtitle: "Corrected and rejected AI responses" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, title: "Settings", subtitle: "Service and integration status" },
] as const;

function matchNav(pathname: string) {
  if (pathname.startsWith("/cases")) return NAV[2];
  return NAV.find((n) => n.to === pathname) ?? {
    to: pathname,
    label: "Case Detail",
    icon: FileSearch,
    title: "Diagnosis Details",
    subtitle: "Case, AI diagnosis, rule checks and human review",
  };
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = matchNav(pathname);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Activity className="h-4.5 w-4.5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight text-sidebar-foreground">NetSage AI</div>
            <div className="text-[11px] text-muted-foreground">Network Diagnostics</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-3 text-[11px] text-muted-foreground">
          Human-in-the-loop required
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">{current.title}</h1>
              <p className="truncate text-xs text-muted-foreground">{current.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/review">Review queue</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/new-diagnosis">New diagnosis</Link>
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
