"use client";

import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  ShieldAlert,
  Timer,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useAutomations } from "@/features/automations/hooks/useAutomations";
import {
  ACTION_LABELS,
  ActionType,
  actionSummary,
  AutomationRule,
  AutomationRun,
  ConditionOperator,
  CrmEvent,
  EVENT_FIELD_HINTS,
  EVENT_LABELS,
  OPERATOR_LABELS,
  RuleAction,
  RuleCondition,
  RuleKind,
  RunStatus,
  SlaEntity,
} from "@/features/automations/types";
import { teamApi } from "@/features/teams/services/teamApi";
import { userApi } from "@/features/users/services/userApi";
import { staffDisplayName } from "@/features/users/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ── Form state (dynamic arrays → plain state, backend validates hard rules) ──

interface RuleFormState {
  name: string;
  description: string;
  kind: RuleKind;
  isActive: boolean;
  triggerEvent: CrmEvent;
  slaEntity: SlaEntity;
  slaIdleHours: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

const emptyForm: RuleFormState = {
  name: "",
  description: "",
  kind: "trigger",
  isActive: true,
  triggerEvent: "lead.status_changed",
  slaEntity: "lead",
  slaIdleHours: "48",
  conditions: [],
  actions: [{ type: "create_task", taskSubject: "", taskDueInDays: 1, taskPriority: "normal" }],
};

function defaultAction(type: ActionType): RuleAction {
  switch (type) {
    case "create_task":
      return { type, taskSubject: "", taskDueInDays: 1, taskPriority: "normal" };
    case "send_email":
      return { type, emailTo: "record", emailSubject: "", emailBody: "" };
    case "assign_record":
      return { type, assignToId: "", assignTeamId: "" };
    case "call_webhook":
      return { type, webhookUrl: "" };
  }
}

// ── Presentational helpers ────────────────────────────────────────────────────

const runStatusStyles: Record<RunStatus, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  partial: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  failed: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
};

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", accent)}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 dark:disabled:bg-slate-800/50 disabled:text-gray-500 dark:disabled:text-slate-400";

// ── Page ──────────────────────────────────────────────────────────────────────

