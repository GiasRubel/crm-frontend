"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Bell,
  Calendar,
  CalendarClock,
  CalendarPlus,
  CalendarSync,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Info,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Search,
  StickyNote,
  Trash2,
  Users,
  UsersRound,
  X,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { useActivities } from "@/features/activities/hooks/useActivities";
import {
  Activity,
  ACTIVITY_TYPE_LABELS,
  ActivityPriority,
  ActivityQuery,
  ActivitySortField,
  ActivityStatus,
  ActivityType,
  COMMUNICATION_TYPES,
  DueFilter,
  RELATED_TYPE_LABELS,
} from "@/features/activities/types";
import { downloadIcs, googleCalendarUrl } from "@/features/activities/calendar";
import { leadApi } from "@/features/leads/services/leadApi";
import { contactApi } from "@/features/contacts/services/contactApi";
import { customerApi } from "@/features/customers/services/customerApi";
import { accountApi } from "@/features/accounts/services/accountApi";
import { opportunityApi } from "@/features/opportunities/services/opportunityApi";
import { ticketApi } from "@/features/tickets/services/ticketApi";
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

// ── Form schema ───────────────────────────────────────────────────────────────

const activityFormSchema = z.object({
  type: z.enum(["task", "call", "email", "meeting", "sms", "note"]),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().max(4000).optional(),
  priority: z.enum(["low", "normal", "high"]),
  direction: z.enum(["inbound", "outbound"]).optional().or(z.literal("")),
  dueAt: z.string().optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  remindAt: z.string().optional(),
  relatedType: z
    .enum(["lead", "contact", "customer", "account", "opportunity", "ticket"])
    .optional()
    .or(z.literal("")),
  relatedId: z.string().optional(),
  alreadyHappened: z.boolean(),
});

type ActivityFormValues = z.infer<typeof activityFormSchema>;

const emptyFormValues: ActivityFormValues = {
  type: "task",
  subject: "",
  description: "",
  priority: "normal",
  direction: "outbound",
  dueAt: "",
  startAt: "",
  endAt: "",
  remindAt: "",
  relatedType: "",
  relatedId: "",
  alreadyHappened: true,
};

// ── Presentational helpers ────────────────────────────────────────────────────

const typeIcons: Record<ActivityType, React.ElementType> = {
  task: CheckSquare,
  call: Phone,
  email: Mail,
  meeting: Users,
  sms: MessageSquare,
  note: StickyNote,
};

const typeAccents: Record<ActivityType, string> = {
  task: "bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300",
  call: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  email: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
  meeting: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  sms: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  note: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const statusStyles: Record<ActivityStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800",
};

const priorityStyles: Record<ActivityPriority, string> = {
  high: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  normal: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800",
  low: "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-800",
};

