"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Globe2,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { useTeams } from "@/features/teams/hooks/useTeams";
import { Team, TeamQuery, TeamSortField } from "@/features/teams/types";
import { useStaffUsers } from "@/features/users/hooks/useStaffUsers";
import { StaffUser, staffDisplayName } from "@/features/users/types";
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

const teamFormSchema = z
  .object({
    name: z.string().trim().min(1, "Team name is required").max(100),
    description: z.string().max(500).optional(),
    regionsText: z.string().max(1000).optional(),
    memberIds: z.array(z.string()).max(100, "A team can have at most 100 members"),
    leaderId: z.string().optional(),
    isActive: z.enum(["active", "inactive"]),
  })
  .refine((v) => !v.leaderId || v.memberIds.includes(v.leaderId), {
    message: "The team lead must be one of the selected members",
    path: ["leaderId"],
  });

type TeamFormValues = z.infer<typeof teamFormSchema>;

const emptyFormValues: TeamFormValues = {
  name: "",
  description: "",
  regionsText: "",
  memberIds: [],
  leaderId: "",
  isActive: "active",
};

function parseRegions(text?: string): string[] {
  return [
    ...new Set(
      (text ?? "")
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    ),
  ];
}

// ── Small presentational helpers ──────────────────────────────────────────────

function ActiveBadge({ isActive }: { isActive: boolean }) {
  const t = useTranslations("teams");
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize font-semibold",
        isActive
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
      )}
    >
      {isActive ? t("active") : t("inactive")}
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
  value: number | undefined;
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
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:text-gray-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

