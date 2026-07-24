"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  Award,
  BadgeDollarSign,
  Building,
  Calendar,
  Check,
  GripVertical,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Percent,
  Plus,
  Scale,
  Target,
  Trash2,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useOpportunities } from "@/features/opportunities/hooks/useOpportunities";
import {
  BoardColumn,
  Opportunity,
  OpportunityStage,
  STAGE_LABELS,
} from "@/features/opportunities/types";
import { customerApi } from "@/features/customers/services/customerApi";
import { accountApi } from "@/features/accounts/services/accountApi";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Form schema ───────────────────────────────────────────────────────────────

const opportunityFormSchema = z.object({
  name: z.string().trim().min(1, "Deal name is required").max(200),
  customerId: z.string().min(1, "Pick a customer"),
  accountId: z.string().optional(),
  amount: z.coerce
    .number("Enter a valid amount")
    .min(0, "Must be zero or more"),
  stage: z.enum(["discovery", "proposal", "negotiation"]),
  expectedCloseDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

const emptyFormValues: OpportunityFormValues = {
  name: "",
  customerId: "",
  accountId: "",
  amount: 0,
  stage: "discovery",
  expectedCloseDate: "",
  notes: "",
};

// ── Presentational helpers ────────────────────────────────────────────────────

const stageAccents: Record<OpportunityStage, { border: string; chip: string; dot: string }> = {
  discovery: {
    border: "border-t-sky-400",
    chip: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
    dot: "bg-sky-400",
  },
  proposal: {
    border: "border-t-indigo-400",
    chip: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
    dot: "bg-indigo-400",
  },
  negotiation: {
    border: "border-t-amber-400",
    chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
    dot: "bg-amber-400",
  },
  closed_won: {
    border: "border-t-emerald-400",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  closed_lost: {
    border: "border-t-red-400",
    chip: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30",
    dot: "bg-red-400",
  },
};

function StageBadge({ stage }: { stage: OpportunityStage }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", stageAccents[stage].chip)}>
      {STAGE_LABELS[stage]}
    </Badge>
  );
}

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
          <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:text-gray-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message}</p>;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// ── Page ──────────────────────────────────────────────────────────────────────

export function OpportunitiesPage() {
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const {
    boardQuery,
    statsQuery,
    createOpportunityMutation,
    updateOpportunityMutation,
    moveStageMutation,
    deleteOpportunityMutation,
  } = useOpportunities();

  const columns: BoardColumn[] = boardQuery.data?.columns ?? [];
  const stats = statsQuery.data;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [viewingOpportunity, setViewingOpportunity] = useState<Opportunity | null>(null);
  const [deletingOpportunity, setDeletingOpportunity] = useState<Opportunity | null>(null);
  /** A drop onto Closed Lost waits here until a reason is provided. */
  const [pendingLostMove, setPendingLostMove] = useState<Opportunity | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostError, setLostError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<OpportunityStage | null>(null);

  // Customer/account pickers — only fetched while the create/edit form is open
  const customersQuery = useQuery({
    queryKey: ["customers", "picker"],
    queryFn: () => customerApi.getAll({ limit: 100, sortBy: "firstName", sortOrder: "asc" }),
    enabled: formOpen,
  });
  const customerOptions = customersQuery.data?.data ?? [];

  const accountsPickerQuery = useQuery({
    queryKey: ["accounts", "picker"],
    queryFn: () => accountApi.getAll({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: formOpen,
  });
  const accountOptions = accountsPickerQuery.data?.data ?? [];

  const form = useForm<OpportunityFormValues>({
    resolver: standardSchemaResolver(opportunityFormSchema),
    defaultValues: emptyFormValues,
  });

  const isSaving = createOpportunityMutation.isPending || updateOpportunityMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setEditingOpportunity(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (opportunity: Opportunity) => {
    form.reset({
      name: opportunity.name,
      customerId: opportunity.customerId,
      accountId: opportunity.accountId ?? "",
      amount: opportunity.amount,
      stage: opportunity.stage === "closed_won" || opportunity.stage === "closed_lost"
        ? "discovery" // stage isn't editable here; field is hidden for existing deals
        : opportunity.stage,
      expectedCloseDate: opportunity.expectedCloseDate
        ? opportunity.expectedCloseDate.slice(0, 10)
        : "",
      notes: opportunity.notes ?? "",
    });
    setEditingOpportunity(opportunity);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingOpportunity(null);
    setFormError(null);
  };

  const onSubmit = async (values: OpportunityFormValues) => {
    setFormError(null);
    try {
      if (editingOpportunity) {
        await updateOpportunityMutation.mutateAsync({
          id: editingOpportunity.id,
          data: {
            name: values.name,
            amount: values.amount,
            expectedCloseDate: values.expectedCloseDate || undefined,
            notes: values.notes?.trim() || undefined,
            // null explicitly unlinks the account when cleared in the form
            accountId: values.accountId || null,
          },
        });
        notifySuccess(`Deal "${values.name}" updated successfully.`);
      } else {
        await createOpportunityMutation.mutateAsync({
          name: values.name,
          customerId: values.customerId,
          accountId: values.accountId || undefined,
          amount: values.amount,
          stage: values.stage,
          expectedCloseDate: values.expectedCloseDate || undefined,
          notes: values.notes?.trim() || undefined,
        });
        notifySuccess(`Deal "${values.name}" added to the pipeline.`);
      }
      setFormOpen(false);
      setEditingOpportunity(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save opportunity");
    }
  };

  const moveTo = async (opportunity: Opportunity, stage: OpportunityStage, reason?: string) => {
    if (opportunity.stage === stage) return;
    if (stage === "closed_lost" && !reason) {
      setLostReason("");
      setLostError(null);
      setPendingLostMove(opportunity);
      return;
    }
    try {
      await moveStageMutation.mutateAsync({
        id: opportunity.id,
        data: { stage, lostReason: reason },
      });
      notifySuccess(`"${opportunity.name}" moved to ${STAGE_LABELS[stage]}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to move deal");
    }
  };

  const confirmLostMove = async () => {
    if (!pendingLostMove) return;
    if (!lostReason.trim()) {
      setLostError("Please provide a reason — it feeds win/loss reporting.");
      return;
    }
    try {
      await moveStageMutation.mutateAsync({
        id: pendingLostMove.id,
        data: { stage: "closed_lost", lostReason: lostReason.trim() },
      });
      notifySuccess(`"${pendingLostMove.name}" marked as lost.`);
      setPendingLostMove(null);
    } catch (err) {
      setLostError(err instanceof Error ? err.message : "Failed to move deal");
    }
  };

  const handleDelete = async () => {
    if (!deletingOpportunity) return;
    try {
      await deleteOpportunityMutation.mutateAsync(deletingOpportunity.id);
      notifySuccess(`Deal "${deletingOpportunity.name}" was deleted.`);
      setDeletingOpportunity(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete deal");
      setDeletingOpportunity(null);
    }
  };

  // ── Drag & drop (native HTML5) ─────────────────────────────────────────────

  const onDragStart = (e: React.DragEvent, opportunity: Opportunity) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: opportunity.id }));
    e.dataTransfer.effectAllowed = "move";
    setDraggingId(opportunity.id);
  };

  const onDropOnColumn = (e: React.DragEvent, stage: OpportunityStage) => {
    e.preventDefault();
    setDragOverStage(null);
    setDraggingId(null);
    try {
      const { id } = JSON.parse(e.dataTransfer.getData("text/plain")) as { id: string };
      const opportunity = columns
        .flatMap((c) => c.opportunities)
        .find((o) => o.id === id);
      if (opportunity) void moveTo(opportunity, stage);
    } catch {
      // Foreign drag payload — ignore
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Opportunities</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Track deals through the pipeline — drag cards between stages.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
            <Plus size={18} />
            Add Opportunity
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Open Deals" value={stats?.openCount} icon={Target} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard
            label="Pipeline Value"
            value={stats ? currency.format(stats.openValue) : undefined}
            icon={BadgeDollarSign}
            accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400"
          />
          <StatCard
            label="Weighted Forecast"
            value={stats ? currency.format(stats.weightedValue) : undefined}
            icon={Scale}
            accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          />
          <StatCard
            label="Won This Month"
            value={stats ? `${stats.wonThisMonthCount} · ${currency.format(stats.wonThisMonthValue)}` : undefined}
            icon={Award}
            accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          />
          <StatCard
            label="Win Rate"
            value={stats ? `${stats.winRate}%` : undefined}
            icon={TrendingUp}
            accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
          />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || boardQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (boardQuery.error instanceof Error ? boardQuery.error.message : "Failed to load pipeline")}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (boardQuery.isError) boardQuery.refetch();
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Kanban board */}
        {boardQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-24">
            <Loader2 size={20} className="animate-spin" />
            <span>Loading pipeline...</span>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4 -mx-1 px-1">
            <div className="flex gap-4 min-w-max items-start">
              {columns.map((column) => {
                const accent = stageAccents[column.stage];
                return (
                  <div
                    key={column.stage}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverStage(column.stage);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setDragOverStage((s) => (s === column.stage ? null : s));
                      }
                    }}
                    onDrop={(e) => onDropOnColumn(e, column.stage)}
                    className={cn(
                      "w-72 shrink-0 bg-white dark:bg-slate-900 rounded-xl shadow-sm border-t-4 transition-colors",
                      accent.border,
                      dragOverStage === column.stage && "ring-2 ring-[#3F51B5]/30 bg-[#3F51B5]/[0.02]",
                    )}
                  >
                    {/* Column header */}
                    <div className="p-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", accent.dot)} />
                        <span className="font-bold text-sm text-gray-700 dark:text-slate-200">{STAGE_LABELS[column.stage]}</span>
                        <span className="text-xs font-semibold text-gray-400 dark:text-slate-500 bg-gray-100 dark:bg-slate-800 rounded-full px-2 py-0.5">
                          {column.count}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-500 dark:text-slate-400">
                        {currency.format(column.totalAmount)}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-[120px] max-h-[65dvh] overflow-y-auto">
                      {column.opportunities.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-slate-600 text-center py-8 select-none">
                          Drop deals here
                        </p>
                      ) : (
                        column.opportunities.map((opportunity) => (
                          <div
                            key={opportunity.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, opportunity)}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverStage(null);
                            }}
                            className={cn(
                              "group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3 shadow-sm hover:shadow-md hover:border-[#3F51B5]/30 transition-all cursor-grab active:cursor-grabbing",
                              draggingId === opportunity.id && "opacity-40",
                            )}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => setViewingOpportunity(opportunity)}
                                className="font-semibold text-sm text-gray-800 dark:text-slate-100 text-left hover:text-[#3F51B5] dark:hover:text-indigo-300 transition-colors line-clamp-2"
                              >
                                {opportunity.name}
                              </button>
                              <div className="flex items-center shrink-0 -mr-1.5 -mt-1">
                                <GripVertical size={14} className="text-gray-200 dark:text-slate-700 group-hover:text-gray-400 dark:group-hover:text-slate-500" />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-gray-300 hover:text-gray-600 dark:text-slate-600 dark:hover:text-slate-300"
                                    >
                                      <MoreHorizontal size={14} />
                                      <span className="sr-only">Deal actions</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setViewingOpportunity(opportunity)}>
                                      <Info size={15} /> View details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openEdit(opportunity)}>
                                      <Pencil size={15} /> Edit deal
                                    </DropdownMenuItem>
                                    <DropdownMenuSub>
                                      <DropdownMenuSubTrigger>
                                        <Target size={15} /> Move to stage
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuSubContent>
                                        {columns
                                          .filter((c) => c.stage !== opportunity.stage)
                                          .map((c) => (
                                            <DropdownMenuItem
                                              key={c.stage}
                                              onClick={() => moveTo(opportunity, c.stage)}
                                            >
                                              <span className={cn("w-2 h-2 rounded-full", stageAccents[c.stage].dot)} />
                                              {STAGE_LABELS[c.stage]}
                                            </DropdownMenuItem>
                                          ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuSub>
                                    {isStaffAdmin && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          variant="destructive"
                                          onClick={() => setDeletingOpportunity(opportunity)}
                                        >
                                          <Trash2 size={15} /> Delete deal
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>

                            {opportunity.customerName && (
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 flex items-center gap-1 truncate">
                                <Building size={11} className="shrink-0 text-gray-400 dark:text-slate-500" />
                                {opportunity.customerName}
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-2.5">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">
                                {currency.format(opportunity.amount)}
                              </span>
                              <span className="text-[11px] font-semibold text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                                <Percent size={10} />
                                {opportunity.probability}
                              </span>
                            </div>

                            <div className="flex items-center justify-between mt-1.5 text-[11px] text-gray-400 dark:text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {opportunity.expectedCloseDate
                                  ? new Date(opportunity.expectedCloseDate).toLocaleDateString()
                                  : "No close date"}
                              </span>
                              {opportunity.assignedToName && (
                                <span className="truncate max-w-[90px]" title={opportunity.assignedToName}>
                                  {opportunity.assignedToName}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Details dialog */}
      <Dialog open={!!viewingOpportunity} onOpenChange={(open) => !open && setViewingOpportunity(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingOpportunity && (
            <>
              <DialogHeader>
                <DialogTitle>Deal Details</DialogTitle>
                <DialogDescription>Value, stage progress, and history.</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{viewingOpportunity.name}</h4>
                    {viewingOpportunity.customerName && (
                      <span className="text-sm text-gray-500 dark:text-slate-400">{viewingOpportunity.customerName}</span>
                    )}
                  </div>
                  <div className="ml-auto shrink-0">
                    <StageBadge stage={viewingOpportunity.stage} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Building,
                      label: "Account",
                      value: viewingOpportunity.accountName || "No account",
                    },
                    {
                      icon: BadgeDollarSign,
                      label: "Amount",
                      value: currency.format(viewingOpportunity.amount),
                    },
                    {
                      icon: Scale,
                      label: "Weighted",
                      value: `${currency.format(viewingOpportunity.weightedAmount)} (${viewingOpportunity.probability}%)`,
                    },
                    {
                      icon: Calendar,
                      label: "Expected Close",
                      value: viewingOpportunity.expectedCloseDate
                        ? new Date(viewingOpportunity.expectedCloseDate).toLocaleDateString()
                        : "—",
                    },
                    {
                      icon: Calendar,
                      label: viewingOpportunity.stage === "closed_lost" ? "Closed (Lost)" : "Closed",
                      value: viewingOpportunity.closedAt
                        ? new Date(viewingOpportunity.closedAt).toLocaleDateString()
                        : "—",
                    },
                    {
                      icon: Target,
                      label: "Record Owner",
                      value: viewingOpportunity.assignedToName || "Unassigned",
                    },
                    {
                      icon: UsersRound,
                      label: "Team",
                      value: viewingOpportunity.assignedTeamName || "Unassigned",
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
                      <Icon className="text-gray-400 dark:text-slate-500 shrink-0" size={18} />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{label}</p>
                        <p className="font-medium whitespace-pre-wrap break-words">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {viewingOpportunity.lostReason && (
                  <div className="bg-red-50 border border-red-200 dark:bg-red-500/10 dark:border-red-500/30 rounded-xl p-4 space-y-1">
                    <p className="text-xs text-red-400 dark:text-red-400 uppercase tracking-wider font-semibold">Lost Reason</p>
                    <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-wrap">{viewingOpportunity.lostReason}</p>
                  </div>
                )}

                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                    {viewingOpportunity.notes || "No notes for this deal."}
                  </p>
                </div>

                {/* Stage history */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    Stage History ({viewingOpportunity.stageHistory.length})
                  </p>
                  {viewingOpportunity.stageHistory.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500">No stage moves yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {viewingOpportunity.stageHistory.map((t, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-sm bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3"
                        >
                          <span className={cn("w-2 h-2 rounded-full shrink-0", stageAccents[t.to].dot)} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 dark:text-slate-200">
                              {STAGE_LABELS[t.from]} → {STAGE_LABELS[t.to]}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-slate-500">
                              {new Date(t.movedAt).toLocaleString()}
                              {t.movedByName ? ` · by ${t.movedByName}` : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    const target = viewingOpportunity;
                    setViewingOpportunity(null);
                    openEdit(target);
                  }}
                >
                  <Pencil size={15} /> Edit
                </Button>
                <Button variant="secondary" onClick={() => setViewingOpportunity(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOpportunity ? "Edit Deal" : "Add New Opportunity"}</DialogTitle>
            <DialogDescription>
              {editingOpportunity
                ? "Update the deal's value, timing, or notes. Use the board to change its stage."
                : "Add a deal to the pipeline for an existing customer."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Deal Name *
              </label>
              <Input placeholder="Acme Corp — annual license" disabled={isSaving} {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            {!editingOpportunity && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Customer *
                </label>
                <select
                  className={inputClasses}
                  disabled={isSaving || customersQuery.isLoading}
                  {...form.register("customerId")}
                >
                  <option value="">
                    {customersQuery.isLoading ? "Loading customers..." : "Select a customer"}
                  </option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                      {c.company ? ` (${c.company})` : ""}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.customerId?.message} />
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  Deals belong to customers. Convert a lead first if the contact isn&apos;t a customer yet.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Account (Company)
              </label>
              <select
                className={inputClasses}
                disabled={isSaving || accountsPickerQuery.isLoading}
                {...form.register("accountId")}
              >
                <option value="">
                  {accountsPickerQuery.isLoading ? "Loading accounts..." : "No account (B2C deal)"}
                </option>
                {accountOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                Linking a company makes this deal appear in the account&apos;s 360° view.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Amount (USD) *
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={isSaving}
                  {...form.register("amount")}
                />
                <FieldError message={form.formState.errors.amount?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Expected Close Date
                </label>
                <Input type="date" disabled={isSaving} {...form.register("expectedCloseDate")} />
              </div>
            </div>

            {!editingOpportunity && (
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Starting Stage
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("stage")}>
                  <option value="discovery">Discovery</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder="Deal context, blockers, decision makers..."
                className={cn(inputClasses, "resize-none")}
                {...form.register("notes")}
              />
              <FieldError message={form.formState.errors.notes?.message} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingOpportunity ? "Update Deal" : "Create Deal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lost reason dialog */}
      <Dialog open={!!pendingLostMove} onOpenChange={(open) => !open && setPendingLostMove(null)}>
        <DialogContent className="max-w-md">
          {pendingLostMove && (
            <>
              <DialogHeader>
                <DialogTitle>Mark deal as lost</DialogTitle>
                <DialogDescription>
                  Why was <span className="font-semibold text-gray-700 dark:text-slate-200">{pendingLostMove.name}</span> lost?
                  The reason is stored on the deal and feeds win/loss reporting.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                {lostError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {lostError}
                  </div>
                )}
                <textarea
                  rows={3}
                  autoFocus
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. Chose a competitor on price; budget cut for this quarter..."
                  className={cn(inputClasses, "resize-none")}
                  disabled={moveStageMutation.isPending}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPendingLostMove(null)}
                  disabled={moveStageMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmLostMove}
                  disabled={moveStageMutation.isPending}
                >
                  {moveStageMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Mark as Lost
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingOpportunity} onOpenChange={(open) => !open && setDeletingOpportunity(null)}>
        <DialogContent className="max-w-md">
          {deletingOpportunity && (
            <>
              <DialogHeader>
                <DialogTitle>Delete deal?</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">{deletingOpportunity.name}</span> (
                  {currency.format(deletingOpportunity.amount)}) and its stage history. This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingOpportunity(null)}
                  disabled={deleteOpportunityMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteOpportunityMutation.isPending}
                >
                  {deleteOpportunityMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Delete Deal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
