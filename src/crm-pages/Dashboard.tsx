"use client";

import React from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ArrowUpRight,
  AlertTriangle,
  Award,
  BadgeDollarSign,
  CheckCircle2,
  Clock,
  Contact,
  Filter,
  Inbox,
  LifeBuoy,
  Loader2,
  Percent,
  Plus,
  Scale,
  Target,
  TicketCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/providers/keycloak-provider";
import { useTheme } from "@/providers/theme-provider";
import { useDashboard, useTeamPerformance } from "@/features/reports/hooks/useReports";
import {
  DashboardResponse,
  RepPerformance,
  STAGE_LABELS,
  TeamPerformanceResponse,
} from "@/features/reports/types";
import { useMyTickets } from "@/features/tickets/hooks/useTickets";
import { Ticket, TICKET_STATUS_LABELS, TicketStatus } from "@/features/tickets/types";
import { cn } from "@/lib/utils";
import { currencyFormatter as currency, compactCurrencyFormatter as compactCurrency } from "@/lib/currency";

/* ------------------------------------------------------------------ */
/*  Formatters & palette                                               */
/* ------------------------------------------------------------------ */

const STAGE_COLORS: Record<string, string> = {
  discovery: "#38bdf8",
  proposal: "#6366f1",
  negotiation: "#f59e0b",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
};

const SOURCE_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

function monthLabel(ym: string, locale: string): string {
  const parts = ym.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return ym;
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(y, m - 1, 1));
}

/* ------------------------------------------------------------------ */
/*  Shared building blocks                                             */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", accent)}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
        <Icon size={18} />
      </span>
      <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      <ArrowUpRight size={16} className="text-slate-300 transition-colors group-hover:text-indigo-500 dark:text-slate-600" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Staff dashboard (Admin / Administrator / User)                     */
/* ------------------------------------------------------------------ */