function StatusBadge({ activity }: { activity: Activity }) {
  const t = useTranslations("activities");
  if (activity.overdue) {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30 font-semibold gap-1">
        <AlertTriangle size={11} /> {t("overdue")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[activity.status])}>
      {t(activity.status)}
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
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 dark:disabled:bg-slate-800/50 disabled:text-gray-500 dark:disabled:text-slate-400";

function SortableHead({
  field,
  sortBy,
  sortOrder,
  onToggle,
  children,
  className,
}: {
  field: ActivitySortField;
  sortBy: ActivitySortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: ActivitySortField) => void;
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

/** date-time-local input value → ISO string (or undefined). */
function toIso(value?: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

/** ISO string → value usable in a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ActivitiesPage() {
  const t = useTranslations("activities");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";
  const myKeycloakId = user?.keycloakId ?? "";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "">("");
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | "">("");
  const [dueFilter, setDueFilter] = useState<DueFilter | "">("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<ActivitySortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: ActivityQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      type: typeFilter,
      status: statusFilter,
      due: dueFilter,
      assignedToId: onlyMine ? myKeycloakId : undefined,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, typeFilter, statusFilter, dueFilter, onlyMine, myKeycloakId, sortBy, sortOrder],
  );

  const {
    activitiesQuery,
    statsQuery,
    createActivityMutation,
    updateActivityMutation,
    setStatusMutation,
    assignActivityMutation,
    deleteActivityMutation,
  } = useActivities(query);

  const activities = activitiesQuery.data?.data ?? [];
  const meta = activitiesQuery.data?.meta;
  const stats = statsQuery.data;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [viewingActivity, setViewingActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [assigningActivity, setAssigningActivity] = useState<Activity | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ActivityFormValues>({
    resolver: standardSchemaResolver(activityFormSchema),
    defaultValues: emptyFormValues,
  });

  const watchType = form.watch("type");
  const watchRelatedType = form.watch("relatedType");
  const watchAlreadyHappened = form.watch("alreadyHappened");
  const isCommunication = COMMUNICATION_TYPES.includes(watchType);
  const isSaving = createActivityMutation.isPending || updateActivityMutation.isPending;

  // Related-record picker — fetched only for the selected type while the form is open
  const relatedPickerQuery = useQuery({
    queryKey: ["activities", "related-picker", watchRelatedType],
    queryFn: async (): Promise<{ id: string; label: string }[]> => {
      switch (watchRelatedType) {
        case "lead":
          return (await leadApi.getAll({ limit: 100, sortBy: "lastName", sortOrder: "asc" })).data.map(
            (l) => ({ id: l.id, label: `${l.firstName} ${l.lastName} (${l.email})` }),
          );
        case "contact":
          return (
            await contactApi.getAll({ limit: 100, sortBy: "lastName", sortOrder: "asc" })
          ).data.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName} (${c.email})` }));
        case "customer":
          return (
            await customerApi.getAll({ limit: 100, sortBy: "firstName", sortOrder: "asc" })
          ).data.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName} (${c.email})` }));
        case "account":
          return (await accountApi.getAll({ limit: 100, sortBy: "name", sortOrder: "asc" })).data.map(
            (a) => ({ id: a.id, label: a.name }),
          );
        case "opportunity":
          return (
            await opportunityApi.getAll({ limit: 100, sortBy: "name", sortOrder: "asc" })
          ).data.map((o) => ({ id: o.id, label: o.name }));
        case "ticket":
          return (
            await ticketApi.getAll({ limit: 100, sortBy: "updatedAt", sortOrder: "desc" })
          ).data.map((tk) => ({ id: tk.id, label: `${tk.number} — ${tk.subject}` }));
        default:
          return [];
      }
    },
    enabled: formOpen && !!watchRelatedType,
  });
  const relatedOptions = relatedPickerQuery.data ?? [];

  // Assignment pickers — only fetched while the assign dialog is open
  const assignDialogOpen = isStaffAdmin && !!assigningActivity;
  const assignStaffQuery = useQuery({
    queryKey: ["users", "staff"],
    queryFn: () => userApi.getStaff(),
    enabled: assignDialogOpen,
  });
  const assignTeamsQuery = useQuery({
    queryKey: ["teams", "list", { limit: 100, isActive: true }],
    queryFn: () => teamApi.getAll({ limit: 100, isActive: true }),
    enabled: assignDialogOpen,
  });
  const assignTeams = assignTeamsQuery.data?.data ?? [];

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: ActivitySortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "subject" || field === "type" ? "asc" : "desc");
    }
    resetToFirstPage();
  };

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setEditingActivity(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (activity: Activity) => {
    form.reset({
      type: activity.type,
      subject: activity.subject,
      description: activity.description ?? "",
      priority: activity.priority,
      direction: activity.direction ?? "outbound",
      dueAt: toLocalInput(activity.dueAt),
      startAt: toLocalInput(activity.startAt),
      endAt: toLocalInput(activity.endAt),
      remindAt: toLocalInput(activity.remindAt),
      relatedType: activity.relatedType ?? "",
      relatedId: activity.relatedId ?? "",
      alreadyHappened: activity.status === "completed",
    });
    setEditingActivity(activity);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingActivity(null);
    setFormError(null);
  };

  const onSubmit = async (values: ActivityFormValues) => {
    setFormError(null);

    if (values.relatedType && !values.relatedId) {
      setFormError(t("toasts.pickRecordOrClear"));
      return;
    }

    try {
      if (editingActivity) {
        await updateActivityMutation.mutateAsync({
          id: editingActivity.id,
          data: {
            subject: values.subject,
            description: values.description?.trim() || undefined,
            priority: values.priority,
            direction:
              COMMUNICATION_TYPES.includes(editingActivity.type) && values.direction
                ? values.direction
                : undefined,
            dueAt: toIso(values.dueAt) ?? null,
            startAt: toIso(values.startAt) ?? null,
            endAt: toIso(values.endAt) ?? null,
            remindAt: toIso(values.remindAt) ?? null,
          },
        });
        notifySuccess(t("toasts.updated", { subject: values.subject }));
      } else {
        const isComm = COMMUNICATION_TYPES.includes(values.type);
        await createActivityMutation.mutateAsync({
          type: values.type,
          subject: values.subject,
          description: values.description?.trim() || undefined,
          priority: values.priority,
          direction: isComm && values.direction ? values.direction : undefined,
          status: isComm ? (values.alreadyHappened ? "completed" : "pending") : "pending",
          dueAt: toIso(values.dueAt),
          startAt: toIso(values.startAt),
          endAt: toIso(values.endAt),
          remindAt: toIso(values.remindAt),
          relatedType: values.relatedType || undefined,
          relatedId: values.relatedType ? values.relatedId || undefined : undefined,
        });
        notifySuccess(
          isComm && values.alreadyHappened
            ? values.relatedType
              ? t("toasts.loggedWithTimeline", { type: ACTIVITY_TYPE_LABELS[values.type] })
              : t("toasts.logged", { type: ACTIVITY_TYPE_LABELS[values.type] })
            : t("toasts.created", { type: ACTIVITY_TYPE_LABELS[values.type], subject: values.subject }),
        );
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingActivity(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("toasts.saveFailed"));
    }
  };

  const changeStatus = async (activity: Activity, status: ActivityStatus) => {
    try {
      await setStatusMutation.mutateAsync({ id: activity.id, data: { status } });
      notifySuccess(
        status === "completed"
          ? t("toasts.markedDone", { subject: activity.subject })
          : status === "pending"
            ? t("toasts.reopened", { subject: activity.subject })
            : t("toasts.activityCancelled", { subject: activity.subject }),
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.statusFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deletingActivity) return;
    try {
      await deleteActivityMutation.mutateAsync(deletingActivity.id);
      notifySuccess(t("toasts.deleted", { subject: deletingActivity.subject }));
      setDeletingActivity(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.deleteFailed"));
      setDeletingActivity(null);
    }
  };

  const openAssign = (activity: Activity) => {
    setAssignOwnerId(activity.assignedToId);
    setAssignTeamId(activity.assignedTeamId ?? "");
    setAssignError(null);
    setAssigningActivity(activity);
  };

  const handleAssign = async () => {
    if (!assigningActivity) return;
    if (!assignOwnerId) {
      setAssignError(t("toasts.needsAssignee"));
      return;
    }
    setAssignError(null);
    try {
      await assignActivityMutation.mutateAsync({
        id: assigningActivity.id,
        data: {
          assignedToId: assignOwnerId,
          assignedTeamId: assignTeamId || null,
        },
      });
      notifySuccess(t("toasts.reassigned", { subject: assigningActivity.subject }));
      setAssigningActivity(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : t("toasts.reassignFailed"));
    }
  };

  const handleDownloadIcs = async (activity: Activity) => {
    try {
      await downloadIcs(activity);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.icsFailed"));
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
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/activities/calendar-sync">
                <CalendarSync size={18} />
                {t("calendarSync")}
              </Link>
            </Button>
            <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
              <Plus size={18} />
              {t("newActivity")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label={t("stats.openTasks")} value={stats?.openTasks} icon={CheckSquare} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard label={t("stats.overdue")} value={stats?.overdue} icon={AlertTriangle} accent="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
          <StatCard label={t("stats.dueToday")} value={stats?.dueToday} icon={CalendarClock} accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
          <StatCard label={t("stats.reminders")} value={stats?.remindersDue} icon={Bell} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
          <StatCard label={t("stats.meetings7d")} value={stats?.upcomingMeetings} icon={Users} accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" />
          <StatCard label={t("stats.doneMonth")} value={stats?.completedThisMonth} icon={CheckCircle2} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || activitiesQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (activitiesQuery.error instanceof Error
                    ? activitiesQuery.error.message
                    : t("loadFailed"))}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (activitiesQuery.isError) activitiesQuery.refetch();
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
            <div className="relative w-full md:max-w-sm">
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
              {activitiesQuery.isFetching && !activitiesQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#3F51B5]"
                  checked={onlyMine}
                  onChange={(e) => {
                    setOnlyMine(e.target.checked);
                    resetToFirstPage();
                  }}
                />
                {t("assignedToMe")}
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as ActivityType | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("allTypes")}</option>
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ActivityStatus | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("allStatuses")}</option>
                <option value="pending">{t("pending")}</option>
                <option value="completed">{t("completed")}</option>
                <option value="cancelled">{t("cancelled")}</option>
              </select>
              <select
                value={dueFilter}
                onChange={(e) => {
                  setDueFilter(e.target.value as DueFilter | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("anyDueDate")}</option>
                <option value="overdue">{t("overdueOption")}</option>
                <option value="today">{t("dueTodayOption")}</option>
                <option value="week">{t("dueThisWeek")}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  <SortableHead field="subject" className="px-6" {...sortProps}>{t("table.activity")}</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.relatedTo")}
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.assignedTo")}
                  </TableHead>
                  <SortableHead field="dueAt" className="px-6" {...sortProps}>{t("table.dueScheduled")}</SortableHead>
                  <SortableHead field="priority" className="px-6" {...sortProps}>{t("table.priority")}</SortableHead>
                  <SortableHead field="status" className="px-6" {...sortProps}>{t("table.status")}</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>{t("fetchingActivities")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <CalendarClock size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">{t("noActivitiesFound")}</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {debouncedSearch || typeFilter || statusFilter || dueFilter || onlyMine
                            ? t("adjustFilters")
                            : t("createFirst")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity) => {
                    const TypeIcon = typeIcons[activity.type];
                    const when = activity.startAt ?? activity.dueAt;
                    return (
                      <TableRow key={activity.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                                typeAccents[activity.type],
                              )}
                            >
                              <TypeIcon size={16} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <button
                                type="button"
                                onClick={() => setViewingActivity(activity)}
                                className={cn(
                                  "font-semibold text-left truncate max-w-[280px] hover:text-[#3F51B5] transition-colors",
                                  activity.status === "completed" || activity.status === "cancelled"
                                    ? "text-gray-400 dark:text-slate-500 line-through"
                                    : "text-gray-900 dark:text-white",
                                )}
                              >
                                {activity.subject}
                              </button>
                              <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                {ACTIVITY_TYPE_LABELS[activity.type]}
                                {activity.direction &&
                                  (activity.direction === "inbound" ? (
                                    <ArrowDownLeft size={11} className="text-emerald-500 dark:text-emerald-400" />
                                  ) : (
                                    <ArrowUpRight size={11} className="text-sky-500 dark:text-sky-400" />
                                  ))}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          {activity.relatedType && activity.relatedName ? (
                            <div className="flex flex-col min-w-0">
                              <span className="text-gray-700 dark:text-slate-200 font-medium truncate flex items-center gap-1.5">
                                <Link2 size={12} className="text-gray-400 dark:text-slate-500 shrink-0" />
                                {activity.relatedName}
                              </span>
                              <span className="text-xs text-gray-400 dark:text-slate-500">
                                {RELATED_TYPE_LABELS[activity.relatedType]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {activity.assignedToName ? (
                            <div className="flex flex-col min-w-0">
                              <span className="text-gray-700 dark:text-slate-200 font-medium truncate">
                                {activity.assignedToName}
                              </span>
                              {activity.assignedTeamName && (
                                <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                                  <UsersRound size={11} className="shrink-0" />
                                  {activity.assignedTeamName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">{activity.assignedToId}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm">
                          {when ? (
                            <span className={cn("flex items-center gap-1.5", activity.overdue ? "text-red-600 dark:text-red-400 font-semibold" : "text-gray-600 dark:text-slate-300")}>
                              <Calendar size={13} className="shrink-0" />
                              {new Date(when).toLocaleString([], {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={cn("capitalize font-semibold", priorityStyles[activity.priority])}>
                            {t(activity.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <StatusBadge activity={activity} />
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {activity.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title={t("markAsDone")}
                                className="text-gray-400 hover:text-emerald-600 dark:text-slate-500 dark:hover:text-emerald-400"
                                onClick={() => changeStatus(activity, "completed")}
                                disabled={setStatusMutation.isPending}
                              >
                                <CheckCircle2 size={17} />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200">
                                  <MoreHorizontal size={18} />
                                  <span className="sr-only">{t("openActions")}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setViewingActivity(activity)}>
                                  <Info size={15} /> {t("viewDetails")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(activity)}>
                                  <Pencil size={15} /> {t("edit")}
                                </DropdownMenuItem>
                                {(activity.startAt || activity.dueAt) && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleDownloadIcs(activity)}>
                                      <Download size={15} /> {t("downloadIcs")}
                                    </DropdownMenuItem>
                                    {googleCalendarUrl(activity) && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          window.open(googleCalendarUrl(activity)!, "_blank", "noopener")
                                        }
                                      >
                                        <CalendarPlus size={15} /> {t("addToGoogleCalendar")}
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                                {activity.status !== "pending" ? (
                                  <DropdownMenuItem onClick={() => changeStatus(activity, "pending")}>
                                    <RotateCcw size={15} /> {t("reopen")}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => changeStatus(activity, "cancelled")}>
                                    <XCircle size={15} /> {t("cancelActivity")}
                                  </DropdownMenuItem>
                                )}
                                {isStaffAdmin && (
                                  <>
                                    <DropdownMenuItem onClick={() => openAssign(activity)}>
                                      <UsersRound size={15} /> {t("reassign")}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onClick={() => setDeletingActivity(activity)}
                                    >
                                      <Trash2 size={15} /> {t("deleteActivity")}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination footer */}
          {!activitiesQuery.isLoading && meta && meta.total > 0 && (
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
      <Dialog open={!!viewingActivity} onOpenChange={(open) => !open && setViewingActivity(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingActivity && (
            <>
              <DialogHeader>
                <DialogTitle>{t("details.title")}</DialogTitle>
                <DialogDescription>
                  {ACTIVITY_TYPE_LABELS[viewingActivity.type]}
                  {viewingActivity.direction ? ` · ${viewingActivity.direction}` : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      typeAccents[viewingActivity.type],
                    )}
                  >
                    {React.createElement(typeIcons[viewingActivity.type], { size: 22 })}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{viewingActivity.subject}</h4>
                    {viewingActivity.relatedName && viewingActivity.relatedType && (
                      <span className="text-sm text-gray-500 dark:text-slate-400">
                        {RELATED_TYPE_LABELS[viewingActivity.relatedType]}: {viewingActivity.relatedName}
                      </span>
                    )}
                  </div>
                  <div className="ml-auto shrink-0">
                    <StatusBadge activity={viewingActivity} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: Calendar,
                      label: t("details.due"),
                      value: viewingActivity.dueAt
                        ? new Date(viewingActivity.dueAt).toLocaleString()
                        : "—",
                    },
                    {
                      icon: CalendarClock,
                      label: t("details.scheduled"),
                      value: viewingActivity.startAt
                        ? `${new Date(viewingActivity.startAt).toLocaleString()}${viewingActivity.endAt ? ` → ${new Date(viewingActivity.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`
                        : "—",
                    },
                    {
                      icon: Bell,
                      label: t("details.reminder"),
                      value: viewingActivity.remindAt
                        ? new Date(viewingActivity.remindAt).toLocaleString()
                        : "—",
                    },
                    {
                      icon: CheckCircle2,
                      label: t("details.completed"),
                      value: viewingActivity.completedAt
                        ? new Date(viewingActivity.completedAt).toLocaleString()
                        : "—",
                    },
                    {
                      icon: Users,
                      label: t("details.assignedTo"),
                      value: viewingActivity.assignedToName ?? viewingActivity.assignedToId,
                    },
                    {
                      icon: UsersRound,
                      label: t("details.team"),
                      value: viewingActivity.assignedTeamName ?? t("details.unassigned"),
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

                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{t("details.notes")}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                    {viewingActivity.description || t("details.noNotes")}
                  </p>
                </div>

                <div className="text-[11px] text-gray-400 dark:text-slate-500 space-y-1 border-t border-gray-100 dark:border-slate-800 pt-4">
                  <p>
                    <span className="font-bold">{t("details.createdBy")}</span>{" "}
                    {viewingActivity.createdByName ?? viewingActivity.createdBy} ·{" "}
                    {viewingActivity.createdAt ? new Date(viewingActivity.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <DialogFooter>
                {(viewingActivity.startAt || viewingActivity.dueAt) && (
                  <Button variant="outline" onClick={() => handleDownloadIcs(viewingActivity)}>
                    <Download size={15} /> {t("details.ics")}
                  </Button>
                )}
                {viewingActivity.status === "pending" && (
                  <Button
                    variant="outline"
                    className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                    onClick={() => {
                      const target = viewingActivity;
                      setViewingActivity(null);
                      changeStatus(target, "completed");
                    }}
                  >
                    <CheckCircle2 size={15} /> {t("details.markDone")}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setViewingActivity(null)}>
                  {t("details.close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActivity ? t("form.editTitle") : t("form.addTitle")}</DialogTitle>
            <DialogDescription>
              {editingActivity ? t("form.editDesc") : t("form.addDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.type")}
                </label>
                <select
                  disabled={isSaving || !!editingActivity}
                  className={inputClasses}
                  {...form.register("type")}
                >
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.priority")}
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("priority")}>
                  <option value="low">{t("form.low")}</option>
                  <option value="normal">{t("form.normal")}</option>
                  <option value="high">{t("form.high")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.subject")}
              </label>
              <Input
                placeholder={watchType === "task" ? t("form.subjectPlaceholderTask") : t("form.subjectPlaceholderComm")}
                disabled={isSaving}
                {...form.register("subject")}
              />
              <FieldError message={form.formState.errors.subject?.message} />
            </div>

            {isCommunication && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("form.direction")}
                  </label>
                  <select disabled={isSaving || watchType === "note"} className={inputClasses} {...form.register("direction")}>
                    <option value="outbound">{t("form.outbound")}</option>
                    <option value="inbound">{t("form.inbound")}</option>
                  </select>
                </div>
                {!editingActivity && (
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-[#3F51B5]"
                      disabled={isSaving}
                      {...form.register("alreadyHappened")}
                    />
                    {t("form.alreadyHappened")}
                  </label>
                )}
              </div>
            )}

            {/* Related record */}
            {!editingActivity && (
              <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-3">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  {t("form.relatedRecord")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    className={inputClasses}
                    disabled={isSaving}
                    {...form.register("relatedType", {
                      onChange: () => form.setValue("relatedId", ""),
                    })}
                  >
                    <option value="">{t("form.notLinked")}</option>
                    {Object.entries(RELATED_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    className={inputClasses}
                    disabled={isSaving || !watchRelatedType || relatedPickerQuery.isLoading}
                    {...form.register("relatedId")}
                  >
                    <option value="">
                      {!watchRelatedType
                        ? t("form.pickTypeFirst")
                        : relatedPickerQuery.isLoading
                          ? t("form.loading")
                          : t("form.selectRecord")}
                    </option>
                    {relatedOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {t("form.relatedHint")}
                </p>
              </div>
            )}

            {/* Scheduling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(watchType === "task" || !isCommunication) && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("form.dueDate")}
                  </label>
                  <Input type="datetime-local" disabled={isSaving} {...form.register("dueAt")} />
                </div>
              )}
              {(watchType === "meeting" || watchType === "call" || !watchAlreadyHappened || !!editingActivity) &&
                isCommunication && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        {t("form.scheduledStart")}
                      </label>
                      <Input type="datetime-local" disabled={isSaving} {...form.register("startAt")} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        {t("form.scheduledEnd")}
                      </label>
                      <Input type="datetime-local" disabled={isSaving} {...form.register("endAt")} />
                    </div>
                  </>
                )}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.reminder")}
                </label>
                <Input type="datetime-local" disabled={isSaving} {...form.register("remindAt")} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.notes")}
              </label>
              <textarea
                rows={3}
                disabled={isSaving}
                placeholder={t("form.notesPlaceholder")}
                className={cn(inputClasses, "resize-none")}
                {...form.register("description")}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingActivity ? t("form.updateActivity") : t("form.createActivity")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reassign dialog */}
      <Dialog open={!!assigningActivity} onOpenChange={(open) => !open && setAssigningActivity(null)}>
        <DialogContent className="max-w-md">
          {assigningActivity && (
            <>
              <DialogHeader>
                <DialogTitle>{t("reassignDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("reassignDialog.desc", { subject: assigningActivity.subject })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {assignError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {assignError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("reassignDialog.assignee")}
                  </label>
                  <select
                    className={inputClasses}
                    value={assignOwnerId}
                    disabled={assignActivityMutation.isPending || assignStaffQuery.isLoading}
                    onChange={(e) => setAssignOwnerId(e.target.value)}
                  >
                    <option value="">{t("reassignDialog.selectStaff")}</option>
                    {(assignStaffQuery.data ?? []).map((s) => (
                      <option key={s.keycloakId} value={s.keycloakId}>
                        {staffDisplayName(s)} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("reassignDialog.team")}
                  </label>
                  <select
                    className={inputClasses}
                    value={assignTeamId}
                    disabled={assignActivityMutation.isPending || assignTeamsQuery.isLoading}
                    onChange={(e) => setAssignTeamId(e.target.value)}
                  >
                    <option value="">{t("reassignDialog.noTeam")}</option>
                    {assignTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    {t("reassignDialog.teamHint")}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssigningActivity(null)}
                  disabled={assignActivityMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignActivityMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignActivityMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("reassignDialog.save")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingActivity} onOpenChange={(open) => !open && setDeletingActivity(null)}>
        <DialogContent className="max-w-md">
          {deletingActivity && (
            <>
              <DialogHeader>
                <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("deleteDialog.desc", { subject: deletingActivity.subject })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingActivity(null)}
                  disabled={deleteActivityMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteActivityMutation.isPending}
                >
                  {deleteActivityMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("deleteDialog.deleteActivity")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