export function AutomationsPage() {
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const [runsPage, setRunsPage] = useState(1);
  const [runsRuleId, setRunsRuleId] = useState<string | undefined>(undefined);

  const {
    rulesQuery,
    statsQuery,
    runsQuery,
    createRuleMutation,
    updateRuleMutation,
    deleteRuleMutation,
  } = useAutomations({ limit: 100 }, { page: runsPage, limit: 10, ruleId: runsRuleId });

  const rules = rulesQuery.data?.data ?? [];
  const stats = statsQuery.data;
  const runs = runsQuery.data?.data ?? [];
  const runsMeta = runsQuery.data?.meta;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<AutomationRule | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [form, setForm] = useState<RuleFormState>(emptyForm);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const isSaving = createRuleMutation.isPending || updateRuleMutation.isPending;

  // Pickers for the assign_record action — fetched while the form is open
  const staffQuery = useQuery({
    queryKey: ["users", "staff"],
    queryFn: () => userApi.getStaff(),
    enabled: formOpen,
  });
  const teamsQuery = useQuery({
    queryKey: ["teams", "list", { limit: 100, isActive: true }],
    queryFn: () => teamApi.getAll({ limit: 100, isActive: true }),
    enabled: formOpen,
  });

  const fieldHints = useMemo(
    () =>
      form.kind === "trigger"
        ? (EVENT_FIELD_HINTS[form.triggerEvent] ?? [])
        : form.slaEntity === "lead"
          ? ["status", "source", "score", "idleHours"]
          : form.slaEntity === "ticket"
            ? ["status", "priority", "type", "idleHours"]
            : ["stage", "amount", "idleHours"],
    [form.kind, form.triggerEvent, form.slaEntity],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditingRule(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (rule: AutomationRule) => {
    setForm({
      name: rule.name,
      description: rule.description ?? "",
      kind: rule.kind,
      isActive: rule.isActive,
      triggerEvent: rule.triggerEvent ?? "lead.status_changed",
      slaEntity: rule.slaEntity ?? "lead",
      slaIdleHours: String(rule.slaIdleHours ?? 48),
      conditions: rule.conditions.map((c) => ({ ...c })),
      actions: rule.actions.map((a) => ({ ...a })),
    });
    setEditingRule(rule);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingRule(null);
    setFormError(null);
  };

  const patchAction = (index: number, patch: Partial<RuleAction>) => {
    setForm((f) => ({
      ...f,
      actions: f.actions.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  const patchCondition = (index: number, patch: Partial<RuleCondition>) => {
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!form.name.trim()) {
      setFormError("Give the rule a name.");
      return;
    }
    if (form.actions.length === 0) {
      setFormError("Add at least one action.");
      return;
    }
    if (form.conditions.some((c) => !c.field.trim() || !c.value.trim())) {
      setFormError("Every condition needs a field and a value (or remove the empty row).");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      ...(form.kind === "trigger"
        ? { triggerEvent: form.triggerEvent }
        : { slaEntity: form.slaEntity, slaIdleHours: Number(form.slaIdleHours) || 48 }),
      conditions: form.conditions,
      actions: form.actions.map((a) => ({
        ...a,
        // Empty strings from the pickers must not reach the validator
        assignToId: a.assignToId || undefined,
        assignTeamId: a.assignTeamId || undefined,
        emailAddress: a.emailAddress || undefined,
        taskDueInDays:
          a.taskDueInDays === undefined || a.taskDueInDays === null
            ? undefined
            : Number(a.taskDueInDays),
      })),
    };

    try {
      if (editingRule) {
        await updateRuleMutation.mutateAsync({ id: editingRule.id, data: payload });
        notifySuccess(`Rule "${form.name}" updated.`);
      } else {
        await createRuleMutation.mutateAsync({ ...payload, kind: form.kind });
        notifySuccess(`Rule "${form.name}" created and ${form.isActive ? "active" : "created as inactive"}.`);
      }
      setFormOpen(false);
      setEditingRule(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save rule");
    }
  };

  const toggleActive = async (rule: AutomationRule) => {
    try {
      await updateRuleMutation.mutateAsync({
        id: rule.id,
        data: { isActive: !rule.isActive },
      });
      notifySuccess(`Rule "${rule.name}" ${rule.isActive ? "paused" : "activated"}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to toggle rule");
    }
  };

  const handleDelete = async () => {
    if (!deletingRule) return;
    try {
      await deleteRuleMutation.mutateAsync(deletingRule.id);
      notifySuccess(`Rule "${deletingRule.name}" deleted.`);
      setDeletingRule(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete rule");
      setDeletingRule(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (!isStaffAdmin) {
    return (
      <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 flex flex-col items-center text-center gap-3">
            <ShieldAlert size={40} className="text-gray-300 dark:text-slate-600" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Admins only</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Automation rules change data and send emails automatically, so configuring them is
              restricted to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Automation & Workflows</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Trigger-based actions and SLA escalations — less manual busywork.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
            <Plus size={18} />
            New Rule
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Rules" value={stats?.totalRules} icon={Zap} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard label="Active" value={stats?.activeRules} icon={Play} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
          <StatCard label="Triggers" value={stats?.triggerRules} icon={Zap} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
          <StatCard label="SLA Rules" value={stats?.slaRules} icon={Timer} accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" />
          <StatCard label="Runs (24h)" value={stats?.runsLast24h} icon={Clock} accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
          <StatCard label="Failed (24h)" value={stats?.failedRunsLast24h} icon={AlertCircle} accent="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || rulesQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (rulesQuery.error instanceof Error ? rulesQuery.error.message : "Failed to load rules")}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (rulesQuery.isError) rulesQuery.refetch();
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Rules table */}
        <Card className="py-0 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                  {["Rule", "When", "Then", "Runs", "Last Run", "Status", ""].map((h) => (
                    <TableHead
                      key={h}
                      className={cn(
                        "px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400",
                        h === "" && "text-right",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Fetching rules...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <Zap size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">No automation rules yet</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500 max-w-md">
                          Try: &quot;When a lead status changes to qualified → create a follow-up task and
                          send a welcome email&quot;, or an SLA rule escalating leads idle for 48 hours.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule) => (
                    <TableRow key={rule.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col min-w-0 max-w-[260px]">
                          <span className="font-semibold text-gray-900 dark:text-white truncate">{rule.name}</span>
                          {rule.description && (
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate">{rule.description}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {rule.kind === "trigger" ? (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30 font-semibold gap-1">
                            <Zap size={11} />
                            {rule.triggerEvent ? EVENT_LABELS[rule.triggerEvent] : "—"}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30 font-semibold gap-1">
                            <Timer size={11} />
                            {rule.slaEntity} idle {rule.slaIdleHours}h
                          </Badge>
                        )}
                        {rule.conditions.length > 0 && (
                          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                            +{rule.conditions.length} condition{rule.conditions.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col gap-0.5">
                          {rule.actions.map((a, i) => (
                            <span key={i} className="text-xs text-gray-600 dark:text-slate-300 truncate max-w-[220px]">
                              {actionSummary(a)}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-slate-200">
                        {rule.runCount}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                        {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : "Never"}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleActive(rule)}
                          disabled={updateRuleMutation.isPending}
                          className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                            rule.isActive ? "bg-emerald-500" : "bg-gray-300 dark:bg-slate-700",
                          )}
                          title={rule.isActive ? "Active — click to pause" : "Paused — click to activate"}
                        >
                          <span
                            className={cn(
                              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                              rule.isActive ? "translate-x-4.5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200">
                              <MoreHorizontal size={18} />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(rule)}>
                              <Pencil size={15} /> Edit rule
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setRunsRuleId(rule.id);
                                setRunsPage(1);
                              }}
                            >
                              <Info size={15} /> Show its runs
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setDeletingRule(rule)}>
                              <Trash2 size={15} /> Delete rule
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Execution log */}
        <Card className="py-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 dark:text-white">Execution Log</h2>
              {runsQuery.isFetching && <Loader2 size={14} className="animate-spin text-gray-400 dark:text-slate-500" />}
            </div>
            {runsRuleId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRunsRuleId(undefined);
                  setRunsPage(1);
                }}
              >
                <X size={14} /> Clear rule filter
              </Button>
            )}
          </div>

          {runs.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-400 dark:text-slate-500">
              No runs yet — the log fills up as rules fire.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {runs.map((run: AutomationRun) => (
                <li key={run.id} className="px-6 py-3">
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 text-left"
                    onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                  >
                    <Badge variant="outline" className={cn("font-semibold shrink-0 capitalize", runStatusStyles[run.status])}>
                      {run.status}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {run.ruleName}
                        <span className="text-gray-400 dark:text-slate-500 font-normal"> · {run.event}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {run.recordType}
                        {run.recordName ? `: ${run.recordName}` : ""} ·{" "}
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {expandedRun === run.id ? (
                      <ChevronUp size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                    )}
                  </button>
                  {expandedRun === run.id && (
                    <div className="mt-2 ml-1 bg-gray-50/75 border border-gray-100 dark:bg-slate-800/50 dark:border-slate-800 rounded-lg p-3 space-y-1">
                      {run.logs.map((log, i) => (
                        <p key={i} className="text-xs font-mono text-gray-600 dark:text-slate-300 break-all">
                          {log}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {runsMeta && runsMeta.total > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <span>
                {(runsMeta.page - 1) * runsMeta.limit + 1}–
                {Math.min(runsMeta.page * runsMeta.limit, runsMeta.total)} of {runsMeta.total} runs
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRunsPage((p) => Math.max(p - 1, 1))}
                  disabled={runsPage <= 1}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="px-3 text-sm font-bold text-gray-700 dark:text-slate-200">
                  {runsMeta.page} / {runsMeta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setRunsPage((p) => Math.min(p + 1, runsMeta.totalPages))}
                  disabled={runsPage >= runsMeta.totalPages}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "New Automation Rule"}</DialogTitle>
            <DialogDescription>
              {form.kind === "trigger"
                ? "When the selected event happens and all conditions match, the actions run."
                : "Records idle longer than the threshold are escalated with the actions below (checked every few minutes)."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Rule Name *
                </label>
                <Input
                  placeholder="Qualified lead welcome"
                  disabled={isSaving}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Kind
                </label>
                <select
                  className={inputClasses}
                  disabled={isSaving || !!editingRule}
                  value={form.kind}
                  onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as RuleKind }))}
                >
                  <option value="trigger">Trigger (react to an event)</option>
                  <option value="sla">SLA (escalate idle records)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Description
              </label>
              <Input
                placeholder="What is this rule for?"
                disabled={isSaving}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* When */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">When</p>
              {form.kind === "trigger" ? (
                <select
                  className={inputClasses}
                  disabled={isSaving}
                  value={form.triggerEvent}
                  onChange={(e) => setForm((f) => ({ ...f, triggerEvent: e.target.value as CrmEvent }))}
                >
                  {Object.entries(EVENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <select
                    className={inputClasses}
                    disabled={isSaving}
                    value={form.slaEntity}
                    onChange={(e) => setForm((f) => ({ ...f, slaEntity: e.target.value as SlaEntity }))}
                  >
                    <option value="lead">Open leads</option>
                    <option value="opportunity">Open deals</option>
                    <option value="ticket">Active tickets (response-time SLA)</option>
                  </select>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      disabled={isSaving}
                      value={form.slaIdleHours}
                      onChange={(e) => setForm((f) => ({ ...f, slaIdleHours: e.target.value }))}
                    />
                    <span className="text-sm text-gray-500 dark:text-slate-400 whitespace-nowrap">hours idle</span>
                  </div>
                </div>
              )}

              {/* Conditions */}
              <div className="space-y-2">
                {form.conditions.map((condition, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      className="flex-1"
                      placeholder="field (e.g. newStatus)"
                      disabled={isSaving}
                      value={condition.field}
                      onChange={(e) => patchCondition(i, { field: e.target.value })}
                    />
                    <select
                      className={cn(inputClasses, "w-auto")}
                      disabled={isSaving}
                      value={condition.operator}
                      onChange={(e) =>
                        patchCondition(i, { operator: e.target.value as ConditionOperator })
                      }
                    >
                      {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Input
                      className="flex-1"
                      placeholder="value"
                      disabled={isSaving}
                      value={condition.value}
                      onChange={(e) => patchCondition(i, { value: e.target.value })}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 shrink-0"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          conditions: f.conditions.filter((_, idx) => idx !== i),
                        }))
                      }
                    >
                      <X size={15} />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSaving || form.conditions.length >= 10}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        conditions: [...f.conditions, { field: "", operator: "equals", value: "" }],
                      }))
                    }
                  >
                    <Plus size={14} /> Add condition
                  </Button>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">
                    Fields: {fieldHints.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {/* Then */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Then</p>
              {form.actions.map((action, i) => (
                <div key={i} className="bg-white border border-gray-100 dark:bg-slate-900 dark:border-slate-800 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      className={cn(inputClasses, "flex-1")}
                      disabled={isSaving}
                      value={action.type}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          actions: f.actions.map((a, idx) =>
                            idx === i ? defaultAction(e.target.value as ActionType) : a,
                          ),
                        }))
                      }
                    >
                      {Object.entries(ACTION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 shrink-0"
                      disabled={form.actions.length <= 1}
                      onClick={() =>
                        setForm((f) => ({ ...f, actions: f.actions.filter((_, idx) => idx !== i) }))
                      }
                    >
                      <X size={15} />
                    </Button>
                  </div>

                  {action.type === "create_task" && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input
                        className="sm:col-span-3"
                        placeholder="Task subject * — supports {{firstName}}, {{name}}, ..."
                        disabled={isSaving}
                        value={action.taskSubject ?? ""}
                        onChange={(e) => patchAction(i, { taskSubject: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={365}
                          disabled={isSaving}
                          value={action.taskDueInDays ?? 1}
                          onChange={(e) =>
                            patchAction(i, { taskDueInDays: Number(e.target.value) })
                          }
                        />
                        <span className="text-xs text-gray-500 dark:text-slate-400 whitespace-nowrap">days due</span>
                      </div>
                      <select
                        className={inputClasses}
                        disabled={isSaving}
                        value={action.taskPriority ?? "normal"}
                        onChange={(e) =>
                          patchAction(i, {
                            taskPriority: e.target.value as "low" | "normal" | "high",
                          })
                        }
                      >
                        <option value="low">Low priority</option>
                        <option value="normal">Normal priority</option>
                        <option value="high">High priority</option>
                      </select>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 self-center">
                        Assigned to the record&apos;s owner automatically.
                      </p>
                    </div>
                  )}

                  {action.type === "send_email" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          className={inputClasses}
                          disabled={isSaving}
                          value={action.emailTo ?? "record"}
                          onChange={(e) =>
                            patchAction(i, { emailTo: e.target.value as "record" | "owner" | "custom" })
                          }
                        >
                          <option value="record">To the record&apos;s email</option>
                          <option value="owner">To the record owner (staff)</option>
                          <option value="custom">To a custom address</option>
                        </select>
                        {action.emailTo === "custom" && (
                          <Input
                            type="email"
                            placeholder="someone@example.com"
                            disabled={isSaving}
                            value={action.emailAddress ?? ""}
                            onChange={(e) => patchAction(i, { emailAddress: e.target.value })}
                          />
                        )}
                      </div>
                      <Input
                        placeholder="Email subject * — e.g. Welcome, {{firstName}}!"
                        disabled={isSaving}
                        value={action.emailSubject ?? ""}
                        onChange={(e) => patchAction(i, { emailSubject: e.target.value })}
                      />
                      <textarea
                        rows={3}
                        className={cn(inputClasses, "resize-none")}
                        placeholder={"Email body * — placeholders like {{firstName}}, {{company}}, {{status}} are filled from the record."}
                        disabled={isSaving}
                        value={action.emailBody ?? ""}
                        onChange={(e) => patchAction(i, { emailBody: e.target.value })}
                      />
                    </div>
                  )}

                  {action.type === "assign_record" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <select
                        className={inputClasses}
                        disabled={isSaving || staffQuery.isLoading}
                        value={action.assignToId ?? ""}
                        onChange={(e) => patchAction(i, { assignToId: e.target.value })}
                      >
                        <option value="">Owner unchanged</option>
                        {(staffQuery.data ?? []).map((s) => (
                          <option key={s.keycloakId} value={s.keycloakId}>
                            {staffDisplayName(s)} ({s.role})
                          </option>
                        ))}
                      </select>
                      <select
                        className={inputClasses}
                        disabled={isSaving || teamsQuery.isLoading}
                        value={action.assignTeamId ?? ""}
                        onChange={(e) => patchAction(i, { assignTeamId: e.target.value })}
                      >
                        <option value="">Team unchanged</option>
                        {(teamsQuery.data?.data ?? []).map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {action.type === "call_webhook" && (
                    <Input
                      placeholder="https://example.com/hooks/crm — receives a JSON POST"
                      disabled={isSaving}
                      value={action.webhookUrl ?? ""}
                      onChange={(e) => patchAction(i, { webhookUrl: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || form.actions.length >= 5}
                onClick={() =>
                  setForm((f) => ({ ...f, actions: [...f.actions, defaultAction("create_task")] }))
                }
              >
                <Plus size={14} /> Add action
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#3F51B5]"
                disabled={isSaving}
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Rule is active
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {editingRule ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingRule} onOpenChange={(open) => !open && setDeletingRule(null)}>
        <DialogContent className="max-w-md">
          {deletingRule && (
            <>
              <DialogHeader>
                <DialogTitle>Delete rule?</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">{deletingRule.name}</span>. Its past
                  runs stay in the execution log. Consider pausing instead if you might need it again.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingRule(null)}
                  disabled={deleteRuleMutation.isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteRuleMutation.isPending}>
                  {deleteRuleMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Delete Rule
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
