"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  ArrowUpDown,
  Building,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Info,
  Loader2,
  Mail,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Target,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { initialSearchTermFromUrl } from "@/lib/initial-search-term";
import { CustomFieldsSection } from "@/features/custom-fields/components/CustomFieldsSection";
import { AttachmentsSection } from "@/features/attachments/components/AttachmentsSection";
import { ImportExportBar } from "@/features/import-export/components/ImportExportBar";
import { useLeads } from "@/features/leads/hooks/useLeads";
import { leadApi } from "@/features/leads/services/leadApi";
import {
  EngagementType,
  Lead,
  LeadQuery,
  LeadRating,
  LeadSortField,
  LeadSource,
  LeadStatus,
} from "@/features/leads/types";
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
import { currencyFormatter as currency } from "@/lib/currency";

// ── Form schemas ──────────────────────────────────────────────────────────────

const leadFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email address").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s().-]{6,}$/, "Enter a valid phone number")
    .max(30)
    .optional()
    .or(z.literal("")),
  company: z.string().max(150).optional(),
  jobTitle: z.string().max(150).optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(["web_form", "api", "manual", "referral", "event", "other"]),
  estimatedValue: z.coerce
    .number("Enter a valid amount")
    .min(0, "Must be zero or more")
    .optional(),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;

const emptyLeadForm: LeadFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  notes: "",
  source: "manual",
  estimatedValue: undefined,
};

const engagementFormSchema = z.object({
  type: z.enum([
    "email_opened",
    "email_replied",
    "call",
    "meeting",
    "website_visit",
    "form_submitted",
    "note",
  ]),
  note: z.string().max(1000).optional(),
});

type EngagementFormValues = z.infer<typeof engagementFormSchema>;

const convertFormSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s().-]{6,}$/, "Enter a valid phone number")
    .max(30)
    .optional()
    .or(z.literal("")),
  address: z.string().max(500).optional(),
  createOpportunity: z.boolean(),
  opportunityName: z.string().max(200).optional(),
  amount: z.coerce
    .number("Enter a valid amount")
    .min(0, "Must be zero or more")
    .optional(),
  expectedCloseDate: z.string().optional(),
  stage: z.enum(["discovery", "proposal", "negotiation"]),
});

type ConvertFormValues = z.infer<typeof convertFormSchema>;

// ── Presentational helpers ────────────────────────────────────────────────────

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
  qualified: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  unqualified: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800",
  converted: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
};

function StatusBadge({ status }: { status: LeadStatus }) {
  const t = useTranslations("leads");
  return (
    <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[status])}>
      {t(`statuses.${status}`)}
    </Badge>
  );
}

const ratingStyles: Record<LeadRating, string> = {
  hot: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  warm: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
  cold: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800",
};

function ScoreCell({ score, rating }: { score: number; rating: LeadRating }) {
  const t = useTranslations("leads");
  const barColor =
    rating === "hot" ? "bg-red-500" : rating === "warm" ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 dark:text-slate-300 w-7 text-right">{score}</span>
      <Badge variant="outline" className={cn("capitalize font-semibold text-[10px] px-1.5", ratingStyles[rating])}>
        {t(`ratings.${rating}`)}
      </Badge>
    </div>
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
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:dark:bg-slate-800/50 disabled:text-gray-500 disabled:dark:text-slate-400";

function SortableHead({
  field,
  sortBy,
  sortOrder,
  onToggle,
  children,
  className,
}: {
  field: LeadSortField;
  sortBy: LeadSortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: LeadSortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const indicator =
    sortBy !== field ? (
      <ArrowUpDown size={13} className="text-gray-300 dark:text-slate-600" />
    ) : sortOrder === "asc" ? (
      <ArrowUp size={13} className="text-[#3F51B5]" />
    ) : (
      <ArrowDown size={13} className="text-[#3F51B5]" />
    );

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(field)}
        className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-white transition-colors"
      >
        {children}
        {indicator}
      </button>
    </TableHead>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message}</p>;
}


