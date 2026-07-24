"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Award,
  BadgeDollarSign,
  Loader2,
  Percent,
  Scale,
  Target,
  TicketCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  DashboardResponse,
  RepPerformance,
  STAGE_LABELS,
  TeamPerformanceResponse,
} from "../types";
import { useDashboard, useTeamPerformance } from "../hooks/useReports";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const STAGE_COLORS: Record<string, string> = {
  discovery: "#38bdf8",
  proposal: "#6366f1",
  negotiation: "#f59e0b",
  closed_won: "#10b981",
  closed_lost: "#ef4444",
};

const SOURCE_COLORS = [
  "#3F51B5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#0ea5e9",
];

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
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 flex items-center gap-3">
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
          accent,
        )}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 flex flex-col", className)}>
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-800 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 dark:text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function RepLeaderboard({ reps }: { reps: RepPerformance[] }) {
  const max = Math.max(1, ...reps.map((r) => r.wonValue));
  if (reps.length === 0) {
    return (
      <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
        No closed-won deals yet.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {reps.map((rep, i) => (
        <div key={rep.ownerId} className="flex items-center gap-3">
          <span
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0",
              i === 0
                ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                : i === 1
                  ? "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                  : i === 2
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                    : "bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400",
            )}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                {rep.ownerName}
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white shrink-0">
                {currency.format(rep.wonValue)}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3F51B5] rounded-full"
                style={{ width: `${(rep.wonValue / max) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
              {rep.wonCount} won · {rep.winRate}% win rate · {rep.openCount} open
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsAnalytics() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "#1e293b" : "#eef2f7";
  const tickFill = dark ? "#64748b" : "#94a3b8";
  const tooltipStyle = {
    borderRadius: 8,
    border: dark ? "1px solid #1e293b" : "1px solid #e2e8f0",
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };
  const tooltipText = { color: tooltipStyle.color };

  const dashboardQuery = useDashboard();
  const teamQuery = useTeamPerformance();

  const data: DashboardResponse | undefined = dashboardQuery.data;
  const team: TeamPerformanceResponse | undefined = teamQuery.data;

  if (dashboardQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-24">
        <Loader2 size={20} className="animate-spin" />
        <span>Loading analytics…</span>
      </div>
    );
  }

  if (dashboardQuery.isError || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 rounded-xl p-4 text-sm">
        Failed to load analytics.{" "}
        <button className="underline" onClick={() => dashboardQuery.refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const revenueData = data.revenueByMonth.map((r) => ({
    ...r,
    label: r.month.slice(2), // YY-MM
  }));

  const pipelineData = data.pipeline.byStage.map((b) => ({
    stage: STAGE_LABELS[b.stage],
    key: b.stage,
    value: b.totalAmount,
    count: b.count,
  }));

  const sourceData = data.leadsBySource;

  const funnelSteps = [
    { label: "New", value: data.funnel.new, color: "#38bdf8" },
    { label: "Contacted", value: data.funnel.contacted, color: "#6366f1" },
    { label: "Qualified", value: data.funnel.qualified, color: "#8b5cf6" },
    { label: "Converted", value: data.funnel.converted, color: "#10b981" },
  ];
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Pipeline Value"
          value={compactCurrency.format(data.pipeline.openValue)}
          sub={`${data.pipeline.openCount} open deals`}
          icon={BadgeDollarSign}
          accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300"
        />
        <StatCard
          label="Weighted Forecast"
          value={compactCurrency.format(data.pipeline.weightedValue)}
          icon={Scale}
          accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <StatCard
          label="Won This Month"
          value={compactCurrency.format(data.pipeline.wonThisMonthValue)}
          sub={`${data.pipeline.wonThisMonthCount} deals`}
          icon={Award}
          accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        />
        <StatCard
          label="Win Rate"
          value={`${data.pipeline.winRate}%`}
          icon={TrendingUp}
          accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
        />
        <StatCard
          label="Lead Conversion"
          value={`${data.funnel.conversionRate}%`}
          sub={`${data.funnel.totalLeads} leads`}
          icon={Percent}
          accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
        />
        <StatCard
          label="Customers"
          value={data.totals.customers}
          sub={`${data.totals.activeCustomers} active`}
          icon={Users}
          accent="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
        />
      </div>

      {/* Secondary totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Open Tickets"
          value={data.totals.openTickets}
          icon={TicketCheck}
          accent="bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
        />
        <StatCard
          label="Pending Tasks"
          value={data.totals.pendingTasks}
          icon={Activity}
          accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
        />
        <StatCard
          label="Overdue Tasks"
          value={data.totals.overdueTasks}
          icon={AlertTriangle}
          accent="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        />
        <StatCard
          label="Qualified Leads"
          value={data.funnel.qualified}
          icon={Target}
          accent="bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400"
        />
      </div>

      {/* Revenue trend */}
      <ChartCard
        title="Revenue (Closed Won)"
        subtitle="Trailing 12 months"
        className="h-[340px]"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: tickFill, fontSize: 12 }}
              tickFormatter={(v: number) => compactCurrency.format(v)}
            />
            <Tooltip
              formatter={(v: number) => currency.format(v)}
              contentStyle={tooltipStyle}
              itemStyle={tooltipText}
              labelStyle={tooltipText}
            />
            <Line type="monotone" dataKey="wonValue" name="Won Revenue" stroke="#3F51B5" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by stage */}
        <ChartCard title="Pipeline by Stage" subtitle="Deal value per stage" className="h-[340px] lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
              <XAxis dataKey="stage" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: tickFill, fontSize: 12 }}
                tickFormatter={(v: number) => compactCurrency.format(v)}
              />
              <Tooltip
                formatter={(v: number) => currency.format(v)}
                cursor={{ fill: dark ? "#1e293b" : "#F4F5F7" }}
                contentStyle={tooltipStyle}
                itemStyle={tooltipText}
                labelStyle={tooltipText}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                {pipelineData.map((d) => (
                  <Cell key={d.key} fill={STAGE_COLORS[d.key] ?? "#3F51B5"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lead source */}
        <ChartCard title="Leads by Source" subtitle="Where leads come from" className="h-[340px]">
          {sourceData.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">No leads yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {sourceData.map((s, i) => (
                    <Cell key={s.key} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} stroke={dark ? "#0f172a" : "#ffffff"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipText} labelStyle={tooltipText} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion funnel */}
        <ChartCard title="Lead Funnel" subtitle="From capture to conversion">
          <div className="space-y-4 py-2">
            {funnelSteps.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700 dark:text-slate-200">{step.label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{step.value}</span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(step.value / funnelMax) * 100}%`, backgroundColor: step.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Rep leaderboard */}
        <ChartCard title="Top Performers" subtitle="Reps by closed-won value">
          <RepLeaderboard reps={data.topReps} />
        </ChartCard>
      </div>

      {/* Team rollup */}
      <ChartCard title="Team Performance" subtitle="Won vs open value by team">
        {teamQuery.isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500 py-8 justify-center">
            <Loader2 size={18} className="animate-spin" /> Loading teams…
          </div>
        ) : !team || team.teams.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">
            No team-assigned deals yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <th className="py-2 pr-4 font-semibold">Team</th>
                  <th className="py-2 px-4 font-semibold text-right">Members</th>
                  <th className="py-2 px-4 font-semibold text-right">Won</th>
                  <th className="py-2 px-4 font-semibold text-right">Won Value</th>
                  <th className="py-2 px-4 font-semibold text-right">Open Value</th>
                  <th className="py-2 pl-4 font-semibold text-right">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {team.teams.map((t) => (
                  <tr key={t.teamId} className="border-b border-gray-50 dark:border-slate-800/60 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-slate-200">{t.teamName}</td>
                    <td className="py-2.5 px-4 text-right text-gray-500 dark:text-slate-400">{t.memberCount}</td>
                    <td className="py-2.5 px-4 text-right text-gray-600 dark:text-slate-300">{t.wonCount}</td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {currency.format(t.wonValue)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-gray-600 dark:text-slate-300">
                      {currency.format(t.openValue)}
                    </td>
                    <td className="py-2.5 pl-4 text-right font-semibold text-gray-800 dark:text-slate-200">{t.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