function SortableHead({
  field,
  sortBy,
  sortOrder,
  onToggle,
  children,
  className,
}: {
  field: TeamSortField;
  sortBy: TeamSortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: TeamSortField) => void;
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
        className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
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

function RegionBadges({ regions }: { regions: string[] }) {
  if (regions.length === 0) return <span className="text-gray-300 dark:text-slate-600">—</span>;
  const visible = regions.slice(0, 3);
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((region) => (
        <Badge
          key={region}
          variant="outline"
          className="bg-indigo-50 text-indigo-700 border-indigo-200 font-medium dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30"
        >
          {region}
        </Badge>
      ))}
      {regions.length > 3 && (
        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700">
          +{regions.length - 3}
        </Badge>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TeamsPage() {
  const t = useTranslations("teams");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<TeamSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: TeamQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      isActive: activeFilter === "" ? "" : activeFilter === "true",
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, activeFilter, sortBy, sortOrder],
  );

  const { teamsQuery, statsQuery, createTeamMutation, updateTeamMutation, deleteTeamMutation } =
    useTeams(query);
  const staffQuery = useStaffUsers();

  const teams = teamsQuery.data?.data ?? [];
  const meta = teamsQuery.data?.meta;
  const stats = statsQuery.data;
  const staff = useMemo(() => staffQuery.data ?? [], [staffQuery.data]);

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [viewingTeam, setViewingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  const form = useForm<TeamFormValues>({
    resolver: standardSchemaResolver(teamFormSchema),
    defaultValues: emptyFormValues,
  });

  const selectedMemberIds = form.watch("memberIds");
  const selectedLeaderId = form.watch("leaderId");

  const staffByKeycloakId = useMemo(
    () => new Map(staff.map((s) => [s.keycloakId, s])),
    [staff],
  );

  const filteredStaff = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return staff;
    return staff.filter((s) =>
      `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(term),
    );
  }, [staff, memberSearch]);

  const selectedMembers = useMemo(
    () =>
      selectedMemberIds
        .map((id) => staffByKeycloakId.get(id))
        .filter((s): s is StaffUser => !!s),
    [selectedMemberIds, staffByKeycloakId],
  );

  const isSaving = createTeamMutation.isPending || updateTeamMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: TeamSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
    resetToFirstPage();
  };

  const toggleMember = (keycloakId: string) => {
    const current = form.getValues("memberIds");
    const next = current.includes(keycloakId)
      ? current.filter((id) => id !== keycloakId)
      : [...current, keycloakId];
    form.setValue("memberIds", next, { shouldValidate: true });
    // Removing the lead from the members clears the lead selection
    if (!next.includes(form.getValues("leaderId") ?? "")) {
      form.setValue("leaderId", "");
    }
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setEditingTeam(null);
    setFormError(null);
    setMemberSearch("");
    setFormOpen(true);
  };

  const openEdit = (team: Team) => {
    form.reset({
      name: team.name,
      description: team.description ?? "",
      regionsText: team.regions.join(", "),
      memberIds: team.members.map((m) => m.keycloakId),
      leaderId: team.leaderId ?? "",
      isActive: team.isActive ? "active" : "inactive",
    });
    setEditingTeam(team);
    setFormError(null);
    setMemberSearch("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingTeam(null);
    setFormError(null);
  };

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const onSubmit = async (values: TeamFormValues) => {
    setFormError(null);
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      regions: parseRegions(values.regionsText),
      memberIds: values.memberIds,
      leaderId: values.leaderId || null,
      isActive: values.isActive === "active",
    };

    try {
      if (editingTeam) {
        await updateTeamMutation.mutateAsync({ id: editingTeam.id, data: payload });
        notifySuccess(t("toasts.updated", { name: payload.name }));
      } else {
        await createTeamMutation.mutateAsync(payload);
        notifySuccess(t("toasts.created", { name: payload.name }));
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingTeam(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("toasts.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deletingTeam) return;
    try {
      await deleteTeamMutation.mutateAsync(deletingTeam.id);
      notifySuccess(
        t("toasts.deleted", { name: deletingTeam.name, count: deletingTeam.customerCount }),
      );
      setDeletingTeam(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.deleteFailed"));
      setDeletingTeam(null);
    }
  };

  const leaderName = (team: Team): string | null => {
    if (!team.leaderId) return null;
    const lead = team.members.find((m) => m.keycloakId === team.leaderId);
    return lead ? `${lead.firstName} ${lead.lastName}`.trim() || lead.email : null;
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
          {isStaffAdmin && (
            <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
              <Plus size={18} />
              {t("addTeam")}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label={t("stats.totalTeams")} value={stats?.total} icon={UsersRound} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard label={t("stats.active")} value={stats?.active} icon={Check} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
          <StatCard label={t("stats.inactive")} value={stats?.inactive} icon={X} accent="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
          <StatCard label={t("stats.staffInTeams")} value={stats?.totalMembers} icon={UserCheck} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
          <StatCard label={t("stats.routedCustomers")} value={stats?.assignedCustomers} icon={Users} accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center justify-between shadow-sm dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || teamsQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center justify-between shadow-sm dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (teamsQuery.error instanceof Error ? teamsQuery.error.message : t("loadFailed"))}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (teamsQuery.isError) teamsQuery.refetch();
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

            <div className="flex w-full md:w-auto items-center gap-3 justify-end">
              {teamsQuery.isFetching && !teamsQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("status")}</label>
              <select
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as "" | "true" | "false");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("allTeams")}</option>
                <option value="true">{t("stats.active")}</option>
                <option value="false">{t("stats.inactive")}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  <SortableHead field="name" className="px-6" {...sortProps}>{t("table.team")}</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.regions")}
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.teamLead")}
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.members")}
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.customers")}
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.status")}
                  </TableHead>
                  <SortableHead field="createdAt" className="px-6" {...sortProps}>{t("table.created")}</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>{t("fetchingTeams")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : teams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <UsersRound size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">{t("noTeamsFound")}</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {debouncedSearch || activeFilter
                            ? t("adjustFilters")
                            : isStaffAdmin
                              ? t("createFirstTeam")
                              : t("teamsAppearHere")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  teams.map((team) => (
                    <TableRow key={team.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {team.name.slice(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">{team.name}</span>
                            {team.description && (
                              <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-56">{team.description}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <RegionBadges regions={team.regions} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {leaderName(team) ? (
                          <div className="flex items-center gap-1.5">
                            <Crown size={14} className="text-amber-500 shrink-0" />
                            <span className="truncate">{leaderName(team)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 font-medium">
                        {team.members.length}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 font-medium">
                        {team.customerCount}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <ActiveBadge isActive={team.isActive} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500 dark:text-slate-400">
                        {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : "—"}
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
                            <DropdownMenuItem onClick={() => setViewingTeam(team)}>
                              <Info size={15} /> {t("viewDetails")}
                            </DropdownMenuItem>
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(team)}>
                                  <Pencil size={15} /> {t("editTeam")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingTeam(team)}
                                >
                                  <Trash2 size={15} /> {t("deleteTeam")}
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
          {!teamsQuery.isLoading && meta && meta.total > 0 && (
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
      <Dialog open={!!viewingTeam} onOpenChange={(open) => !open && setViewingTeam(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingTeam && (
            <>
              <DialogHeader>
                <DialogTitle>{t("details.title")}</DialogTitle>
                <DialogDescription>{t("details.subtitle")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-lg uppercase">
                    {viewingTeam.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">{viewingTeam.name}</h4>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {t("details.memberCustomerLine", { members: viewingTeam.members.length, customers: viewingTeam.customerCount })}
                    </span>
                  </div>
                  <div className="ml-auto shrink-0">
                    <ActiveBadge isActive={viewingTeam.isActive} />
                  </div>
                </div>

                {viewingTeam.description && (
                  <p className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap">{viewingTeam.description}</p>
                )}

                <div className="space-y-1">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                    <Globe2 size={13} /> {t("details.territoryRegions")}
                  </p>
                  <RegionBadges regions={viewingTeam.regions} />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{t("details.members")}</p>
                  {viewingTeam.members.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500">{t("details.noMembersYet")}</p>
                  ) : (
                    <div className="space-y-2">
                      {viewingTeam.members.map((member) => (
                        <div
                          key={member.keycloakId}
                          className="flex items-center gap-3 bg-gray-50/75 border border-gray-100 rounded-lg px-3 py-2 dark:bg-slate-800/50 dark:border-slate-800"
                        >
                          <div className="w-8 h-8 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
                            {(member.firstName[0] ?? "") + (member.lastName[0] ?? "")}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">
                              {`${member.firstName} ${member.lastName}`.trim() || member.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{member.email}</p>
                          </div>
                          {viewingTeam.leaderId === member.keycloakId && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30">
                              <Crown size={11} /> {t("details.lead")}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-gray-400 dark:text-slate-500 space-y-1 border-t border-gray-100 dark:border-slate-800 pt-4">
                  <p>
                    <span className="font-bold">{t("details.created")}</span>{" "}
                    {viewingTeam.createdAt ? new Date(viewingTeam.createdAt).toLocaleString() : "—"}
                  </p>
                  <p>
                    <span className="font-bold">{t("details.lastUpdated")}</span>{" "}
                    {viewingTeam.updatedAt ? new Date(viewingTeam.updatedAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <DialogFooter>
                {isStaffAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const target = viewingTeam;
                      setViewingTeam(null);
                      openEdit(target);
                    }}
                  >
                    <Pencil size={15} /> {t("details.edit")}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setViewingTeam(null)}>
                  {t("details.close")}
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
            <DialogTitle>{editingTeam ? t("form.editTitle") : t("form.createTitle")}</DialogTitle>
            <DialogDescription>
              {editingTeam ? t("form.editDesc") : t("form.createDesc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.teamName")}
              </label>
              <Input placeholder={t("form.teamNamePlaceholder")} disabled={isSaving} {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.description")}
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder={t("form.descriptionPlaceholder")}
                className={cn(inputClasses, "resize-none")}
                {...form.register("description")}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.territoryRegions")}
              </label>
              <Input
                placeholder={t("form.regionsPlaceholder")}
                disabled={isSaving}
                {...form.register("regionsText")}
              />
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                {t("form.regionsHint")}
              </p>
              <FieldError message={form.formState.errors.regionsText?.message} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.membersCount", { count: selectedMemberIds.length })}
              </label>
              <Input
                placeholder={t("form.filterStaff")}
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                disabled={isSaving}
                className="mb-2"
              />
              <div className="border border-gray-200 dark:border-slate-700 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
                {staffQuery.isLoading ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-gray-400 dark:text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> {t("form.loadingStaff")}
                  </div>
                ) : filteredStaff.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400 dark:text-slate-500">{t("form.noStaffFound")}</p>
                ) : (
                  filteredStaff.map((s) => (
                    <label
                      key={s.keycloakId}
                      className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        className="accent-[#3F51B5] w-4 h-4 shrink-0"
                        disabled={isSaving}
                        checked={selectedMemberIds.includes(s.keycloakId)}
                        onChange={() => toggleMember(s.keycloakId)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium text-gray-800 dark:text-slate-200 block truncate">
                          {staffDisplayName(s)}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 block truncate">{s.email}</span>
                      </span>
                      <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 shrink-0 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700">
                        {s.role}
                      </Badge>
                    </label>
                  ))
                )}
              </div>
              <FieldError message={form.formState.errors.memberIds?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.teamLead")}
                </label>
                <select
                  disabled={isSaving || selectedMembers.length === 0}
                  className={inputClasses}
                  value={selectedLeaderId ?? ""}
                  onChange={(e) => form.setValue("leaderId", e.target.value, { shouldValidate: true })}
                >
                  <option value="">{t("form.noLead")}</option>
                  {selectedMembers.map((m) => (
                    <option key={m.keycloakId} value={m.keycloakId}>
                      {staffDisplayName(m)}
                    </option>
                  ))}
                </select>
                <FieldError message={form.formState.errors.leaderId?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.status")}
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("isActive")}>
                  <option value="active">{t("form.active")}</option>
                  <option value="inactive">{t("form.inactive")}</option>
                </select>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  {t("form.inactiveHint")}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingTeam ? t("form.updateTeam") : t("form.createTeam")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <DialogContent className="max-w-md">
          {deletingTeam && (
            <>
              <DialogHeader>
                <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
                <DialogDescription>
                  {deletingTeam.customerCount > 0
                    ? t("deleteDialog.descWithCustomers", { name: deletingTeam.name, count: deletingTeam.customerCount })
                    : t("deleteDialog.descNoCustomers", { name: deletingTeam.name })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingTeam(null)}
                  disabled={deleteTeamMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteTeamMutation.isPending}
                >
                  {deleteTeamMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("deleteDialog.deleteTeam")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