// ── Page ──────────────────────────────────────────────────────────────────────

export function LeadsPage() {
  const t = useTranslations("leads");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState(initialSearchTermFromUrl);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [ratingFilter, setRatingFilter] = useState<LeadRating | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<LeadSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: LeadQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      status: statusFilter,
      source: sourceFilter,
      rating: ratingFilter,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, statusFilter, sourceFilter, ratingFilter, sortBy, sortOrder],
  );

  const {
    leadsQuery,
    statsQuery,
    createLeadMutation,
    updateLeadMutation,
    addEngagementMutation,
    assignLeadMutation,
    convertLeadMutation,
    deleteLeadMutation,
  } = useLeads(query);

  const leads = leadsQuery.data?.data ?? [];
  const meta = leadsQuery.data?.meta;
  const stats = statsQuery.data;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null);
  const [assigningLead, setAssigningLead] = useState<Lead | null>(null);
  const [engagingLead, setEngagingLead] = useState<Lead | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [engagementError, setEngagementError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  // Assignment pickers — only fetched while the assign dialog is open
  const assignDialogOpen = isStaffAdmin && !!assigningLead;
  const assignTeamsQuery = useQuery({
    queryKey: ["teams", "list", { limit: 100, isActive: true }],
    queryFn: () => teamApi.getAll({ limit: 100, isActive: true }),
    enabled: assignDialogOpen,
  });
  const assignStaffQuery = useQuery({
    queryKey: ["users", "staff"],
    queryFn: () => userApi.getStaff(),
    enabled: assignDialogOpen,
  });

  const assignTeams = assignTeamsQuery.data?.data ?? [];
  const selectedAssignTeam = assignTeams.find((tm) => tm.id === assignTeamId);
  // When a team is chosen, the owner must be one of its members
  const assignOwnerOptions = selectedAssignTeam
    ? (assignStaffQuery.data ?? []).filter((s) =>
        selectedAssignTeam.members.some((m) => m.keycloakId === s.keycloakId),
      )
    : (assignStaffQuery.data ?? []);

  const form = useForm<LeadFormValues>({
    resolver: standardSchemaResolver(leadFormSchema),
    defaultValues: emptyLeadForm,
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  const engagementForm = useForm<EngagementFormValues>({
    resolver: standardSchemaResolver(engagementFormSchema),
    defaultValues: { type: "call", note: "" },
  });

  const convertForm = useForm<ConvertFormValues>({
    resolver: standardSchemaResolver(convertFormSchema),
    defaultValues: {
      phone: "",
      address: "",
      createOpportunity: true,
      opportunityName: "",
      amount: undefined,
      expectedCloseDate: "",
      stage: "discovery",
    },
  });

  const watchCreateOpportunity = convertForm.watch("createOpportunity");
  const isSaving = createLeadMutation.isPending || updateLeadMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: LeadSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(
        field === "createdAt" || field === "updatedAt" || field === "score" ? "desc" : "asc",
      );
    }
    resetToFirstPage();
  };

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    form.reset(emptyLeadForm);
    setCustomFieldValues({});
    setEditingLead(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (lead: Lead) => {
    form.reset({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone ?? "",
      company: lead.company ?? "",
      jobTitle: lead.jobTitle ?? "",
      notes: lead.notes ?? "",
      source: lead.source,
      estimatedValue: lead.estimatedValue,
    });
    setCustomFieldValues(lead.customFields ?? {});
    setEditingLead(lead);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingLead(null);
    setFormError(null);
  };

  const onSubmit = async (values: LeadFormValues) => {
    setFormError(null);
    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone?.trim() || undefined,
      company: values.company?.trim() || undefined,
      jobTitle: values.jobTitle?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      source: values.source,
      estimatedValue: values.estimatedValue,
      customFields: customFieldValues,
    };

    try {
      if (editingLead) {
        await updateLeadMutation.mutateAsync({ id: editingLead.id, data: payload });
        notifySuccess(t("toasts.updated", { name: `${values.firstName} ${values.lastName}` }));
      } else {
        await createLeadMutation.mutateAsync(payload);
        notifySuccess(t("toasts.created", { name: `${values.firstName} ${values.lastName}` }));
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingLead(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("toasts.saveFailed"));
    }
  };

  const setLeadStatus = async (lead: Lead, status: Exclude<LeadStatus, "converted">) => {
    try {
      await updateLeadMutation.mutateAsync({ id: lead.id, data: { status } });
      notifySuccess(
        t("toasts.statusChanged", { name: `${lead.firstName} ${lead.lastName}`, status: t(`statuses.${status}`) }),
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.statusFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deletingLead) return;
    try {
      await deleteLeadMutation.mutateAsync(deletingLead.id);
      notifySuccess(t("toasts.deleted", { name: `${deletingLead.firstName} ${deletingLead.lastName}` }));
      setDeletingLead(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.deleteFailed"));
      setDeletingLead(null);
    }
  };

  const openAssign = (lead: Lead) => {
    setAssignTeamId(lead.assignedTeamId ?? "");
    setAssignOwnerId(lead.assignedToId ?? "");
    setAssignError(null);
    setAssigningLead(lead);
  };

  const handleAssign = async () => {
    if (!assigningLead) return;
    setAssignError(null);
    try {
      await assignLeadMutation.mutateAsync({
        id: assigningLead.id,
        data: {
          assignedTeamId: assignTeamId || null,
          assignedToId: assignOwnerId || null,
        },
      });
      notifySuccess(t("toasts.assignmentUpdated", { name: `${assigningLead.firstName} ${assigningLead.lastName}` }));
      setAssigningLead(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : t("toasts.assignmentFailed"));
    }
  };

  const openEngagement = (lead: Lead) => {
    engagementForm.reset({ type: "call", note: "" });
    setEngagementError(null);
    setEngagingLead(lead);
  };

  const onSubmitEngagement = async (values: EngagementFormValues) => {
    if (!engagingLead) return;
    setEngagementError(null);
    try {
      await addEngagementMutation.mutateAsync({
        id: engagingLead.id,
        data: { type: values.type, note: values.note?.trim() || undefined },
      });
      notifySuccess(
        t("toasts.engagementLogged", {
          type: t(`engagementTypes.${values.type}`),
          name: `${engagingLead.firstName} ${engagingLead.lastName}`,
        }),
      );
      setEngagingLead(null);
    } catch (err) {
      setEngagementError(err instanceof Error ? err.message : t("toasts.engagementFailed"));
    }
  };

  const openConvert = (lead: Lead) => {
    convertForm.reset({
      phone: lead.phone ?? "",
      address: "",
      createOpportunity: true,
      opportunityName: `${lead.company || `${lead.firstName} ${lead.lastName}`} deal`,
      amount: lead.estimatedValue,
      expectedCloseDate: "",
      stage: "discovery",
    });
    setConvertError(null);
    setConvertingLead(lead);
  };

  const onSubmitConvert = async (values: ConvertFormValues) => {
    if (!convertingLead) return;
    setConvertError(null);

    if (!values.phone?.trim() && !convertingLead.phone) {
      setConvertError(t("toasts.convertPhoneRequired"));
      return;
    }

    try {
      await convertLeadMutation.mutateAsync({
        id: convertingLead.id,
        data: {
          phone: values.phone?.trim() || undefined,
          address: values.address?.trim() || undefined,
          createOpportunity: values.createOpportunity,
          opportunityName: values.opportunityName?.trim() || undefined,
          amount: values.amount,
          expectedCloseDate: values.expectedCloseDate || undefined,
          stage: values.stage,
        },
      });
      notifySuccess(
        t("toasts.converted", {
          name: `${convertingLead.firstName} ${convertingLead.lastName}`,
          opportunity: values.createOpportunity ? t("toasts.convertedWithOpportunity") : "",
        }),
      );
      setConvertingLead(null);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : t("toasts.convertFailed"));
    }
  };

  const sortProps = { sortBy, sortOrder, onToggle: toggleSort };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExportBar
              onExport={() => leadApi.exportCsv(query)}
              exportFilename="leads.csv"
              onImport={(file) => leadApi.importCsv(file)}
              onImportComplete={() => leadsQuery.refetch()}
            />
            <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
              <Plus size={18} />
              {t("addLead")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label={t("stats.total")} value={stats?.total} icon={TrendingUp} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard label={t("stats.new")} value={stats?.new} icon={UserPlus} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
          <StatCard label={t("stats.hot")} value={stats?.hot} icon={Flame} accent="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
          <StatCard label={t("stats.qualified")} value={stats?.qualified} icon={ThumbsUp} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
          <StatCard label={t("stats.converted")} value={stats?.converted} icon={Target} accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" />
          <StatCard
            label={t("stats.convRate")}
            value={stats ? `${stats.conversionRate}%` : undefined}
            icon={ArrowRightLeft}
            accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
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

        {(errorMsg || leadsQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (leadsQuery.error instanceof Error ? leadsQuery.error.message : t("loadFailed"))}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (leadsQuery.isError) leadsQuery.refetch();
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filters & Table */}
        <Card className="py-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
              <Input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetToFirstPage();
                }}
                className="pl-10"
              />
            </div>

            <div className="flex w-full md:w-auto items-center gap-2 justify-end flex-wrap">
              {leadsQuery.isFetching && !leadsQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as LeadStatus | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("filters.allStatuses")}</option>
                <option value="new">{t("statuses.new")}</option>
                <option value="contacted">{t("statuses.contacted")}</option>
                <option value="qualified">{t("statuses.qualified")}</option>
                <option value="unqualified">{t("statuses.unqualified")}</option>
                <option value="converted">{t("statuses.converted")}</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as LeadSource | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("filters.allSources")}</option>
                {(["web_form", "api", "manual", "referral", "event", "other"] as LeadSource[]).map((value) => (
                  <option key={value} value={value}>
                    {t(`sources.${value}`)}
                  </option>
                ))}
              </select>
              <select
                value={ratingFilter}
                onChange={(e) => {
                  setRatingFilter(e.target.value as LeadRating | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("filters.anyRating")}</option>
                <option value="hot">{t("ratings.hot")}</option>
                <option value="warm">{t("ratings.warm")}</option>
                <option value="cold">{t("ratings.cold")}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  <SortableHead field="lastName" className="px-6" {...sortProps}>{t("table.lead")}</SortableHead>
                  <SortableHead field="company" className="px-6" {...sortProps}>{t("table.company")}</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.source")}
                  </TableHead>
                  <SortableHead field="score" className="px-6" {...sortProps}>{t("table.score")}</SortableHead>
                  <SortableHead field="status" className="px-6" {...sortProps}>{t("table.status")}</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.assignedTo")}
                  </TableHead>
                  <SortableHead field="createdAt" className="px-6" {...sortProps}>{t("table.created")}</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>{t("fetchingLeads")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <TrendingUp size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">{t("noLeadsFound")}</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {debouncedSearch || statusFilter || sourceFilter || ratingFilter
                            ? t("adjustFilters")
                            : t("addFirstLead")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {lead.firstName[0]}
                            {lead.lastName[0]}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                              {lead.firstName} {lead.lastName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate">{lead.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {lead.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{lead.company}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                        {t(`sources.${lead.source}`)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <ScoreCell score={lead.score} rating={lead.rating} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {lead.assignedToName || lead.assignedTeamName ? (
                          <div className="flex flex-col min-w-0">
                            {lead.assignedToName && (
                              <span className="text-gray-700 dark:text-slate-200 font-medium truncate">{lead.assignedToName}</span>
                            )}
                            {lead.assignedTeamName && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                                <UsersRound size={11} className="shrink-0" />
                                {lead.assignedTeamName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">{t("unassigned")}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500 dark:text-slate-400">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200">
                              <MoreHorizontal size={18} />
                              <span className="sr-only">{t("openActions")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingLead(lead)}>
                              <Info size={15} /> {t("viewDetails")}
                            </DropdownMenuItem>
                            {lead.status !== "converted" && (
                              <>
                                <DropdownMenuItem onClick={() => openEngagement(lead)}>
                                  <MessageSquarePlus size={15} /> {t("logEngagement")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(lead)}>
                                  <Pencil size={15} /> {t("editLead")}
                                </DropdownMenuItem>
                                {isStaffAdmin && (
                                  <DropdownMenuItem onClick={() => openAssign(lead)}>
                                    <UsersRound size={15} /> {t("assignOwnerTeam")}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {lead.status !== "qualified" && lead.status !== "unqualified" && (
                                  <DropdownMenuItem onClick={() => setLeadStatus(lead, "qualified")}>
                                    <ThumbsUp size={15} /> {t("markQualified")}
                                  </DropdownMenuItem>
                                )}
                                {lead.status === "qualified" && (
                                  <DropdownMenuItem onClick={() => openConvert(lead)}>
                                    <ArrowRightLeft size={15} /> {t("convertToCustomer")}
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== "unqualified" && (
                                  <DropdownMenuItem onClick={() => setLeadStatus(lead, "unqualified")}>
                                    <ThumbsDown size={15} /> {t("markUnqualified")}
                                  </DropdownMenuItem>
                                )}
                                {lead.status === "unqualified" && (
                                  <DropdownMenuItem onClick={() => setLeadStatus(lead, "new")}>
                                    <ThumbsUp size={15} /> {t("reopenLead")}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeletingLead(lead)}>
                                  <Trash2 size={15} /> {t("deleteLead")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
          {!leadsQuery.isLoading && meta && meta.total > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span>
                  {t("range", {
                    from: (meta.page - 1) * meta.limit + 1,
                    to: Math.min(meta.page * meta.limit, meta.total),
                    total: meta.total,
                  })}
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    resetToFirstPage();
                  }}
                  className={cn(inputClasses, "w-auto py-1 text-xs")}
                >
                  <option value={10}>{t("perPage", { count: 10 })}</option>
                  <option value={25}>{t("perPage", { count: 25 })}</option>
                  <option value={50}>{t("perPage", { count: 50 })}</option>
                </select>
              </div>
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
                  {t("pageOf", { page: meta.page, totalPages: meta.totalPages })}
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

      {/* Details dialog */}
      <Dialog open={!!viewingLead} onOpenChange={(open) => !open && setViewingLead(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingLead && (
            <>
              <DialogHeader>
                <DialogTitle>{t("details.title")}</DialogTitle>
                <DialogDescription>{t("details.subtitle")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-lg uppercase">
                    {viewingLead.firstName[0]}
                    {viewingLead.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {viewingLead.firstName} {viewingLead.lastName}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-slate-400">{viewingLead.email}</span>
                  </div>
                  <div className="ml-auto shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={viewingLead.status} />
                    <Badge
                      variant="outline"
                      className={cn("capitalize font-semibold", ratingStyles[viewingLead.rating])}
                    >
                      <Flame size={11} /> {t(`ratings.${viewingLead.rating}`)} · {viewingLead.score}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Phone, label: t("details.phone"), value: viewingLead.phone || tc("notAvailable") },
                    { icon: Building, label: t("details.company"), value: viewingLead.company || tc("notAvailable") },
                    { icon: Info, label: t("details.jobTitle"), value: viewingLead.jobTitle || tc("notAvailable") },
                    { icon: Mail, label: t("details.source"), value: t(`sources.${viewingLead.source}`) },
                    {
                      icon: Target,
                      label: t("details.estValue"),
                      value:
                        viewingLead.estimatedValue !== undefined && viewingLead.estimatedValue !== null
                          ? currency.format(viewingLead.estimatedValue)
                          : tc("notAvailable"),
                    },
                    {
                      icon: UserPlus,
                      label: t("details.recordOwner"),
                      value: viewingLead.assignedToName || t("unassigned"),
                    },
                    {
                      icon: UsersRound,
                      label: t("details.team"),
                      value: viewingLead.assignedTeamName || t("unassigned"),
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

                {viewingLead.status === "converted" && (
                  <div className="bg-violet-50 border border-violet-200 text-violet-800 dark:bg-violet-500/10 dark:border-violet-500/30 dark:text-violet-300 rounded-xl p-4 text-sm">
                    {t("details.convertedNotice", {
                      date: viewingLead.convertedAt
                        ? t("details.convertedOnDate", { date: new Date(viewingLead.convertedAt).toLocaleDateString() })
                        : "",
                      opportunity: viewingLead.convertedOpportunityId
                        ? t("details.andPipelineDeal")
                        : t("details.wasCreatedSuffix"),
                    })}
                  </div>
                )}

                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{t("details.notes")}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                    {viewingLead.notes || t("details.noNotes")}
                  </p>
                </div>

                {/* Engagement timeline */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    {t("details.engagementHistory", { count: viewingLead.engagements.length })}
                  </p>
                  {viewingLead.engagements.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500">{t("details.noEngagementsYet")}</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {viewingLead.engagements.map((e, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3"
                        >
                          <span
                            className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded shrink-0",
                              e.points > 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                            )}
                          >
                            {e.points > 0 ? `+${e.points}` : e.points}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 dark:text-white">{t(`engagementTypes.${e.type}`)}</p>
                            {e.note && <p className="text-gray-500 dark:text-slate-400 whitespace-pre-wrap break-words">{e.note}</p>}
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                              {new Date(e.occurredAt).toLocaleString()}
                              {e.recordedByName ? t("details.loggedBy", { name: e.recordedByName }) : ""}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <DialogFooter>
                {viewingLead.status !== "converted" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const target = viewingLead;
                      setViewingLead(null);
                      openEngagement(target);
                    }}
                  >
                    <MessageSquarePlus size={15} /> {t("logEngagement")}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setViewingLead(null)}>
                  {tc("close")}
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
            <DialogTitle>{editingLead ? t("form.editTitle") : t("form.addTitle")}</DialogTitle>
            <DialogDescription>
              {editingLead
                ? t("form.editDesc")
                : t("form.addDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.firstName")}
                </label>
                <Input disabled={isSaving} {...form.register("firstName")} />
                <FieldError message={form.formState.errors.firstName?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.lastName")}
                </label>
                <Input disabled={isSaving} {...form.register("lastName")} />
                <FieldError message={form.formState.errors.lastName?.message} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.email")}
              </label>
              <Input type="email" placeholder="name@example.com" disabled={isSaving} {...form.register("email")} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.phone")}
                </label>
                <Input type="tel" placeholder="+1 234 567 890" disabled={isSaving} {...form.register("phone")} />
                <FieldError message={form.formState.errors.phone?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.company")}
                </label>
                <Input placeholder="Acme Corp" disabled={isSaving} {...form.register("company")} />
                <FieldError message={form.formState.errors.company?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.jobTitle")}
                </label>
                <Input placeholder={t("form.jobTitlePlaceholder")} disabled={isSaving} {...form.register("jobTitle")} />
                <FieldError message={form.formState.errors.jobTitle?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.source")}
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("source")}>
                  {(["web_form", "api", "manual", "referral", "event", "other"] as LeadSource[]).map((value) => (
                    <option key={value} value={value}>
                      {t(`sources.${value}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.estimatedValue")}
              </label>
              <Input
                type="number"
                min={0}
                step="0.01"
                placeholder="10000"
                disabled={isSaving}
                {...form.register("estimatedValue", {
                  setValueAs: (v: string) => (v === "" || v === null ? undefined : Number(v)),
                })}
              />
              <FieldError message={form.formState.errors.estimatedValue?.message} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.notes")}
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder={t("form.notesPlaceholder")}
                className={cn(inputClasses, "resize-none")}
                {...form.register("notes")}
              />
              <FieldError message={form.formState.errors.notes?.message} />
            </div>

            <CustomFieldsSection
              entityType="lead"
              values={customFieldValues}
              onChange={setCustomFieldValues}
            />

            <AttachmentsSection entityType="lead" entityId={editingLead?.id} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingLead ? t("form.updateLead") : t("form.createLead")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log engagement dialog */}
      <Dialog open={!!engagingLead} onOpenChange={(open) => !open && setEngagingLead(null)}>
        <DialogContent className="max-w-md">
          {engagingLead && (
            <>
              <DialogHeader>
                <DialogTitle>{t("engagementDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("engagementDialog.desc", { name: `${engagingLead.firstName} ${engagingLead.lastName}` })}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={engagementForm.handleSubmit(onSubmitEngagement)} className="space-y-4">
                {engagementError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {engagementError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("engagementDialog.engagementType")}
                  </label>
                  <select
                    className={inputClasses}
                    disabled={addEngagementMutation.isPending}
                    {...engagementForm.register("type")}
                  >
                    {(
                      [
                        "email_opened",
                        "email_replied",
                        "call",
                        "meeting",
                        "website_visit",
                        "form_submitted",
                        "note",
                      ] as EngagementType[]
                    ).map((value) => (
                      <option key={value} value={value}>
                        {t(`engagementTypes.${value}`)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    {t("engagementDialog.autoContactedHint")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("engagementDialog.note")}
                  </label>
                  <textarea
                    rows={3}
                    disabled={addEngagementMutation.isPending}
                    placeholder={t("engagementDialog.notePlaceholder")}
                    className={cn(inputClasses, "resize-none")}
                    {...engagementForm.register("note")}
                  />
                  <FieldError message={engagementForm.formState.errors.note?.message} />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEngagingLead(null)}
                    disabled={addEngagementMutation.isPending}
                  >
                    {tc("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={addEngagementMutation.isPending}
                    className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                  >
                    {addEngagementMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                    {t("engagementDialog.logEngagement")}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert dialog */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          {convertingLead && (
            <>
              <DialogHeader>
                <DialogTitle>{t("convertDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("convertDialog.desc", { name: `${convertingLead.firstName} ${convertingLead.lastName}` })}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={convertForm.handleSubmit(onSubmitConvert)} className="space-y-4">
                {convertError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {convertError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("convertDialog.phone")} {convertingLead.phone ? "" : "*"}
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 890"
                      disabled={convertLeadMutation.isPending}
                      {...convertForm.register("phone")}
                    />
                    <FieldError message={convertForm.formState.errors.phone?.message} />
                    {!convertingLead.phone && (
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                        {t("convertDialog.phoneRequiredHint")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("convertDialog.address")}
                    </label>
                    <Input
                      placeholder="Street, City"
                      disabled={convertLeadMutation.isPending}
                      {...convertForm.register("address")}
                    />
                    <FieldError message={convertForm.formState.errors.address?.message} />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#3F51B5]"
                    disabled={convertLeadMutation.isPending}
                    {...convertForm.register("createOpportunity")}
                  />
                  {t("convertDialog.createOpportunity")}
                </label>

                {watchCreateOpportunity && (
                  <div className="space-y-4 border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        {t("convertDialog.dealName")}
                      </label>
                      <Input
                        disabled={convertLeadMutation.isPending}
                        {...convertForm.register("opportunityName")}
                      />
                      <FieldError message={convertForm.formState.errors.opportunityName?.message} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {t("convertDialog.amount")}
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          disabled={convertLeadMutation.isPending}
                          {...convertForm.register("amount", {
                            setValueAs: (v: string) => (v === "" || v === null ? undefined : Number(v)),
                          })}
                        />
                        <FieldError message={convertForm.formState.errors.amount?.message} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {t("convertDialog.expectedClose")}
                        </label>
                        <Input
                          type="date"
                          disabled={convertLeadMutation.isPending}
                          {...convertForm.register("expectedCloseDate")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                          {t("convertDialog.stage")}
                        </label>
                        <select
                          className={inputClasses}
                          disabled={convertLeadMutation.isPending}
                          {...convertForm.register("stage")}
                        >
                          <option value="discovery">{t("convertDialog.discovery")}</option>
                          <option value="proposal">{t("convertDialog.proposal")}</option>
                          <option value="negotiation">{t("convertDialog.negotiation")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConvertingLead(null)}
                    disabled={convertLeadMutation.isPending}
                  >
                    {tc("cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={convertLeadMutation.isPending}
                    className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                  >
                    {convertLeadMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                    {t("convertDialog.convertLead")}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign owner / team dialog */}
      <Dialog open={!!assigningLead} onOpenChange={(open) => !open && setAssigningLead(null)}>
        <DialogContent className="max-w-md">
          {assigningLead && (
            <>
              <DialogHeader>
                <DialogTitle>{t("assignDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("assignDialog.desc", { name: `${assigningLead.firstName} ${assigningLead.lastName}` })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {assignError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {assignError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("assignDialog.team")}
                  </label>
                  <select
                    className={inputClasses}
                    value={assignTeamId}
                    disabled={assignLeadMutation.isPending || assignTeamsQuery.isLoading}
                    onChange={(e) => {
                      const teamId = e.target.value;
                      setAssignTeamId(teamId);
                      // Owner must belong to the newly selected team
                      const team = assignTeams.find((tm) => tm.id === teamId);
                      if (
                        teamId &&
                        team &&
                        assignOwnerId &&
                        !team.members.some((m) => m.keycloakId === assignOwnerId)
                      ) {
                        setAssignOwnerId("");
                      }
                    }}
                  >
                    <option value="">{t("assignDialog.noTeam")}</option>
                    {assignTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                        {team.regions.length > 0 ? ` — ${team.regions.join(", ")}` : ""}
                      </option>
                    ))}
                  </select>
                  {assignTeamsQuery.isLoading && (
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">{t("assignDialog.loadingTeams")}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("assignDialog.recordOwner")}
                  </label>
                  <select
                    className={inputClasses}
                    value={assignOwnerId}
                    disabled={assignLeadMutation.isPending || assignStaffQuery.isLoading}
                    onChange={(e) => setAssignOwnerId(e.target.value)}
                  >
                    <option value="">{t("assignDialog.noOwner")}</option>
                    {assignOwnerOptions.map((s) => (
                      <option key={s.keycloakId} value={s.keycloakId}>
                        {staffDisplayName(s)} ({s.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    {assignTeamId
                      ? t("assignDialog.onlyTeamMembers")
                      : t("assignDialog.pickTeamFirst")}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssigningLead(null)}
                  disabled={assignLeadMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignLeadMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignLeadMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("assignDialog.saveAssignment")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingLead} onOpenChange={(open) => !open && setDeletingLead(null)}>
        <DialogContent className="max-w-md">
          {deletingLead && (
            <>
              <DialogHeader>
                <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("deleteDialog.desc", { name: `${deletingLead.firstName} ${deletingLead.lastName}`, email: deletingLead.email })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingLead(null)}
                  disabled={deleteLeadMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteLeadMutation.isPending}>
                  {deleteLeadMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("deleteDialog.deleteLead")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
