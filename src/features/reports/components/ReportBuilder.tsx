"use client";

import React, { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  BarChart3,
  Bookmark,
  Check,
  Download,
  Loader2,
  Plus,
  Play,
  Save,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { downloadBlob } from "@/features/import-export/downloadBlob";
import { useDatasets, useSavedReports } from "../hooks/useReports";
import { reportResultToCsv } from "../reportCsv";
import {
  CreateSavedReportRequest,
  METRIC_LABELS,
  OPERATOR_LABELS,
  ReportDataset,
  ReportField,
  ReportMetricFn,
  ReportOperator,
  ReportResult,
  RunReportRequest,
  SavedReport,
} from "../types";
import { useAuth } from "@/providers/keycloak-provider";
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 dark:disabled:bg-slate-800";

const numberFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const BAR_COLORS = ["#3F51B5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#0ea5e9"];

let rowSeq = 0;
const nextId = () => `r${rowSeq++}`;

interface FilterRow {
  id: string;
  field: string;
  operator: ReportOperator;
  value: string;
  value2: string;
}

interface MetricRow {
  id: string;
  fn: ReportMetricFn;
  field: string;
}

type BuilderMode = "rows" | "aggregate";

function fieldByKey(dataset: ReportDataset | undefined, key: string): ReportField | undefined {
  return dataset?.fields.find((f) => f.key === key);
}

/** Encode a filter row into the API value shape, or null to skip it. */
function encodeFilter(
  row: FilterRow,
): { field: string; operator: ReportOperator; value?: unknown } | null {
  if (!row.field) return null;
  if (row.operator === "exists") {
    return { field: row.field, operator: row.operator, value: row.value === "true" };
  }
  if (row.operator === "between") {
    if (!row.value || !row.value2) return null;
    return { field: row.field, operator: row.operator, value: [row.value, row.value2] };
  }
  if (row.operator === "in" || row.operator === "nin") {
    const list = row.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return null;
    return { field: row.field, operator: row.operator, value: list };
  }
  if (row.value === "") return null;
  return { field: row.field, operator: row.operator, value: row.value };
}

export function ReportBuilder() {
  const t = useTranslations("reports.builder");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const canShare = user?.role === "Admin" || user?.role === "Administrator";

  const datasetsQuery = useDatasets();
  const registry = datasetsQuery.data;
  const {
    savedQuery,
    runReportMutation,
    createSavedMutation,
    updateSavedMutation,
    deleteSavedMutation,
  } = useSavedReports();

  const [datasetKey, setDatasetKey] = useState("opportunities");
  const [mode, setMode] = useState<BuilderMode>("rows");
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [dateField, setDateField] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [granularity, setGranularity] = useState("month");
  const [metrics, setMetrics] = useState<MetricRow[]>([{ id: nextId(), fn: "count", field: "" }]);
  const [columns, setColumns] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<ReportResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [editingSavedId, setEditingSavedId] = useState<string | null>(null);
  const [loadedName, setLoadedName] = useState<string | null>(null);

  // Save dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saveShared, setSaveShared] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const dataset = useMemo(
    () => registry?.datasets.find((d) => d.key === datasetKey),
    [registry, datasetKey],
  );

  const lastRequestRef = useRef<RunReportRequest | null>(null);

  const resetForDataset = (key: string) => {
    setDatasetKey(key);
    setFilters([]);
    setDateField("");
    setDateFrom("");
    setDateTo("");
    setGroupBy("");
    setMetrics([{ id: nextId(), fn: "count", field: "" }]);
    setColumns([]);
    setSortBy("");
    setResult(null);
    setEditingSavedId(null);
    setLoadedName(null);
  };

  const buildRequest = (): RunReportRequest => {
    const compiledFilters = filters
      .map(encodeFilter)
      .filter((f): f is NonNullable<ReturnType<typeof encodeFilter>> => f !== null);

    const req: RunReportRequest = { dataset: datasetKey };
    if (compiledFilters.length > 0) req.filters = compiledFilters;
    if (dateFrom || dateTo) {
      req.dateRange = {
        field: dateField || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      };
    }

    if (mode === "aggregate") {
      if (groupBy) {
        req.groupBy = groupBy;
        const gf = fieldByKey(dataset, groupBy);
        if (gf?.type === "date") req.groupByGranularity = granularity as never;
      }
      req.metrics = metrics
        .filter((m) => m.fn === "count" || m.field)
        .map((m) => ({ fn: m.fn, field: m.fn === "count" ? undefined : m.field }));
    } else {
      if (columns.length > 0) req.columns = columns;
      if (sortBy) {
        req.sortBy = sortBy;
        req.sortOrder = sortOrder;
      }
      req.page = page;
      req.limit = 25;
    }
    return req;
  };

  const run = async (overridePage?: number) => {
    setRunError(null);
    const effectivePage = overridePage ?? 1;
    if (overridePage === undefined) setPage(1);
    const req = buildRequest();
    if (mode === "rows") req.page = effectivePage;
    lastRequestRef.current = req;
    try {
      const res = await runReportMutation.mutateAsync(req);
      setResult(res);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : t("errors.runFailed"));
    }
  };

  const goToPage = (p: number) => {
    setPage(p);
    void run(p);
  };

  // ── Load / save ─────────────────────────────────────────────────────────────

  const loadSaved = (report: SavedReport) => {
    setDatasetKey(report.dataset);
    const isAggregate = (report.metrics?.length ?? 0) > 0;
    setMode(isAggregate ? "aggregate" : "rows");
    setFilters(
      (report.filters ?? []).map((f) => {
        let value = "";
        let value2 = "";
        if (f.operator === "between" && Array.isArray(f.value)) {
          value = String(f.value[0] ?? "");
          value2 = String(f.value[1] ?? "");
        } else if ((f.operator === "in" || f.operator === "nin") && Array.isArray(f.value)) {
          value = f.value.map((v) => String(v)).join(", ");
        } else if (f.operator === "exists") {
          value = f.value ? "true" : "false";
        } else {
          value = f.value === undefined || f.value === null ? "" : String(f.value);
        }
        return { id: nextId(), field: f.field, operator: f.operator, value, value2 };
      }),
    );
    setDateField(report.dateRange?.field ?? "");
    setDateFrom(report.dateRange?.from ?? "");
    setDateTo(report.dateRange?.to ?? "");
    setGroupBy(report.groupBy ?? "");
    setGranularity(report.groupByGranularity ?? "month");
    setMetrics(
      isAggregate
        ? report.metrics.map((m) => ({ id: nextId(), fn: m.fn, field: m.field ?? "" }))
        : [{ id: nextId(), fn: "count", field: "" }],
    );
    setColumns(report.columns ?? []);
    setSortBy(report.sortBy ?? "");
    setSortOrder(report.sortOrder ?? "desc");
    setEditingSavedId(report.canManage ? report.id : null);
    setLoadedName(report.name);
    setResult(null);
    setRunError(null);
  };

  const openSave = () => {
    setSaveError(null);
    setSaveOpen(true);
  };

  const submitSave = async () => {
    setSaveError(null);
    if (!saveName.trim()) {
      setSaveError(t("errors.giveName"));
      return;
    }
    const payload: CreateSavedReportRequest = {
      ...buildRequest(),
      name: saveName.trim(),
      description: saveDescription.trim() || undefined,
      shared: saveShared,
    };
    try {
      if (editingSavedId) {
        await updateSavedMutation.mutateAsync({ id: editingSavedId, dto: payload });
        setToast(t("errors.reportUpdated"));
      } else {
        const created = await createSavedMutation.mutateAsync(payload);
        setEditingSavedId(created.canManage ? created.id : null);
        setLoadedName(created.name);
        setToast(t("errors.reportSaved"));
      }
      setSaveOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("errors.saveFailed"));
    }
  };

  const removeSaved = async (report: SavedReport) => {
    try {
      await deleteSavedMutation.mutateAsync(report.id);
      if (editingSavedId === report.id) {
        setEditingSavedId(null);
        setLoadedName(null);
      }
      setToast(t("errors.reportDeleted"));
    } catch (err) {
      setToast(err instanceof Error ? err.message : t("errors.deleteFailed"));
    }
  };

  const prepareSaveDialog = () => {
    setSaveName(loadedName ?? "");
    setSaveDescription("");
    setSaveShared(false);
    openSave();
  };

  // ── Field option helpers ─────────────────────────────────────────────────────

  const groupableFields = dataset?.fields.filter((f) => f.groupable) ?? [];
  const aggregatableFields = dataset?.fields.filter((f) => f.aggregatable) ?? [];
  const dateFields = dataset?.fields.filter((f) => f.type === "date") ?? [];
  const sortableFields = dataset?.fields.filter((f) => f.sortable) ?? [];

  const operatorsFor = (field?: ReportField): ReportOperator[] => {
    if (!field || !registry) return [];
    return registry.operatorsByType[field.type] ?? [];
  };

  const addFilter = () => {
    if (!dataset) return;
    const first = dataset.fields[0];
    const ops = operatorsFor(first);
    setFilters((prev) => [
      ...prev,
      { id: nextId(), field: first.key, operator: ops[0] ?? "eq", value: "", value2: "" },
    ]);
  };

  const updateFilter = (id: string, patch: Partial<FilterRow>) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        // When the field changes, snap the operator to a valid one for its type
        if (patch.field) {
          const ops = operatorsFor(fieldByKey(dataset, patch.field));
          if (!ops.includes(next.operator)) next.operator = ops[0] ?? "eq";
          next.value = "";
          next.value2 = "";
        }
        return next;
      }),
    );
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  };

  const renderValueInput = (row: FilterRow) => {
    const field = fieldByKey(dataset, row.field);
    if (!field || row.operator === "exists") {
      if (row.operator === "exists") {
        return (
          <select
            className={inputClasses}
            value={row.value || "true"}
            onChange={(e) => updateFilter(row.id, { value: e.target.value })}
          >
            <option value="true">{t("existsOption")}</option>
            <option value="false">{t("isEmptyOption")}</option>
          </select>
        );
      }
      return <Input disabled placeholder="—" />;
    }

    if (field.type === "enum" && (row.operator === "eq" || row.operator === "ne")) {
      return (
        <select
          className={inputClasses}
          value={row.value}
          onChange={(e) => updateFilter(row.id, { value: e.target.value })}
        >
          <option value="">{t("selectPlaceholder")}</option>
          {field.enumValues?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    if (row.operator === "in" || row.operator === "nin") {
      return (
        <Input
          placeholder={
            field.type === "enum"
              ? `${field.enumValues?.slice(0, 2).join(", ")}…`
              : t("commaSeparated")
          }
          value={row.value}
          onChange={(e) => updateFilter(row.id, { value: e.target.value })}
        />
      );
    }

    const inputType = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

    if (row.operator === "between") {
      return (
        <div className="flex items-center gap-1">
          <Input
            type={inputType}
            value={row.value}
            onChange={(e) => updateFilter(row.id, { value: e.target.value })}
          />
          <span className="text-gray-400 dark:text-slate-500 text-xs">–</span>
          <Input
            type={inputType}
            value={row.value2}
            onChange={(e) => updateFilter(row.id, { value2: e.target.value })}
          />
        </div>
      );
    }

    return (
      <Input
        type={inputType}
        value={row.value}
        onChange={(e) => updateFilter(row.id, { value: e.target.value })}
      />
    );
  };

  const savedReports = savedQuery.data ?? [];
  const isRunning = runReportMutation.isPending;
  const isSaving = createSavedMutation.isPending || updateSavedMutation.isPending;

  if (datasetsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-24">
        <Loader2 size={20} className="animate-spin" /> {t("loadingBuilder")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
      {/* Saved reports rail */}
      <aside className="space-y-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark size={16} className="text-[#3F51B5]" />
            <h3 className="font-bold text-sm text-gray-800 dark:text-white">{t("savedReports")}</h3>
          </div>
          {savedReports.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-slate-500 py-2">
              {t("noSavedReports")}
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {savedReports.map((r) => (
                <li key={r.id}>
                  <div
                    className={cn(
                      "group flex items-center gap-2 rounded-lg px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer",
                      editingSavedId === r.id && "bg-[#3F51B5]/5 dark:bg-indigo-500/15",
                    )}
                    onClick={() => loadSaved(r)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{r.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 truncate">
                        {r.dataset}
                        {r.shared ? t("shared") : ""}
                      </p>
                    </div>
                    {r.canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeSaved(r);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Builder + results */}
      <div className="space-y-6">
        {toast && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Check size={16} /> {toast}
            </span>
            <button onClick={() => setToast(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 space-y-5">
          {/* Dataset + mode */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("dataset")}
              </label>
              <select
                className={inputClasses}
                value={datasetKey}
                onChange={(e) => resetForDataset(e.target.value)}
              >
                {registry?.datasets.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
              {dataset && <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{dataset.description}</p>}
            </div>
            <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden shrink-0">
              <button
                onClick={() => setMode("rows")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
                  mode === "rows" ? "bg-[#3F51B5] text-white" : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300",
                )}
              >
                <Table2 size={15} /> {t("table")}
              </button>
              <button
                onClick={() => setMode("aggregate")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
                  mode === "aggregate" ? "bg-[#3F51B5] text-white" : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300",
                )}
              >
                <BarChart3 size={15} /> {t("summary")}
              </button>
            </div>
          </div>

          {/* Filters */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {t("filters")}
              </label>
              <Button variant="outline" size="sm" onClick={addFilter} className="gap-1 h-8">
                <Plus size={14} /> {t("addFilter")}
              </Button>
            </div>
            {filters.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">{t("noFilters")}</p>
            ) : (
              <div className="space-y-2">
                {filters.map((row) => {
                  const field = fieldByKey(dataset, row.field);
                  return (
                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1.4fr_auto] gap-2 items-center">
                      <select
                        className={inputClasses}
                        value={row.field}
                        onChange={(e) => updateFilter(row.id, { field: e.target.value })}
                      >
                        {dataset?.fields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className={inputClasses}
                        value={row.operator}
                        onChange={(e) => updateFilter(row.id, { operator: e.target.value as ReportOperator })}
                      >
                        {operatorsFor(field).map((op) => (
                          <option key={op} value={op}>
                            {OPERATOR_LABELS[op]}
                          </option>
                        ))}
                      </select>
                      {renderValueInput(row)}
                      <button
                        onClick={() => setFilters((prev) => prev.filter((f) => f.id !== row.id))}
                        className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 justify-self-center"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Date range */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("dateField")}
              </label>
              <select className={inputClasses} value={dateField} onChange={(e) => setDateField(e.target.value)}>
                <option value="">{dataset ? t("defaultSuffix", { field: dataset.defaultDateField }) : t("default")}</option>
                {dateFields.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t("from")}</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t("to")}</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          {/* Mode-specific config */}
          {mode === "aggregate" ? (
            <div className="space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("groupBy")}
                  </label>
                  <select className={inputClasses} value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                    <option value="">{t("noGrouping")}</option>
                    {groupableFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldByKey(dataset, groupBy)?.type === "date" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("bucket")}
                    </label>
                    <select className={inputClasses} value={granularity} onChange={(e) => setGranularity(e.target.value)}>
                      {registry?.granularities.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("measures")}</label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 h-8"
                    onClick={() => setMetrics((prev) => [...prev, { id: nextId(), fn: "count", field: "" }])}
                  >
                    <Plus size={14} /> {t("addMeasure")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {metrics.map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_1.4fr_auto] gap-2 items-center">
                      <select
                        className={inputClasses}
                        value={m.fn}
                        onChange={(e) =>
                          setMetrics((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, fn: e.target.value as ReportMetricFn } : x)),
                          )
                        }
                      >
                        {registry?.metricFns.map((fn) => (
                          <option key={fn} value={fn}>
                            {METRIC_LABELS[fn]}
                          </option>
                        ))}
                      </select>
                      <select
                        className={inputClasses}
                        disabled={m.fn === "count"}
                        value={m.field}
                        onChange={(e) =>
                          setMetrics((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, field: e.target.value } : x)),
                          )
                        }
                      >
                        <option value="">{m.fn === "count" ? t("rowsOption") : t("selectFieldPlaceholder")}</option>
                        {aggregatableFields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => setMetrics((prev) => prev.filter((x) => x.id !== m.id))}
                        className="text-gray-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 justify-self-center"
                        disabled={metrics.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  {t("columns")}{" "}
                  <span className="text-gray-300 dark:text-slate-600 font-medium normal-case">
                    {t("columnsHint")}
                  </span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {dataset?.fields.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => toggleColumn(f.key)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition",
                        columns.includes(f.key)
                          ? "bg-[#3F51B5] text-white border-[#3F51B5]"
                          : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-[#3F51B5]/40",
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("sortBy")}
                  </label>
                  <select className={inputClasses} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="">{t("defaultOption")}</option>
                    {sortableFields.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("direction")}
                  </label>
                  <select
                    className={inputClasses}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                  >
                    <option value="desc">{t("descending")}</option>
                    <option value="asc">{t("ascending")}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => run()}
              disabled={isRunning}
              className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2"
            >
              {isRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {t("runReport")}
            </Button>
            <Button variant="outline" onClick={prepareSaveDialog} className="gap-2">
              <Save size={16} />
              {editingSavedId ? t("updateSaved") : t("save")}
            </Button>
            {loadedName && (
              <span className="text-xs text-gray-400 dark:text-slate-500 ml-1">
                {t("editing")} <span className="font-medium text-gray-600 dark:text-slate-300">{loadedName}</span>
              </span>
            )}
          </div>

          {runError && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {runError}
            </div>
          )}
        </div>

        {/* Results */}
        {result && <ResultView result={result} onPage={goToPage} />}
      </div>

      {/* Save dialog */}
      <Dialog open={saveOpen} onOpenChange={(open) => !open && setSaveOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSavedId ? t("updateSavedReportTitle") : t("saveReportTitle")}</DialogTitle>
            <DialogDescription>
              {t("saveDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {saveError && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {saveError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t("name")}</label>
              <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder={t("namePlaceholder")} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">{t("description")}</label>
              <textarea
                rows={2}
                className={cn(inputClasses, "resize-none")}
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
              />
            </div>
            {canShare && (
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                <input type="checkbox" checked={saveShared} onChange={(e) => setSaveShared(e.target.checked)} />
                {t("shareWithStaff")}
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)} disabled={isSaving}>
              {tc("cancel")}
            </Button>
            <Button onClick={submitSave} disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
              {isSaving && <Loader2 size={15} className="animate-spin" />}
              {editingSavedId ? t("update") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Result rendering ───────────────────────────────────────────────────────────

function formatCell(value: unknown, yes: string, no: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? yes : no;
  if (typeof value === "string") {
    // ISO date → local date
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
    }
    return value;
  }
  if (typeof value === "number") return numberFmt.format(value);
  return String(value);
}

function ResultView({
  result,
  onPage,
}: {
  result: ReportResult;
  onPage: (page: number) => void;
}) {
  const t = useTranslations("reports.builder.results");
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "#1e293b" : "#eef2f7";
  const tickFill = dark ? "#64748b" : "#94a3b8";
  const tooltipStyle = {
    borderRadius: 8,
    border: `1px solid ${dark ? "#1e293b" : "#e2e8f0"}`,
    background: dark ? "#0f172a" : "#ffffff",
    color: dark ? "#e2e8f0" : "#0f172a",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  if (result.mode === "aggregate") {
    const rows = result.aggregate ?? [];
    const aliases = result.metricAliases ?? [];
    const primary = aliases[0];
    const chartData = rows
      .slice(0, 20)
      .map((r) => ({ label: r.groupLabel, value: primary ? r.metrics[primary] : 0 }));

    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800 dark:text-white">
            {t("summaryTitle")} <span className="text-gray-400 dark:text-slate-500 font-normal">· {t("groups", { count: rows.length })}</span>
          </h3>
          {rows.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => downloadBlob(new Blob([reportResultToCsv(result)], { type: "text/csv" }), "report.csv")}
            >
              <Download size={14} />
              {t("exportCsv")}
            </Button>
          )}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t("noData")}</p>
        ) : (
          <>
            {primary && (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: tickFill, fontSize: 12 }} />
                    <ReTooltip
                      formatter={(v: number) => numberFmt.format(v)}
                      cursor={{ fill: dark ? "#1e293b" : "#F4F5F7" }}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="value" name={primary} radius={[6, 6, 0, 0]} barSize={36}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                    <th className="py-2 pr-4 font-semibold">
                      {result.groupBy ? result.groupBy : t("group")}
                    </th>
                    {aliases.map((a) => (
                      <th key={a} className="py-2 px-4 font-semibold text-right">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 dark:border-slate-800 last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-gray-800 dark:text-white">{r.groupLabel}</td>
                      {aliases.map((a) => (
                        <td key={a} className="py-2.5 px-4 text-right text-gray-600 dark:text-slate-300">
                          {numberFmt.format(r.metrics[a] ?? 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  }

  // rows mode
  const columns = result.columns ?? [];
  const rows = result.rows ?? [];
  const meta = result.meta;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 dark:text-white">
          {t("resultsTitle")}{" "}
          <span className="text-gray-400 dark:text-slate-500 font-normal">· {t("records", { count: meta?.total ?? rows.length })}</span>
        </h3>
        {rows.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => downloadBlob(new Blob([reportResultToCsv(result)], { type: "text/csv" }), "report.csv")}
          >
            <Download size={14} />
            {t("exportCsv")}
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500 py-8 text-center">{t("noRecords")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 dark:text-slate-500 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                {columns.map((c) => (
                  <th key={c} className="py-2 px-3 font-semibold whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={(row.id as string) ?? i} className="border-b border-gray-50 dark:border-slate-800 last:border-0">
                  {columns.map((c) => (
                    <td key={c} className="py-2.5 px-3 text-gray-700 dark:text-slate-200 whitespace-nowrap">
                      {formatCell(row[c], t("yes"), t("no"))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-gray-400 dark:text-slate-500">
            {t("page", { page: meta.page, totalPages: meta.totalPages })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page <= 1}
              onClick={() => onPage(meta.page - 1)}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.page >= meta.totalPages}
              onClick={() => onPage(meta.page + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
