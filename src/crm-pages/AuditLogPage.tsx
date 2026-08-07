"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  History,
  Loader2,
  Search,
  ShieldAlert,
} from "lucide-react";
import { useAuditLog } from "@/features/audit-log/hooks/useAuditLog";
import {
  ACTION_LABELS,
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
  ENTITY_TYPE_LABELS,
} from "@/features/audit-log/types";
import { useAuth } from "@/providers/keycloak-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all";

const actionStyles: Record<AuditAction, string> = {
  create:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  update:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  delete:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  assign:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  status_change:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  stage_change:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  convert:
    "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
  invite_sent:
    "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
  login_success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  login_failed:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  password_reset_requested:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  password_reset_completed:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function ExpandedEntry({ entry }: { entry: AuditLogEntry }) {
  const hasChanges = entry.changes.length > 0;
  const metadataEntries = entry.metadata ? Object.entries(entry.metadata) : [];

  if (!hasChanges && metadataEntries.length === 0) {
    return (
      <p className="text-xs text-gray-400 dark:text-slate-500">
        No field-level detail was recorded for this entry.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasChanges && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 dark:text-slate-500 uppercase tracking-wider">
              <th className="text-left font-semibold pb-1 pr-3">Field</th>
              <th className="text-left font-semibold pb-1 pr-3">From</th>
              <th className="text-left font-semibold pb-1">To</th>
            </tr>
          </thead>
          <tbody>
            {entry.changes.map((change) => (
              <tr key={change.field} className="border-t border-gray-100 dark:border-slate-800">
                <td className="py-1.5 pr-3 font-medium text-gray-700 dark:text-slate-200 whitespace-nowrap">
                  {change.field}
                </td>
                <td className="py-1.5 pr-3 text-gray-500 dark:text-slate-400 break-all">
                  {formatValue(change.from)}
                </td>
                <td className="py-1.5 text-gray-700 dark:text-slate-200 break-all">
                  {formatValue(change.to)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {metadataEntries.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {metadataEntries.map(([key, value]) => `${key}: ${formatValue(value)}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

export function AuditLogPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<AuditEntityType | "">("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { listQuery } = useAuditLog({
    page,
    limit: 25,
    search: search.trim() || undefined,
    entityType: entityType || undefined,
    action: action || undefined,
  });

  const entries = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <ShieldAlert size={28} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
          <p className="font-semibold text-gray-700 dark:text-slate-200">Admin access required</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            The audit trail is visible to Admins and Administrators only.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <History size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Who changed what, and when — across every module.
          </p>
        </div>
      </div>

      <Card className="py-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500"
            />
            <Input
              className="pl-9"
              placeholder="Search by record, person, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            className={cn(inputClasses, "w-auto")}
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as AuditEntityType | "");
              setPage(1);
            }}
          >
            <option value="">All modules</option>
            {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={cn(inputClasses, "w-auto")}
            value={action}
            onChange={(e) => {
              setAction(e.target.value as AuditAction | "");
              setPage(1);
            }}
          >
            <option value="">All actions</option>
            {Object.entries(ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {listQuery.isFetching && (
            <Loader2 size={14} className="animate-spin text-gray-400 dark:text-slate-500" />
          )}
        </div>

        {entries.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400 dark:text-slate-500">
            {listQuery.isLoading ? "Loading…" : "No audit entries match these filters."}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-slate-800">
            {entries.map((entry) => (
              <li key={entry.id} className="px-6 py-3">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 text-left"
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                >
                  <Badge
                    variant="outline"
                    className={cn("font-semibold shrink-0 whitespace-nowrap", actionStyles[entry.action])}
                  >
                    {ACTION_LABELS[entry.action]}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {entry.summary}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {ENTITY_TYPE_LABELS[entry.entityType]} · {entry.actorName ?? "System"} ·{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {expanded === entry.id ? (
                    <ChevronUp size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                  )}
                </button>
                {expanded === entry.id && (
                  <div className="mt-2 ml-1 bg-gray-50/75 border border-gray-100 dark:bg-slate-800/50 dark:border-slate-800 rounded-lg p-3">
                    <ExpandedEntry entry={entry} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {meta && meta.total > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            <span>
              {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
              {meta.total} entries
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="px-3 text-sm font-bold text-gray-700 dark:text-slate-200">
                {meta.page} / {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage((p) => Math.min(p + 1, meta.totalPages))}
                disabled={page >= meta.totalPages}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
