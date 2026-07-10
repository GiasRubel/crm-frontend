"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BadgeDollarSign,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Contact as ContactIcon,
  Globe,
  Info,
  Landmark,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Target,
  Trash2,
  TrendingUp,
  UsersRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import {
  useAccounts,
  useAccountSummary,
} from "@/features/accounts/hooks/useAccounts";
import {
  Account,
  ACCOUNT_INDUSTRY_LABELS,
  ACCOUNT_SIZES,
  AccountIndustry,
  AccountQuery,
  AccountSortField,
  AccountStatus,
} from "@/features/accounts/types";
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

const accountFormSchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(200),
  industry: z
    .enum([
      "technology",
      "finance",
      "healthcare",
      "manufacturing",
      "retail",
      "education",
      "government",
      "nonprofit",
      "other",
    ])
    .optional()
    .or(z.literal("")),
  website: z
    .string()
    .trim()
    .max(300)
    .regex(/^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/, "Enter a valid URL")
    .optional()
    .or(z.literal("")),
  email: z.email("Enter a valid email address").max(254).optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s().-]{6,}$/, "Enter a valid phone number")
    .max(30)
    .optional()
    .or(z.literal("")),
  size: z
    .enum(["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"])
    .optional()
    .or(z.literal("")),
  annualRevenue: z.coerce
    .number("Enter a valid amount")
    .min(0, "Must be zero or more")
    .optional(),
  address: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["prospect", "active", "inactive"]),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

const emptyFormValues: AccountFormValues = {
  name: "",
  industry: "",
  website: "",
  email: "",
  phone: "",
  size: "",
  annualRevenue: undefined,
  address: "",
  description: "",
  status: "prospect",
};

// ── Presentational helpers ────────────────────────────────────────────────────

const statusStyles: Record<AccountStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200",
  prospect: "bg-amber-50 text-amber-700 border-amber-200",
};

function StatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[status])}>
      {status}
    </Badge>
  );
}

const dealStageStyles: Record<string, string> = {
  discovery: "bg-sky-50 text-sky-700 border-sky-200",
  proposal: "bg-indigo-50 text-indigo-700 border-indigo-200",
  negotiation: "bg-amber-50 text-amber-700 border-amber-200",
  closed_won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed_lost: "bg-red-50 text-red-700 border-red-200",
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 truncate">{value ?? "—"}</p>
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
  field: AccountSortField;
  sortBy: AccountSortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: AccountSortField) => void;
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

