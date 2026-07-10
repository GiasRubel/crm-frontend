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
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { useLeads } from "@/features/leads/hooks/useLeads";
import {
  ENGAGEMENT_TYPE_LABELS,
  EngagementType,
  Lead,
  LEAD_SOURCE_LABELS,
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
  new: "bg-sky-50 text-sky-700 border-sky-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  qualified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  unqualified: "bg-slate-100 text-slate-500 border-slate-200",
  converted: "bg-violet-50 text-violet-700 border-violet-200",
};

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[status])}>
      {status}
    </Badge>
  );
}

const ratingStyles: Record<LeadRating, string> = {
  hot: "bg-red-50 text-red-600 border-red-200",
  warm: "bg-amber-50 text-amber-600 border-amber-200",
  cold: "bg-slate-50 text-slate-500 border-slate-200",
};

function ScoreCell({ score, rating }: { score: number; rating: LeadRating }) {
  const barColor =
    rating === "hot" ? "bg-red-500" : rating === "warm" ? "bg-amber-500" : "bg-slate-400";
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-7 text-right">{score}</span>
      <Badge variant="outline" className={cn("capitalize font-semibold text-[10px] px-1.5", ratingStyles[rating])}>
        {rating}
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:text-gray-500";

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
      <ArrowUpDown size={13} className="text-gray-300" />
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
        className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-gray-500 hover:text-gray-800 transition-colors"
      >
        {children}
        {indicator}
      </button>
    </TableHead>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// ── Page ──────────────────────────────────────────────────────────────────────

export function LeadsPage() {
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState("");
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
  const selectedAssignTeam = assignTeams.find((t) => t.id === assignTeamId);
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
    };

    try {
      if (editingLead) {
        await updateLeadMutation.mutateAsync({ id: editingLead.id, data: payload });
        notifySuccess(`Lead "${values.firstName} ${values.lastName}" updated successfully.`);
      } else {
        await createLeadMutation.mutateAsync(payload);
        notifySuccess(`Lead "${values.firstName} ${values.lastName}" created.`);
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingLead(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save lead");
    }
  };

  const setLeadStatus = async (lead: Lead, status: Exclude<LeadStatus, "converted">) => {
    try {
      await updateLeadMutation.mutateAsync({ id: lead.id, data: { status } });
      notifySuccess(`Lead "${lead.firstName} ${lead.lastName}" marked as ${status}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update lead status");
    }
  };

  const handleDelete = async () => {
    if (!deletingLead) return;
    try {
      await deleteLeadMutation.mutateAsync(deletingLead.id);
      notifySuccess(`Lead "${deletingLead.firstName} ${deletingLead.lastName}" was deleted.`);
      setDeletingLead(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete lead");
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
      notifySuccess(`Routing updated for "${assigningLead.firstName} ${assigningLead.lastName}".`);
      setAssigningLead(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to update assignment");
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
        `${ENGAGEMENT_TYPE_LABELS[values.type]} logged for "${engagingLead.firstName} ${engagingLead.lastName}".`,
      );
      setEngagingLead(null);
    } catch (err) {
      setEngagementError(err instanceof Error ? err.message : "Failed to log engagement");
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
      setConvertError("A phone number is required to create the customer profile.");
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
        `Lead "${convertingLead.firstName} ${convertingLead.lastName}" converted — customer profile created${values.createOpportunity ? " and deal added to the pipeline" : ""}.`,
      );
      setConvertingLead(null);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "Failed to convert lead");
    }
  };

  const sortProps = { sortBy, sortOrder, onToggle: toggleSort };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Leads</h1>
            <p className="text-sm text-gray-500">
              Capture, score, qualify, and convert potential business.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
            <Plus size={18} />
            Add Lead
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats?.total} icon={TrendingUp} accent="bg-[#3F51B5]/10 text-[#3F51B5]" />
          <StatCard label="New" value={stats?.new} icon={UserPlus} accent="bg-sky-50 text-sky-600" />
          <StatCard label="Hot" value={stats?.hot} icon={Flame} accent="bg-red-50 text-red-600" />
          <StatCard label="Qualified" value={stats?.qualified} icon={ThumbsUp} accent="bg-emerald-50 text-emerald-600" />
          <StatCard label="Converted" value={stats?.converted} icon={Target} accent="bg-violet-50 text-violet-600" />
          <StatCard
            label="Conv. Rate"
            value={stats ? `${stats.conversionRate}%` : undefined}
            icon={ArrowRightLeft}
            accent="bg-amber-50 text-amber-600"
          />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || leadsQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (leadsQuery.error instanceof Error ? leadsQuery.error.message : "Failed to load leads")}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (leadsQuery.isError) leadsQuery.refetch();
              }}
              className="text-red-500 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filters & Table */}
        <Card className="py-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                type="text"
                placeholder="Search by name, email, company, or phone..."
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
                <Loader2 size={16} className="animate-spin text-gray-400" />
              )}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as LeadStatus | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
                <option value="converted">Converted</option>
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value as LeadSource | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Sources</option>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
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
                <option value="">Any Rating</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75">
                  <SortableHead field="lastName" className="px-6" {...sortProps}>Lead</SortableHead>
                  <SortableHead field="company" className="px-6" {...sortProps}>Company</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Source
                  </TableHead>
                  <SortableHead field="score" className="px-6" {...sortProps}>Score</SortableHead>
                  <SortableHead field="status" className="px-6" {...sortProps}>Status</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Assigned To
                  </TableHead>
                  <SortableHead field="createdAt" className="px-6" {...sortProps}>Created</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Fetching leads...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <TrendingUp size={32} className="text-gray-300" />
                        <p className="font-medium">No leads found</p>
                        <p className="text-sm text-gray-400">
                          {debouncedSearch || statusFilter || sourceFilter || ratingFilter
                            ? "Try adjusting your search or filters."
                            : "Add a lead manually or point your website form at the capture endpoint."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id} className="hover:bg-gray-50/50">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3F51B5]/10 text-[#3F51B5] rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {lead.firstName[0]}
                            {lead.lastName[0]}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 truncate">
                              {lead.firstName} {lead.lastName}
                            </span>
                            <span className="text-xs text-gray-500 truncate">{lead.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600">
                        {lead.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building size={14} className="text-gray-400 shrink-0" />
                            <span className="truncate">{lead.company}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 text-sm">
                        {LEAD_SOURCE_LABELS[lead.source]}
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
                              <span className="text-gray-700 font-medium truncate">{lead.assignedToName}</span>
                            )}
                            {lead.assignedTeamName && (
                              <span className="text-xs text-indigo-600 truncate flex items-center gap-1">
                                <UsersRound size={11} className="shrink-0" />
                                {lead.assignedTeamName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700">
                              <MoreHorizontal size={18} />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingLead(lead)}>
                              <Info size={15} /> View details
                            </DropdownMenuItem>
                            {lead.status !== "converted" && (
                              <>
                                <DropdownMenuItem onClick={() => openEngagement(lead)}>
                                  <MessageSquarePlus size={15} /> Log engagement
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(lead)}>
                                  <Pencil size={15} /> Edit lead
                                </DropdownMenuItem>
                                {isStaffAdmin && (
                                  <DropdownMenuItem onClick={() => openAssign(lead)}>
                                    <UsersRound size={15} /> Assign owner / team
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {lead.status !== "qualified" && lead.status !== "unqualified" && (
                                  <DropdownMenuItem onClick={() => setLeadStatus(lead, "qualified")}>
                                    <ThumbsUp size={15} /> Mark qualified
                                  </DropdownMenuItem>
                                )}
                                {lead.status === "qualified" && (
                                  <DropdownMenuItem onClick={() => openConvert(lead)}>
                                    <ArrowRightLeft size={15} /> Convert to customer
                                  </DropdownMenuItem>
                                )}
                                {lead.status !== "unqualified" && (
                                  <DropdownMenuItem onClick={() => setLeadStatus(lead, "unqualified")}>
                                    <ThumbsDown size={15} /> Mark unqualified
                                  </DropdownMenuItem>
                                )}
                                {lead.status === "unqualified" && (
                                  <DropdownMenuItem onClick={() => setLeadStatus(lead, "new")}>
                                    <ThumbsUp size={15} /> Reopen lead
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeletingLead(lead)}>
                                  <Trash2 size={15} /> Delete lead
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
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span>
                  {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
                  {meta.total} leads
                </span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    resetToFirstPage();
                  }}
                  className={cn(inputClasses, "w-auto py-1 text-xs")}
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
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
                <span className="px-3 text-sm font-bold text-gray-700">
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

      {/* Details dialog */}
      <Dialog open={!!viewingLead} onOpenChange={(open) => !open && setViewingLead(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingLead && (
            <>
              <DialogHeader>
                <DialogTitle>Lead Details</DialogTitle>
                <DialogDescription>Profile, scoring, and engagement history.</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 bg-[#3F51B5]/10 text-[#3F51B5] rounded-full flex items-center justify-center font-bold text-lg uppercase">
                    {viewingLead.firstName[0]}
                    {viewingLead.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 truncate">
                      {viewingLead.firstName} {viewingLead.lastName}
                    </h4>
                    <span className="text-sm text-gray-500">{viewingLead.email}</span>
                  </div>
                  <div className="ml-auto shrink-0 flex flex-col items-end gap-1.5">
                    <StatusBadge status={viewingLead.status} />
                    <Badge
                      variant="outline"
                      className={cn("capitalize font-semibold", ratingStyles[viewingLead.rating])}
                    >
                      <Flame size={11} /> {viewingLead.rating} · {viewingLead.score}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Phone, label: "Phone", value: viewingLead.phone || "—" },
                    { icon: Building, label: "Company", value: viewingLead.company || "—" },
                    { icon: Info, label: "Job Title", value: viewingLead.jobTitle || "—" },
                    { icon: Mail, label: "Source", value: LEAD_SOURCE_LABELS[viewingLead.source] },
                    {
                      icon: Target,
                      label: "Est. Value",
                      value:
                        viewingLead.estimatedValue !== undefined && viewingLead.estimatedValue !== null
                          ? currency.format(viewingLead.estimatedValue)
                          : "—",
                    },
                    {
                      icon: UserPlus,
                      label: "Record Owner",
                      value: viewingLead.assignedToName || "Unassigned",
                    },
                    {
                      icon: UsersRound,
                      label: "Team",
                      value: viewingLead.assignedTeamName || "Unassigned",
                    },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 text-sm text-gray-600">
                      <Icon className="text-gray-400 shrink-0" size={18} />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
                        <p className="font-medium whitespace-pre-wrap break-words">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {viewingLead.status === "converted" && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800">
                    Converted{viewingLead.convertedAt ? ` on ${new Date(viewingLead.convertedAt).toLocaleDateString()}` : ""} —
                    a customer profile{viewingLead.convertedOpportunityId ? " and a pipeline deal were" : " was"} created
                    from this lead.
                  </div>
                )}

                <div className="bg-gray-50/75 p-4 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Notes</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {viewingLead.notes || "No notes for this lead."}
                  </p>
                </div>

                {/* Engagement timeline */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    Engagement History ({viewingLead.engagements.length})
                  </p>
                  {viewingLead.engagements.length === 0 ? (
                    <p className="text-sm text-gray-400">No engagements logged yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {viewingLead.engagements.map((e, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm bg-white border border-gray-100 rounded-lg p-3"
                        >
                          <span
                            className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded shrink-0",
                              e.points > 0 ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {e.points > 0 ? `+${e.points}` : e.points}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800">{ENGAGEMENT_TYPE_LABELS[e.type]}</p>
                            {e.note && <p className="text-gray-500 whitespace-pre-wrap break-words">{e.note}</p>}
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {new Date(e.occurredAt).toLocaleString()}
                              {e.recordedByName ? ` · by ${e.recordedByName}` : ""}
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
                    <MessageSquarePlus size={15} /> Log engagement
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setViewingLead(null)}>
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
            <DialogTitle>{editingLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>
              {editingLead
                ? "Update the lead's contact details, source, or estimated value."
                : "Manually enter a potential customer into the funnel."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <Input disabled={isSaving} {...form.register("firstName")} />
                <FieldError message={form.formState.errors.firstName?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <Input disabled={isSaving} {...form.register("lastName")} />
                <FieldError message={form.formState.errors.lastName?.message} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <Input type="email" placeholder="name@example.com" disabled={isSaving} {...form.register("email")} />
              <FieldError message={form.formState.errors.email?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <Input type="tel" placeholder="+1 234 567 890" disabled={isSaving} {...form.register("phone")} />
                <FieldError message={form.formState.errors.phone?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Company
                </label>
                <Input placeholder="Acme Corp" disabled={isSaving} {...form.register("company")} />
                <FieldError message={form.formState.errors.company?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Job Title
                </label>
                <Input placeholder="Head of Procurement" disabled={isSaving} {...form.register("jobTitle")} />
                <FieldError message={form.formState.errors.jobTitle?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Source
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("source")}>
                  {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Estimated Value (USD)
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder="Context, requirements, next steps..."
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
                {editingLead ? "Update Lead" : "Create Lead"}
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
                <DialogTitle>Log Engagement</DialogTitle>
                <DialogDescription>
                  Record a touchpoint with{" "}
                  <span className="font-semibold text-gray-700">
                    {engagingLead.firstName} {engagingLead.lastName}
                  </span>
                  . The lead score updates automatically.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={engagementForm.handleSubmit(onSubmitEngagement)} className="space-y-4">
                {engagementError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {engagementError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Engagement Type *
                  </label>
                  <select
                    className={inputClasses}
                    disabled={addEngagementMutation.isPending}
                    {...engagementForm.register("type")}
                  >
                    {(Object.entries(ENGAGEMENT_TYPE_LABELS) as [EngagementType, string][]).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Calls, meetings, and email replies move a new lead to &quot;contacted&quot; automatically.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Note
                  </label>
                  <textarea
                    rows={3}
                    disabled={addEngagementMutation.isPending}
                    placeholder="What happened during this touchpoint?"
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addEngagementMutation.isPending}
                    className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                  >
                    {addEngagementMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                    Log Engagement
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
                <DialogTitle>Convert Lead</DialogTitle>
                <DialogDescription>
                  Convert{" "}
                  <span className="font-semibold text-gray-700">
                    {convertingLead.firstName} {convertingLead.lastName}
                  </span>{" "}
                  into a customer. A Keycloak sign-in account is provisioned and an invitation email is sent.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={convertForm.handleSubmit(onSubmitConvert)} className="space-y-4">
                {convertError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {convertError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Phone {convertingLead.phone ? "" : "*"}
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 890"
                      disabled={convertLeadMutation.isPending}
                      {...convertForm.register("phone")}
                    />
                    <FieldError message={convertForm.formState.errors.phone?.message} />
                    {!convertingLead.phone && (
                      <p className="text-[11px] text-gray-400 mt-1">
                        Required — the customer profile needs a phone number.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Address
                    </label>
                    <Input
                      placeholder="Street, City"
                      disabled={convertLeadMutation.isPending}
                      {...convertForm.register("address")}
                    />
                    <FieldError message={convertForm.formState.errors.address?.message} />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#3F51B5]"
                    disabled={convertLeadMutation.isPending}
                    {...convertForm.register("createOpportunity")}
                  />
                  Also create a pipeline opportunity
                </label>

                {watchCreateOpportunity && (
                  <div className="space-y-4 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                        Deal Name
                      </label>
                      <Input
                        disabled={convertLeadMutation.isPending}
                        {...convertForm.register("opportunityName")}
                      />
                      <FieldError message={convertForm.formState.errors.opportunityName?.message} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Amount (USD)
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
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Expected Close
                        </label>
                        <Input
                          type="date"
                          disabled={convertLeadMutation.isPending}
                          {...convertForm.register("expectedCloseDate")}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Stage
                        </label>
                        <select
                          className={inputClasses}
                          disabled={convertLeadMutation.isPending}
                          {...convertForm.register("stage")}
                        >
                          <option value="discovery">Discovery</option>
                          <option value="proposal">Proposal</option>
                          <option value="negotiation">Negotiation</option>
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
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={convertLeadMutation.isPending}
                    className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                  >
                    {convertLeadMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                    Convert Lead
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
                <DialogTitle>Assign Lead</DialogTitle>
                <DialogDescription>
                  Route{" "}
                  <span className="font-semibold text-gray-700">
                    {assigningLead.firstName} {assigningLead.lastName}
                  </span>{" "}
                  to a team and/or a record owner. Team members gain visibility of this record.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {assignError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {assignError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Team
                  </label>
                  <select
                    className={inputClasses}
                    value={assignTeamId}
                    disabled={assignLeadMutation.isPending || assignTeamsQuery.isLoading}
                    onChange={(e) => {
                      const teamId = e.target.value;
                      setAssignTeamId(teamId);
                      // Owner must belong to the newly selected team
                      const team = assignTeams.find((t) => t.id === teamId);
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
                    <option value="">Unassigned (no team)</option>
                    {assignTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                        {team.regions.length > 0 ? ` — ${team.regions.join(", ")}` : ""}
                      </option>
                    ))}
                  </select>
                  {assignTeamsQuery.isLoading && (
                    <p className="text-[11px] text-gray-400 mt-1">Loading teams...</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Record Owner
                  </label>
                  <select
                    className={inputClasses}
                    value={assignOwnerId}
                    disabled={assignLeadMutation.isPending || assignStaffQuery.isLoading}
                    onChange={(e) => setAssignOwnerId(e.target.value)}
                  >
                    <option value="">Unassigned (no owner)</option>
                    {assignOwnerOptions.map((s) => (
                      <option key={s.keycloakId} value={s.keycloakId}>
                        {staffDisplayName(s)} ({s.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {assignTeamId
                      ? "Only members of the selected team can own this record."
                      : "Pick a team first to narrow the list to its members."}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssigningLead(null)}
                  disabled={assignLeadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignLeadMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignLeadMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Save Assignment
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
                <DialogTitle>Delete lead?</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-semibold text-gray-700">
                    {deletingLead.firstName} {deletingLead.lastName}
                  </span>{" "}
                  ({deletingLead.email}) and its engagement history. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingLead(null)}
                  disabled={deleteLeadMutation.isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteLeadMutation.isPending}>
                  {deleteLeadMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Delete Lead
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