function RepLeaderboard({ reps }: { reps: RepPerformance[] }) {
  const t = useTranslations("dashboard");
  const max = Math.max(1, ...reps.map((r) => r.wonValue));
  if (reps.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">{t("panels.noClosedWonDeals")}</p>;
  }
  return (
    <div className="space-y-3">
      {reps.slice(0, 5).map((rep, i) => (
        <div key={rep.ownerId} className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
              i === 0
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                : i === 1
                  ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  : i === 2
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{rep.ownerName}</span>
              <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-white">
                {currency.format(rep.wonValue)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(rep.wonValue / max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              {t("leaderboard.statsLine", { won: rep.wonCount, rate: rep.winRate, open: rep.openCount })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelRow({ label, value, total, tint }: { label: string; value: number; total: number; tint: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold text-slate-900 dark:text-white">
          {value.toLocaleString()} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">({pct}%)</span>
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={cn("h-full rounded-full", tint)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StaffDashboard({ isAdmin }: { isAdmin: boolean }) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "#1e293b" : "#eef2f7";
  const tickFill = dark ? "#64748b" : "#94a3b8";
  const tooltipStyle = {
    borderRadius: 12,
    border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    fontSize: 13,
  };
  const tooltipText = { color: tooltipStyle.color };

  const dashboardQuery = useDashboard();
  const teamQuery = useTeamPerformance();
  const data: DashboardResponse | undefined = dashboardQuery.data;
  const team: TeamPerformanceResponse | undefined = teamQuery.data;

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span>{t("loadingDashboard")}</span>
      </div>
    );
  }

  if (dashboardQuery.isError || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        {t("failedToLoad")}{" "}
        <button className="underline" onClick={() => dashboardQuery.refetch()}>
          {t("retry")}
        </button>
      </div>
    );
  }

  const { totals, pipeline, funnel, revenueByMonth, leadsBySource, topReps } = data;
  const revenueData = revenueByMonth.map((p) => ({ ...p, label: monthLabel(p.month, locale) }));
  const stageData = pipeline.byStage.filter((b) => b.stage !== "closed_lost");
  const maxStageValue = Math.max(1, ...stageData.map((b) => b.totalAmount));

  return (
    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("stats.openPipeline")}
          value={compactCurrency.format(pipeline.openValue)}
          sub={t("stats.openDeals", { count: pipeline.openCount })}
          icon={BadgeDollarSign}
          accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
        />
        <StatCard
          label={t("stats.weightedForecast")}
          value={compactCurrency.format(pipeline.weightedValue)}
          sub={t("stats.probabilityAdjusted")}
          icon={Scale}
          accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
        />
        <StatCard
          label={t("stats.wonThisMonth")}
          value={compactCurrency.format(pipeline.wonThisMonthValue)}
          sub={t("stats.dealsClosed", { count: pipeline.wonThisMonthCount })}
          icon={TrendingUp}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        />
        <StatCard
          label={t("stats.winRate")}
          value={`${pipeline.winRate}%`}
          sub={t("stats.closedWonOfDecided")}
          icon={Percent}
          accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("stats.activeCustomers")}
          value={totals.activeCustomers.toLocaleString()}
          sub={t("stats.totalCustomers", { count: totals.customers.toLocaleString() })}
          icon={Users}
          accent="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />
        <StatCard
          label={t("stats.openTickets")}
          value={totals.openTickets.toLocaleString()}
          sub={t("stats.awaitingResolution")}
          icon={LifeBuoy}
          accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <StatCard
          label={t("stats.pendingTasks")}
          value={totals.pendingTasks.toLocaleString()}
          sub={t("stats.todo")}
          icon={CheckCircle2}
          accent="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
        />
        <StatCard
          label={t("stats.overdueTasks")}
          value={totals.overdueTasks.toLocaleString()}
          sub={totals.overdueTasks > 0 ? t("stats.needsAttention") : t("stats.allCaughtUp")}
          icon={AlertTriangle}
          accent={
            totals.overdueTasks > 0
              ? "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          }
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickAction href="/leads" icon={Target} label={t("quickActions.captureLead")} />
        <QuickAction href="/opportunities" icon={Filter} label={t("quickActions.newOpportunity")} />
        <QuickAction href="/customers" icon={Contact} label={t("quickActions.addCustomer")} />
        <QuickAction href="/reports" icon={TrendingUp} label={t("quickActions.viewReports")} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title={t("panels.revenue")}
          subtitle={t("panels.last12Months")}
          className="lg:col-span-2"
          action={
            <Link href="/reports" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              {t("panels.fullReports")} <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => compactCurrency.format(v)}
                  width={64}
                />
                <Tooltip
                  formatter={(v: number) => [currency.format(v), t("wonTooltip")]}
                  contentStyle={tooltipStyle}
                  itemStyle={tooltipText}
                  labelStyle={tooltipText}
                />
                <Area type="monotone" dataKey="wonValue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={t("panels.leadsBySource")} subtitle={t("panels.newLeadOrigins")}>
          {leadsBySource.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">{t("panels.noLeadsYet")}</p>
          ) : (
            <div className="flex h-64 flex-col">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadsBySource}
                      dataKey="count"
                      nameKey="label"
                      innerRadius="55%"
                      outerRadius="85%"
                      paddingAngle={2}
                    >
                      {leadsBySource.map((s, i) => (
                        <Cell key={s.key} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} stroke={dark ? "#0f172a" : "#ffffff"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number, n: string) => [t("panels.leadsUnit", { count: v }), n]}
                      contentStyle={tooltipStyle}
                      itemStyle={tooltipText}
                      labelStyle={tooltipText}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {leadsBySource.slice(0, 6).map((s, i) => (
                  <div key={s.key} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    {s.label} ({s.count})
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline by stage */}
        <Panel title={t("panels.pipelineByStage")} subtitle={t("panels.openDealValue")} className="lg:col-span-2">
          {stageData.every((b) => b.count === 0) ? (
            <p className="py-12 text-center text-sm text-slate-400">{t("panels.noOpenDeals")}</p>
          ) : (
            <div className="space-y-4 py-1">
              {stageData.map((b) => (
                <div key={b.stage}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {STAGE_LABELS[b.stage]}{" "}
                      <span className="text-xs text-slate-400 dark:text-slate-500">· {t("panels.dealsUnit", { count: b.count })}</span>
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{currency.format(b.totalAmount)}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(b.totalAmount / maxStageValue) * 100}%`,
                        background: STAGE_COLORS[b.stage] ?? "#6366f1",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Lead funnel */}
        <Panel title={t("panels.leadFunnel")} subtitle={t("panels.conversionRate", { rate: funnel.conversionRate })}>
          <div className="space-y-4 py-1">
            <FunnelRow label={t("funnel.totalLeads")} value={funnel.totalLeads} total={funnel.totalLeads} tint="bg-slate-400" />
            <FunnelRow label={t("funnel.contacted")} value={funnel.contacted} total={funnel.totalLeads} tint="bg-sky-500" />
            <FunnelRow label={t("funnel.qualified")} value={funnel.qualified} total={funnel.totalLeads} tint="bg-indigo-500" />
            <FunnelRow label={t("funnel.converted")} value={funnel.converted} total={funnel.totalLeads} tint="bg-emerald-500" />
          </div>
        </Panel>
      </div>

      {/* Leaderboards */}
      <div className={cn("grid grid-cols-1 gap-6", isAdmin && "lg:grid-cols-2")}>
        <Panel title={t("panels.topPerformers")} subtitle={t("panels.byClosedWonValue")}>
          <RepLeaderboard reps={topReps} />
        </Panel>

        {isAdmin && (
          <Panel title={t("panels.teamPerformance")} subtitle={t("panels.wonValueByTeam")}>
            {!team || team.teams.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {teamQuery.isLoading ? t("panels.loadingTeams") : t("panels.noTeamData")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-start text-xs uppercase tracking-wider text-slate-400 dark:border-slate-800">
                      <th className="pb-2 font-semibold">{t("table.team")}</th>
                      <th className="pb-2 text-center font-semibold">{t("table.members")}</th>
                      <th className="pb-2 text-end font-semibold">{t("table.won")}</th>
                      <th className="pb-2 text-end font-semibold">{t("table.winRate")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {team.teams.map((row) => (
                      <tr key={row.teamId} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                        <td className="py-2.5 font-medium text-slate-700 dark:text-slate-200">{row.teamName}</td>
                        <td className="py-2.5 text-center text-slate-500 dark:text-slate-400">{row.memberCount}</td>
                        <td className="py-2.5 text-end font-semibold text-slate-900 dark:text-white">
                          {currency.format(row.wonValue)}
                        </td>
                        <td className="py-2.5 text-end text-slate-500 dark:text-slate-400">{row.winRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Customer dashboard                                                 */
/* ------------------------------------------------------------------ */

const OPEN_STATUSES: TicketStatus[] = ["open", "in_progress"];
const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  in_progress: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  waiting_on_customer: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  resolved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function CustomerDashboard() {
  const t = useTranslations("dashboard");
  const { myTicketsQuery } = useMyTickets(true);
  const tickets: Ticket[] = myTicketsQuery.data ?? [];

  const open = tickets.filter((tk) => OPEN_STATUSES.includes(tk.status)).length;
  const waiting = tickets.filter((tk) => tk.status === "waiting_on_customer").length;
  const resolved = tickets.filter((tk) => tk.status === "resolved" || tk.status === "closed").length;

  const recent = [...tickets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("stats.totalTickets")} value={tickets.length} icon={Inbox} accent="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" />
        <StatCard label={t("stats.open")} value={open} sub={t("stats.beingWorkedOn")} icon={LifeBuoy} accent="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" />
        <StatCard
          label={t("stats.waitingOnYou")}
          value={waiting}
          sub={waiting > 0 ? t("stats.actionNeeded") : t("stats.nothingPending")}
          icon={Clock}
          accent={
            waiting > 0
              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          }
        />
        <StatCard label={t("stats.resolved")} value={resolved} icon={CheckCircle2} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <QuickAction href="/tickets" icon={Plus} label={t("quickActions.openSupportTicket")} />
        <QuickAction href="/faq" icon={LifeBuoy} label={t("quickActions.browseHelpCenter")} />
      </div>

      <Panel
        title={t("panels.yourRecentTickets")}
        subtitle={t("panels.latestActivity")}
        action={
          <Link href="/tickets" className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
            {t("panels.viewAll")} <ArrowRight size={14} />
          </Link>
        }
      >
        {myTicketsQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-400">
            <Loader2 size={18} className="animate-spin" /> {t("panels.loadingTickets")}
          </div>
        ) : recent.length === 0 ? (
          <div className="py-12 text-center">
            <TicketCheck size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">{t("panels.noTicketsYet")}</p>
            <Link href="/tickets" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              {t("panels.openFirstTicket")} <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recent.map((tk) => (
              <li key={tk.id}>
                <Link href="/tickets" className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <span className="font-mono text-xs text-slate-400 dark:text-slate-500">#{tk.number}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{tk.subject}</span>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", STATUS_STYLES[tk.status])}>
                    {TICKET_STATUS_LABELS[tk.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export function Dashboard() {
  const { user } = useAuth();
  const t = useTranslations("dashboard");
  const role = user?.role;
  const isCustomer = role === "Customer";
  const isAdmin = role === "Admin" || role === "Administrator";

  const greetingName = user?.firstName || user?.username || t("there");

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("greeting", { name: greetingName })}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isCustomer
                ? t("subtitleCustomer")
                : t("subtitleStaff")}
            </p>
          </div>
          {role && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              <Award size={13} />
              {role}
            </span>
          )}
        </div>

        {isCustomer ? <CustomerDashboard /> : <StaffDashboard isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
