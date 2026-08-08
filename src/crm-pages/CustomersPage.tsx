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
  Building,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useCustomers, useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { initialSearchTermFromUrl } from "@/lib/initial-search-term";
import { customerApi } from "@/features/customers/services/customerApi";
import { CustomFieldsSection } from "@/features/custom-fields/components/CustomFieldsSection";
import { AttachmentsSection } from "@/features/attachments/components/AttachmentsSection";
import { ImportExportBar } from "@/features/import-export/components/ImportExportBar";
import {
  Customer,
  CustomerQuery,
  CustomerSortField,
  CustomerStatus,
} from "@/features/customers/types";
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

const customerFormSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s().-]{6,}$/, "Enter a valid phone number")
    .max(30),
  company: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["active", "inactive", "prospect"]),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const emptyFormValues: CustomerFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  address: "",
  notes: "",
  status: "active",
};

// ── Small presentational helpers ──────────────────────────────────────────────

const statusStyles: Record<CustomerStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300",
  inactive: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800",
  prospect: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
};

function StatusBadge({ status }: { status: CustomerStatus }) {
  const t = useTranslations("customers");
  return (
    <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[status])}>
      {t(status)}
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
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 dark:disabled:bg-slate-800/50 disabled:text-gray-500 dark:disabled:text-slate-400";