export function AccountsPage() {
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "">("");
  const [industryFilter, setIndustryFilter] = useState<AccountIndustry | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<AccountSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: AccountQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      status: statusFilter,
      industry: industryFilter,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, statusFilter, industryFilter, sortBy, sortOrder],
  );

  const {
    accountsQuery,
    statsQuery,
    createAccountMutation,
    updateAccountMutation,
    assignAccountMutation,
    deleteAccountMutation,
  } = useAccounts(query);

  const accounts = accountsQuery.data?.data ?? [];
  const meta = accountsQuery.data?.meta;
  const stats = statsQuery.data;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [summaryAccountId, setSummaryAccountId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [assigningAccount, setAssigningAccount] = useState<Account | null>(null);
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const summaryQuery = useAccountSummary(summaryAccountId);
  const summary = summaryQuery.data;

  // Assignment pickers — only fetched while the assign dialog is open
  const assignDialogOpen = isStaffAdmin && !!assigningAccount;
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

  const form = useForm<AccountFormValues>({
    resolver: standardSchemaResolver(accountFormSchema),
    defaultValues: emptyFormValues,
  });

  const isSaving = createAccountMutation.isPending || updateAccountMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: AccountSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(
        field === "createdAt" || field === "updatedAt" || field === "annualRevenue"
          ? "desc"
          : "asc",
      );
    }
    resetToFirstPage();
  };

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setEditingAccount(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (account: Account) => {
    form.reset({
      name: account.name,
      industry: account.industry ?? "",
      website: account.website ?? "",
      email: account.email ?? "",
      phone: account.phone ?? "",
      size: account.size ?? "",
      annualRevenue: account.annualRevenue ?? undefined,
      address: account.address ?? "",
      description: account.description ?? "",
      status: account.status,
    });
    setEditingAccount(account);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingAccount(null);
    setFormError(null);
  };

  const onSubmit = async (values: AccountFormValues) => {
    setFormError(null);
    const payload = {
      name: values.name,
      industry: values.industry || undefined,
      website: values.website?.trim() || undefined,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      size: values.size || undefined,
      annualRevenue: values.annualRevenue,
      address: values.address?.trim() || undefined,
      description: values.description?.trim() || undefined,
      status: values.status,
    };

    try {
      if (editingAccount) {
        await updateAccountMutation.mutateAsync({ id: editingAccount.id, data: payload });
        notifySuccess(`Account "${values.name}" updated successfully.`);
      } else {
        await createAccountMutation.mutateAsync(payload);
        notifySuccess(`Account "${values.name}" created.`);
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingAccount(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save account");
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount) return;
    try {
      await deleteAccountMutation.mutateAsync(deletingAccount.id);
      notifySuccess(
        `Account "${deletingAccount.name}" was deleted — its contacts and deals were kept and unlinked.`,
      );
      setDeletingAccount(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete account");
      setDeletingAccount(null);
    }
  };

  const openAssign = (account: Account) => {
    setAssignTeamId(account.assignedTeamId ?? "");
    setAssignOwnerId(account.assignedToId ?? "");
    setAssignError(null);
    setAssigningAccount(account);
  };

  const handleAssign = async () => {
    if (!assigningAccount) return;
    setAssignError(null);
    try {
      await assignAccountMutation.mutateAsync({
        id: assigningAccount.id,
        data: {
          assignedTeamId: assignTeamId || null,
          assignedToId: assignOwnerId || null,
        },
      });
      notifySuccess(`Routing updated for "${assigningAccount.name}".`);
      setAssigningAccount(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to update assignment");
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
            <h1 className="text-2xl font-bold text-gray-800">Accounts</h1>
            <p className="text-sm text-gray-500">
              B2B company profiles — firmographics, linked contacts, and deals.
            </p>
          </div>
          <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
            <Plus size={18} />
            Add Account
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats?.total} icon={Building2} accent="bg-[#3F51B5]/10 text-[#3F51B5]" />
          <StatCard label="Prospects" value={stats?.prospect} icon={Search} accent="bg-amber-50 text-amber-600" />
          <StatCard label="Active" value={stats?.active} icon={Check} accent="bg-emerald-50 text-emerald-600" />
          <StatCard label="Inactive" value={stats?.inactive} icon={X} accent="bg-slate-100 text-slate-500" />
          <StatCard label="New this month" value={stats?.newThisMonth} icon={TrendingUp} accent="bg-sky-50 text-sky-600" />
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

        {(errorMsg || accountsQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (accountsQuery.error instanceof Error
                    ? accountsQuery.error.message
                    : "Failed to load accounts")}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (accountsQuery.isError) accountsQuery.refetch();
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
                placeholder="Search by name, website, email, or address..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetToFirstPage();
                }}
                className="pl-10"
              />
            </div>

            <div className="flex w-full md:w-auto items-center gap-2 justify-end flex-wrap">
              {accountsQuery.isFetching && !accountsQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400" />
              )}
              <select
                value={industryFilter}
                onChange={(e) => {
                  setIndustryFilter(e.target.value as AccountIndustry | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Industries</option>
                {Object.entries(ACCOUNT_INDUSTRY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as AccountStatus | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Statuses</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75">
                  <SortableHead field="name" className="px-6" {...sortProps}>Account</SortableHead>
                  <SortableHead field="industry" className="px-6" {...sortProps}>Industry</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Size
                  </TableHead>
                  <SortableHead field="annualRevenue" className="px-6" {...sortProps}>Revenue</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Links
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Assigned To
                  </TableHead>
                  <SortableHead field="status" className="px-6" {...sortProps}>Status</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Fetching accounts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Building2 size={32} className="text-gray-300" />
                        <p className="font-medium">No accounts found</p>
                        <p className="text-sm text-gray-400">
                          {debouncedSearch || statusFilter || industryFilter
                            ? "Try adjusting your search or filters."
                            : "Add your first company profile to get started."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account.id} className="hover:bg-gray-50/50">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3F51B5]/10 text-[#3F51B5] rounded-lg flex items-center justify-center shrink-0">
                            <Building2 size={16} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <button
                              type="button"
                              onClick={() => setSummaryAccountId(account.id)}
                              className="font-semibold text-gray-900 truncate text-left hover:text-[#3F51B5] transition-colors"
                            >
                              {account.name}
                            </button>
                            {account.website && (
                              <span className="text-xs text-gray-500 truncate">{account.website}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 text-sm">
                        {account.industry ? ACCOUNT_INDUSTRY_LABELS[account.industry] : <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 text-sm">
                        {account.size ?? <span className="text-gray-300">—</span>}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-700 font-medium text-sm">
                        {account.annualRevenue !== null ? currency.format(account.annualRevenue) : (
                          <span className="text-gray-300 font-normal">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                          <span className="flex items-center gap-1" title="Linked contacts">
                            <ContactIcon size={13} className="text-gray-400" />
                            {account.contactCount}
                          </span>
                          <span className="flex items-center gap-1" title="Open deals">
                            <Target size={13} className="text-gray-400" />
                            {account.openDealCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {account.assignedToName || account.assignedTeamName ? (
                          <div className="flex flex-col min-w-0">
                            {account.assignedToName && (
                              <span className="text-gray-700 font-medium truncate">{account.assignedToName}</span>
                            )}
                            {account.assignedTeamName && (
                              <span className="text-xs text-indigo-600 truncate flex items-center gap-1">
                                <UsersRound size={11} className="shrink-0" />
                                {account.assignedTeamName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={account.status} />
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
                            <DropdownMenuItem onClick={() => setSummaryAccountId(account.id)}>
                              <Info size={15} /> 360° view
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(account)}>
                              <Pencil size={15} /> Edit account
                            </DropdownMenuItem>
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openAssign(account)}>
                                  <UsersRound size={15} /> Assign owner / team
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingAccount(account)}
                                >
                                  <Trash2 size={15} /> Delete account
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
          {!accountsQuery.isLoading && meta && meta.total > 0 && (
            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span>
                  {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
                  {meta.total} accounts
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

      {/* 360° summary dialog */}
      <Dialog open={!!summaryAccountId} onOpenChange={(open) => !open && setSummaryAccountId(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Account 360° View</DialogTitle>
            <DialogDescription>
              Company profile with all linked contacts and deals.
            </DialogDescription>
          </DialogHeader>

          {summaryQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
              <Loader2 size={18} className="animate-spin" />
              <span>Loading account summary...</span>
            </div>
          ) : summaryQuery.isError ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {summaryQuery.error instanceof Error
                ? summaryQuery.error.message
                : "Failed to load account summary"}
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Profile header */}
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 bg-[#3F51B5]/10 text-[#3F51B5] rounded-xl flex items-center justify-center">
                  <Building2 size={22} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-lg font-bold text-gray-900 truncate">{summary.account.name}</h4>
                  <span className="text-sm text-gray-500">
                    {summary.account.industry
                      ? ACCOUNT_INDUSTRY_LABELS[summary.account.industry]
                      : "Industry unknown"}
                    {summary.account.size ? ` · ${summary.account.size} employees` : ""}
                  </span>
                </div>
                <div className="ml-auto shrink-0">
                  <StatusBadge status={summary.account.status} />
                </div>
              </div>

              {/* Firmographics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: Globe, label: "Website", value: summary.account.website || "—" },
                  { icon: Mail, label: "Email", value: summary.account.email || "—" },
                  { icon: Phone, label: "Phone", value: summary.account.phone || "—" },
                  {
                    icon: Landmark,
                    label: "Annual Revenue",
                    value:
                      summary.account.annualRevenue !== null
                        ? currency.format(summary.account.annualRevenue)
                        : "—",
                  },
                  { icon: MapPin, label: "Address", value: summary.account.address || "—" },
                  {
                    icon: UsersRound,
                    label: "Owner / Team",
                    value:
                      [summary.account.assignedToName, summary.account.assignedTeamName]
                        .filter(Boolean)
                        .join(" · ") || "Unassigned",
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

              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Contacts", value: String(summary.metrics.contactCount) },
                  { label: "Open Deals", value: String(summary.metrics.openDealCount) },
                  { label: "Open Value", value: currency.format(summary.metrics.openValue) },
                  { label: "Won Value", value: currency.format(summary.metrics.wonValue) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50/75 border border-gray-100 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">{label}</p>
                  </div>
                ))}
              </div>

              {summary.account.description && (
                <div className="bg-gray-50/75 p-4 rounded-xl border border-gray-100 space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">About</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary.account.description}</p>
                </div>
              )}

              {/* Linked contacts */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Contacts ({summary.metrics.contactCount})
                </p>
                {summary.contacts.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No contacts linked yet — link people from the Contacts page.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {summary.contacts.map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center gap-3 text-sm bg-white border border-gray-100 rounded-lg p-3"
                      >
                        <div className="w-8 h-8 bg-[#3F51B5]/10 text-[#3F51B5] rounded-full flex items-center justify-center font-bold text-[11px] uppercase shrink-0">
                          {c.firstName[0]}
                          {c.lastName[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 truncate flex items-center gap-1.5">
                            {c.firstName} {c.lastName}
                            {c.isPrimary && (
                              <span title="Primary contact">
                                <Star size={12} className="text-amber-500 fill-amber-400 shrink-0" />
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {[c.jobTitle, c.email].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {c.doNotContact && (
                          <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-[10px] shrink-0">
                            Do not contact
                          </Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Linked deals */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                  Deals ({summary.opportunities.length})
                </p>
                {summary.opportunities.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No deals linked yet — link deals from the Opportunities page.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {summary.opportunities.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center gap-3 text-sm bg-white border border-gray-100 rounded-lg p-3"
                      >
                        <BadgeDollarSign size={16} className="text-gray-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-800 truncate">{o.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar size={11} />
                            {o.expectedCloseDate
                              ? new Date(o.expectedCloseDate).toLocaleDateString()
                              : "No close date"}
                          </p>
                        </div>
                        <span className="font-bold text-gray-900 shrink-0">{currency.format(o.amount)}</span>
                        <Badge
                          variant="outline"
                          className={cn("font-semibold shrink-0 capitalize", dealStageStyles[o.stage])}
                        >
                          {o.stage.replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {summary && (
              <Button
                variant="outline"
                onClick={() => {
                  const target = summary.account;
                  setSummaryAccountId(null);
                  openEdit(target);
                }}
              >
                <Pencil size={15} /> Edit
              </Button>
            )}
            <Button variant="secondary" onClick={() => setSummaryAccountId(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "Add New Account"}</DialogTitle>
            <DialogDescription>
              {editingAccount
                ? "Update the company's firmographic profile."
                : "Create a company profile to link contacts and deals against."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Company Name *
              </label>
              <Input placeholder="Acme Corporation" disabled={isSaving} {...form.register("name")} />
              <FieldError message={form.formState.errors.name?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Industry
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("industry")}>
                  <option value="">Not specified</option>
                  {Object.entries(ACCOUNT_INDUSTRY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Company Size
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("size")}>
                  <option value="">Not specified</option>
                  {ACCOUNT_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} employees
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Website
                </label>
                <Input placeholder="acme.com" disabled={isSaving} {...form.register("website")} />
                <FieldError message={form.formState.errors.website?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Annual Revenue (USD)
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="1000000"
                  disabled={isSaving}
                  {...form.register("annualRevenue", {
                    setValueAs: (v: string) => (v === "" || v === null ? undefined : Number(v)),
                  })}
                />
                <FieldError message={form.formState.errors.annualRevenue?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Company Email
                </label>
                <Input type="email" placeholder="info@acme.com" disabled={isSaving} {...form.register("email")} />
                <FieldError message={form.formState.errors.email?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Phone
                </label>
                <Input type="tel" placeholder="+1 234 567 890" disabled={isSaving} {...form.register("phone")} />
                <FieldError message={form.formState.errors.phone?.message} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Address
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder="Street, City, State, ZIP"
                className={cn(inputClasses, "resize-none")}
                {...form.register("address")}
              />
              <FieldError message={form.formState.errors.address?.message} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder="What does this company do? Relationship context..."
                className={cn(inputClasses, "resize-none")}
                {...form.register("description")}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("status")}>
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingAccount ? "Update Account" : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign owner / team dialog */}
      <Dialog open={!!assigningAccount} onOpenChange={(open) => !open && setAssigningAccount(null)}>
        <DialogContent className="max-w-md">
          {assigningAccount && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Account</DialogTitle>
                <DialogDescription>
                  Route <span className="font-semibold text-gray-700">{assigningAccount.name}</span> to a
                  team and/or a record owner. Team members gain visibility of this record.
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
                    disabled={assignAccountMutation.isPending || assignTeamsQuery.isLoading}
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
                    disabled={assignAccountMutation.isPending || assignStaffQuery.isLoading}
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
                  onClick={() => setAssigningAccount(null)}
                  disabled={assignAccountMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignAccountMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignAccountMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Save Assignment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingAccount} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <DialogContent className="max-w-md">
          {deletingAccount && (
            <>
              <DialogHeader>
                <DialogTitle>Delete account?</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-semibold text-gray-700">{deletingAccount.name}</span>. Its{" "}
                  {deletingAccount.contactCount} linked contact(s) and deals are <strong>kept</strong> but
                  unlinked from the company. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingAccount(null)}
                  disabled={deleteAccountMutation.isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteAccountMutation.isPending}>
                  {deleteAccountMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Delete Account
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