function SortableHead({
  field,
  sortBy,
  sortOrder,
  onToggle,
  children,
  className,
}: {
  field: CustomerSortField;
  sortBy: CustomerSortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: CustomerSortField) => void;
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

export function CustomersPage() {
  const t = useTranslations("customers");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState(initialSearchTermFromUrl);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<CustomerSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: CustomerQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      status: statusFilter,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, statusFilter, sortBy, sortOrder],
  );

  const {
    customersQuery,
    statsQuery,
    createCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutation,
    assignCustomerMutation,
    resendInvitationMutation,
  } = useCustomers(query);

  const customers = customersQuery.data?.data ?? [];
  const meta = customersQuery.data?.meta;
  const stats = statsQuery.data;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [assigningCustomer, setAssigningCustomer] = useState<Customer | null>(null);
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Assignment pickers — only fetched while the assign dialog is open
  const assignDialogOpen = isStaffAdmin && !!assigningCustomer;
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

  const form = useForm<CustomerFormValues>({
    resolver: standardSchemaResolver(customerFormSchema),
    defaultValues: emptyFormValues,
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  const isSaving = createCustomerMutation.isPending || updateCustomerMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: CustomerSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "createdAt" || field === "updatedAt" ? "desc" : "asc");
    }
    resetToFirstPage();
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setCustomFieldValues({});
    setEditingCustomer(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    form.reset({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      company: customer.company ?? "",
      address: customer.address ?? "",
      notes: customer.notes ?? "",
      status: customer.status,
    });
    setCustomFieldValues(customer.customFields ?? {});
    setEditingCustomer(customer);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingCustomer(null);
    setFormError(null);
  };

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    setFormError(null);
    const payload = {
      ...values,
      company: values.company?.trim() || undefined,
      address: values.address?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      customFields: customFieldValues,
    };

    try {
      if (editingCustomer) {
        await updateCustomerMutation.mutateAsync({ id: editingCustomer.id, data: payload });
        notifySuccess(t("toasts.updated", { name: `${values.firstName} ${values.lastName}` }));
      } else {
        await createCustomerMutation.mutateAsync(payload);
        notifySuccess(
          t("toasts.created", { name: `${values.firstName} ${values.lastName}`, email: values.email }),
        );
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingCustomer(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("toasts.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomerMutation.mutateAsync(deletingCustomer.id);
      notifySuccess(
        t("toasts.deleted", { name: `${deletingCustomer.firstName} ${deletingCustomer.lastName}` }),
      );
      setDeletingCustomer(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.deleteFailed"));
      setDeletingCustomer(null);
    }
  };

  const openAssign = (customer: Customer) => {
    setAssignTeamId(customer.assignedTeamId ?? "");
    setAssignOwnerId(customer.assignedToId ?? "");
    setAssignError(null);
    setAssigningCustomer(customer);
  };

  const handleAssign = async () => {
    if (!assigningCustomer) return;
    setAssignError(null);
    try {
      await assignCustomerMutation.mutateAsync({
        id: assigningCustomer.id,
        data: {
          assignedTeamId: assignTeamId || null,
          assignedToId: assignOwnerId || null,
        },
      });
      notifySuccess(
        t("toasts.assignmentUpdated", { name: `${assigningCustomer.firstName} ${assigningCustomer.lastName}` }),
      );
      setAssigningCustomer(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : t("toasts.assignmentFailed"));
    }
  };

  const handleResendInvite = async (customer: Customer) => {
    try {
      await resendInvitationMutation.mutateAsync(customer.id);
      notifySuccess(t("toasts.inviteResent", { email: customer.email }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.inviteResendFailed"));
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
              onExport={() => customerApi.exportCsv(query)}
              exportFilename="customers.csv"
            />
            {isStaffAdmin && (
              <Button
                onClick={openCreate}
                className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2"
              >
                <Plus size={18} />
                {t("addCustomer")}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label={t("stats.total")} value={stats?.total} icon={Users} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard label={t("stats.active")} value={stats?.active} icon={Check} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
          <StatCard label={t("stats.prospects")} value={stats?.prospect} icon={Search} accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
          <StatCard label={t("stats.inactive")} value={stats?.inactive} icon={X} accent="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
          <StatCard label={t("stats.newThisMonth")} value={stats?.newThisMonth} icon={UserPlus} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || customersQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (customersQuery.error instanceof Error
                    ? customersQuery.error.message
                    : t("loadFailed"))}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (customersQuery.isError) customersQuery.refetch();
              }}
              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
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
              {customersQuery.isFetching && !customersQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t("status")}</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as CustomerStatus | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("allStatuses")}</option>
                <option value="active">{t("active")}</option>
                <option value="inactive">{t("inactive")}</option>
                <option value="prospect">{t("prospect")}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 dark:bg-slate-800/50 hover:bg-gray-50/75 dark:hover:bg-slate-800/50">
                  <SortableHead field="lastName" className="px-6" {...sortProps}>{t("table.customer")}</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.phone")}
                  </TableHead>
                  <SortableHead field="company" className="px-6" {...sortProps}>{t("table.company")}</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.assignedTo")}
                  </TableHead>
                  <SortableHead field="status" className="px-6" {...sortProps}>{t("table.status")}</SortableHead>
                  <SortableHead field="createdAt" className="px-6" {...sortProps}>{t("table.created")}</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    {t("table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customersQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>{t("fetchingCustomers")}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <Users size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">{t("noCustomersFound")}</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {debouncedSearch || statusFilter
                            ? t("adjustFilters")
                            : isStaffAdmin
                              ? t("addFirstCustomer")
                              : t("customersAppearHere")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {customer.firstName[0]}
                            {customer.lastName[0]}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate">
                              {customer.firstName} {customer.lastName}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate">{customer.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 font-medium">{customer.phone}</TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300">
                        {customer.company ? (
                          <div className="flex items-center gap-1.5">
                            <Building size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{customer.company}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {customer.assignedToName || customer.assignedTeamName ? (
                          <div className="flex flex-col min-w-0">
                            {customer.assignedToName && (
                              <span className="text-gray-700 dark:text-slate-200 font-medium truncate">
                                {customer.assignedToName}
                              </span>
                            )}
                            {customer.assignedTeamName && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                                <UsersRound size={11} className="shrink-0" />
                                {customer.assignedTeamName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">{t("unassigned")}</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={customer.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500 dark:text-slate-400">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200">
                              <MoreHorizontal size={18} />
                              <span className="sr-only">{t("openActions")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingCustomer(customer)}>
                              <Info size={15} /> {t("viewDetails")}
                            </DropdownMenuItem>
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openEdit(customer)}>
                                  <Pencil size={15} /> {t("editProfile")}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openAssign(customer)}>
                                  <UsersRound size={15} /> {t("assignOwnerTeam")}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleResendInvite(customer)}
                                  disabled={resendInvitationMutation.isPending}
                                >
                                  <Mail size={15} /> {t("resendInvitation")}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingCustomer(customer)}
                                >
                                  <Trash2 size={15} /> {t("deleteCustomer")}
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
          {!customersQuery.isLoading && meta && meta.total > 0 && (
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
      <Dialog open={!!viewingCustomer} onOpenChange={(open) => !open && setViewingCustomer(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{t("details.title")}</DialogTitle>
                <DialogDescription>{t("details.subtitle")}</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-lg uppercase">
                    {viewingCustomer.firstName[0]}
                    {viewingCustomer.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                      {viewingCustomer.firstName} {viewingCustomer.lastName}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-slate-400">{viewingCustomer.email}</span>
                  </div>
                  <div className="ml-auto shrink-0">
                    <StatusBadge status={viewingCustomer.status} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Phone, label: t("details.phone"), value: viewingCustomer.phone },
                    { icon: Building, label: t("details.company"), value: viewingCustomer.company || "—" },
                    { icon: MapPin, label: t("details.address"), value: viewingCustomer.address || "—" },
                    {
                      icon: Calendar,
                      label: t("details.registered"),
                      value: viewingCustomer.createdAt
                        ? new Date(viewingCustomer.createdAt).toLocaleString()
                        : "—",
                    },
                    {
                      icon: UserPlus,
                      label: t("details.recordOwner"),
                      value: viewingCustomer.assignedToName || t("unassigned"),
                    },
                    {
                      icon: UsersRound,
                      label: t("details.team"),
                      value: viewingCustomer.assignedTeamName || t("unassigned"),
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
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">{t("details.staffNotes")}</p>
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                    {viewingCustomer.notes || t("details.noNotes")}
                  </p>
                </div>

                <div className="text-[11px] text-gray-400 dark:text-slate-500 space-y-1 border-t border-gray-100 dark:border-slate-800 pt-4">
                  <p>
                    <span className="font-bold">{t("details.keycloakId")}</span> {viewingCustomer.keycloakId}
                  </p>
                  <p>
                    <span className="font-bold">{t("details.lastUpdated")}</span>{" "}
                    {viewingCustomer.updatedAt ? new Date(viewingCustomer.updatedAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              <DialogFooter>
                {isStaffAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const target = viewingCustomer;
                      setViewingCustomer(null);
                      openEdit(target);
                    }}
                  >
                    <Pencil size={15} /> {t("details.edit")}
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setViewingCustomer(null)}>
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
            <DialogTitle>{editingCustomer ? t("form.editTitle") : t("form.addTitle")}</DialogTitle>
            <DialogDescription>
              {editingCustomer ? t("form.editDesc") : t("form.addDesc")}
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
              {!editingCustomer && (
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  {t("form.emailHint")}
                </p>
              )}
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
                <Input placeholder={t("form.companyPlaceholder")} disabled={isSaving} {...form.register("company")} />
                <FieldError message={form.formState.errors.company?.message} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.address")}
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder={t("form.addressPlaceholder")}
                className={cn(inputClasses, "resize-none")}
                {...form.register("address")}
              />
              <FieldError message={form.formState.errors.address?.message} />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.lifecycleStatus")}
                </label>
                <select disabled={isSaving} className={inputClasses} {...form.register("status")}>
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                  <option value="prospect">{t("prospect")}</option>
                </select>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                  {t("form.inactiveHint")}
                </p>
              </div>
            </div>

            <CustomFieldsSection
              entityType="customer"
              values={customFieldValues}
              onChange={setCustomFieldValues}
            />

            <AttachmentsSection entityType="customer" entityId={editingCustomer?.id} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingCustomer ? t("form.updateCustomer") : t("form.createCustomer")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign owner / team dialog */}
      <Dialog open={!!assigningCustomer} onOpenChange={(open) => !open && setAssigningCustomer(null)}>
        <DialogContent className="max-w-md">
          {assigningCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{t("assignDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("assignDialog.desc", { name: `${assigningCustomer.firstName} ${assigningCustomer.lastName}` })}
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
                    disabled={assignCustomerMutation.isPending || assignTeamsQuery.isLoading}
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
                    disabled={assignCustomerMutation.isPending || assignStaffQuery.isLoading}
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
                  onClick={() => setAssigningCustomer(null)}
                  disabled={assignCustomerMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignCustomerMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignCustomerMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("assignDialog.saveAssignment")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}>
        <DialogContent className="max-w-md">
          {deletingCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("deleteDialog.desc", {
                    name: `${deletingCustomer.firstName} ${deletingCustomer.lastName}`,
                    email: deletingCustomer.email,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingCustomer(null)}
                  disabled={deleteCustomerMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteCustomerMutation.isPending}
                >
                  {deleteCustomerMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("deleteDialog.deleteCustomer")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
