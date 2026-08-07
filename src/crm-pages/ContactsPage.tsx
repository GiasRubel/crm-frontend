"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  Ban,
  BookUser,
  Building2,
  Cake,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { CustomFieldsSection } from "@/features/custom-fields/components/CustomFieldsSection";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import { contactApi } from "@/features/contacts/services/contactApi";
import { ImportExportBar } from "@/features/import-export/components/ImportExportBar";
import {
  Contact,
  ContactQuery,
  ContactSortField,
  INTERACTION_TYPE_LABELS,
  InteractionType,
  PREFERRED_CHANNEL_LABELS,
  PreferredChannel,
} from "@/features/contacts/types";
import { accountApi } from "@/features/accounts/services/accountApi";
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

const contactFormSchema = z.object({
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
  jobTitle: z.string().max(150).optional(),
  department: z.string().max(150).optional(),
  birthday: z.string().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  accountId: z.string().optional(),
  isPrimary: z.boolean(),
  preferredChannel: z.enum(["email", "phone", "sms"]),
  emailOptIn: z.boolean(),
  phoneOptIn: z.boolean(),
  smsOptIn: z.boolean(),
  doNotContact: z.boolean(),
  notes: z.string().max(2000).optional(),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

const emptyFormValues: ContactFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  jobTitle: "",
  department: "",
  birthday: "",
  address: "",
  city: "",
  country: "",
  language: "",
  accountId: "",
  isPrimary: false,
  preferredChannel: "email",
  emailOptIn: true,
  phoneOptIn: true,
  smsOptIn: false,
  doNotContact: false,
  notes: "",
};

const interactionFormSchema = z.object({
  type: z.enum(["call", "email", "meeting", "sms", "note"]),
  direction: z.enum(["inbound", "outbound"]).optional().or(z.literal("")),
  subject: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
});

type InteractionFormValues = z.infer<typeof interactionFormSchema>;

// ── Presentational helpers ────────────────────────────────────────────────────

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
  field: ContactSortField;
  sortBy: ContactSortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: ContactSortField) => void;
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

function PreferenceBadge({ contact }: { contact: Contact }) {
  if (contact.doNotContact) {
    return (
      <Badge variant="outline" className="bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 font-semibold gap-1">
        <Ban size={11} /> Do not contact
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 font-semibold">
      {PREFERRED_CHANNEL_LABELS[contact.preferredChannel]}
    </Badge>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ContactsPage() {
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  // Filters / paging / sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState<PreferredChannel | "">("");
  const [dncFilter, setDncFilter] = useState<"true" | "false" | "">("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<ContactSortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: ContactQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      preferredChannel: channelFilter,
      doNotContact: dncFilter,
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, channelFilter, dncFilter, sortBy, sortOrder],
  );

  const {
    contactsQuery,
    statsQuery,
    createContactMutation,
    updateContactMutation,
    addInteractionMutation,
    assignContactMutation,
    deleteContactMutation,
  } = useContacts(query);

  const contacts = contactsQuery.data?.data ?? [];
  const meta = contactsQuery.data?.meta;
  const stats = statsQuery.data;

  // Dialogs & notifications
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [assigningContact, setAssigningContact] = useState<Contact | null>(null);
  const [interactingContact, setInteractingContact] = useState<Contact | null>(null);
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  // Account picker — only fetched while the create/edit form is open
  const accountsPickerQuery = useQuery({
    queryKey: ["accounts", "picker"],
    queryFn: () => accountApi.getAll({ limit: 100, sortBy: "name", sortOrder: "asc" }),
    enabled: formOpen,
  });
  const accountOptions = accountsPickerQuery.data?.data ?? [];

  // Assignment pickers — only fetched while the assign dialog is open
  const assignDialogOpen = isStaffAdmin && !!assigningContact;
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

  const form = useForm<ContactFormValues>({
    resolver: standardSchemaResolver(contactFormSchema),
    defaultValues: emptyFormValues,
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  const interactionForm = useForm<InteractionFormValues>({
    resolver: standardSchemaResolver(interactionFormSchema),
    defaultValues: { type: "call", direction: "outbound", subject: "", note: "" },
  });

  const watchAccountId = form.watch("accountId");
  const watchDoNotContact = form.watch("doNotContact");
  const isSaving = createContactMutation.isPending || updateContactMutation.isPending;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: ContactSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "createdAt" || field === "updatedAt" ? "desc" : "asc");
    }
    resetToFirstPage();
  };

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setCustomFieldValues({});
    setEditingContact(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    form.reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone ?? "",
      jobTitle: contact.jobTitle ?? "",
      department: contact.department ?? "",
      birthday: contact.birthday ? contact.birthday.slice(0, 10) : "",
      address: contact.address ?? "",
      city: contact.city ?? "",
      country: contact.country ?? "",
      language: contact.language ?? "",
      accountId: contact.accountId ?? "",
      isPrimary: contact.isPrimary,
      preferredChannel: contact.preferredChannel,
      emailOptIn: contact.emailOptIn,
      phoneOptIn: contact.phoneOptIn,
      smsOptIn: contact.smsOptIn,
      doNotContact: contact.doNotContact,
      notes: contact.notes ?? "",
    });
    setCustomFieldValues(contact.customFields ?? {});
    setEditingContact(contact);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormOpen(false);
    setEditingContact(null);
    setFormError(null);
  };

  const onSubmit = async (values: ContactFormValues) => {
    setFormError(null);

    if (values.isPrimary && !values.accountId) {
      setFormError("A primary contact must be linked to an account.");
      return;
    }

    const base = {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone?.trim() || undefined,
      jobTitle: values.jobTitle?.trim() || undefined,
      department: values.department?.trim() || undefined,
      birthday: values.birthday || undefined,
      address: values.address?.trim() || undefined,
      city: values.city?.trim() || undefined,
      country: values.country?.trim() || undefined,
      language: values.language?.trim() || undefined,
      isPrimary: values.isPrimary,
      preferredChannel: values.preferredChannel,
      emailOptIn: values.emailOptIn,
      phoneOptIn: values.phoneOptIn,
      smsOptIn: values.smsOptIn,
      doNotContact: values.doNotContact,
      notes: values.notes?.trim() || undefined,
      customFields: customFieldValues,
    };

    try {
      if (editingContact) {
        await updateContactMutation.mutateAsync({
          id: editingContact.id,
          // null explicitly unlinks the account when cleared in the form
          data: { ...base, accountId: values.accountId || null },
        });
        notifySuccess(`Contact "${values.firstName} ${values.lastName}" updated successfully.`);
      } else {
        await createContactMutation.mutateAsync({
          ...base,
          accountId: values.accountId || undefined,
        });
        notifySuccess(`Contact "${values.firstName} ${values.lastName}" created.`);
        resetToFirstPage();
      }
      setFormOpen(false);
      setEditingContact(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save contact");
    }
  };

  const handleDelete = async () => {
    if (!deletingContact) return;
    try {
      await deleteContactMutation.mutateAsync(deletingContact.id);
      notifySuccess(`Contact "${deletingContact.firstName} ${deletingContact.lastName}" was deleted.`);
      setDeletingContact(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete contact");
      setDeletingContact(null);
    }
  };

  const openAssign = (contact: Contact) => {
    setAssignTeamId(contact.assignedTeamId ?? "");
    setAssignOwnerId(contact.assignedToId ?? "");
    setAssignError(null);
    setAssigningContact(contact);
  };

  const handleAssign = async () => {
    if (!assigningContact) return;
    setAssignError(null);
    try {
      await assignContactMutation.mutateAsync({
        id: assigningContact.id,
        data: {
          assignedTeamId: assignTeamId || null,
          assignedToId: assignOwnerId || null,
        },
      });
      notifySuccess(
        `Routing updated for "${assigningContact.firstName} ${assigningContact.lastName}".`,
      );
      setAssigningContact(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to update assignment");
    }
  };

  const openInteraction = (contact: Contact) => {
    interactionForm.reset({ type: "call", direction: "outbound", subject: "", note: "" });
    setInteractionError(null);
    setInteractingContact(contact);
  };

  const onSubmitInteraction = async (values: InteractionFormValues) => {
    if (!interactingContact) return;
    setInteractionError(null);
    try {
      await addInteractionMutation.mutateAsync({
        id: interactingContact.id,
        data: {
          type: values.type,
          direction: values.type === "note" ? undefined : values.direction || undefined,
          subject: values.subject?.trim() || undefined,
          note: values.note?.trim() || undefined,
        },
      });
      notifySuccess(
        `${INTERACTION_TYPE_LABELS[values.type]} logged for "${interactingContact.firstName} ${interactingContact.lastName}".`,
      );
      setInteractingContact(null);
    } catch (err) {
      setInteractionError(err instanceof Error ? err.message : "Failed to log interaction");
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
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Contacts</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              People profiles — demographics, communication history, and preferences.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExportBar
              onExport={() => contactApi.exportCsv(query)}
              exportFilename="contacts.csv"
              onImport={(file) => contactApi.importCsv(file)}
              onImportComplete={() => contactsQuery.refetch()}
            />
            <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
              <Plus size={18} />
              Add Contact
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats?.total} icon={BookUser} accent="bg-[#3F51B5]/10 dark:bg-indigo-500/15 text-[#3F51B5] dark:text-indigo-300" />
          <StatCard label="With Account" value={stats?.withAccount} icon={Building2} accent="bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400" />
          <StatCard label="Do Not Contact" value={stats?.doNotContact} icon={Ban} accent="bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400" />
          <StatCard label="New this month" value={stats?.newThisMonth} icon={UserPlus} accent="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" />
          <StatCard
            label="Interactions (mo.)"
            value={stats?.interactionsThisMonth}
            icon={MessageSquarePlus}
            accent="bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <Check className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
              <span className="text-sm font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}

        {(errorMsg || contactsQuery.isError) && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600 dark:text-red-400 shrink-0" size={20} />
              <span className="text-sm font-medium">
                {errorMsg ??
                  (contactsQuery.error instanceof Error
                    ? contactsQuery.error.message
                    : "Failed to load contacts")}
              </span>
            </div>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (contactsQuery.isError) contactsQuery.refetch();
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
                placeholder="Search by name, email, phone, title, or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetToFirstPage();
                }}
                className="pl-10"
              />
            </div>

            <div className="flex w-full md:w-auto items-center gap-2 justify-end flex-wrap">
              {contactsQuery.isFetching && !contactsQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <select
                value={channelFilter}
                onChange={(e) => {
                  setChannelFilter(e.target.value as PreferredChannel | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">Any Channel</option>
                <option value="email">Prefers Email</option>
                <option value="phone">Prefers Phone</option>
                <option value="sms">Prefers SMS</option>
              </select>
              <select
                value={dncFilter}
                onChange={(e) => {
                  setDncFilter(e.target.value as "true" | "false" | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Contacts</option>
                <option value="false">Contactable</option>
                <option value="true">Do Not Contact</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 dark:bg-slate-800/50 hover:bg-gray-50/75 dark:hover:bg-slate-800/50">
                  <SortableHead field="lastName" className="px-6" {...sortProps}>Contact</SortableHead>
                  <SortableHead field="jobTitle" className="px-6" {...sortProps}>Title</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Account
                  </TableHead>
                  <SortableHead field="city" className="px-6" {...sortProps}>Location</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Preference
                  </TableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Assigned To
                  </TableHead>
                  <SortableHead field="createdAt" className="px-6" {...sortProps}>Created</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" />
                        <span>Fetching contacts...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <BookUser size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">No contacts found</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {debouncedSearch || channelFilter || dncFilter
                            ? "Try adjusting your search or filters."
                            : "Add your first contact to build the central database."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-[#3F51B5]/10 dark:bg-indigo-500/15 text-[#3F51B5] dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {contact.firstName[0]}
                            {contact.lastName[0]}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                              {contact.firstName} {contact.lastName}
                              {contact.isPrimary && (
                                <span title="Primary contact for their account">
                                  <Star size={12} className="text-amber-500 fill-amber-400 shrink-0" />
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400 truncate">{contact.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                        {contact.jobTitle ? (
                          <div className="flex flex-col">
                            <span className="truncate">{contact.jobTitle}</span>
                            {contact.department && (
                              <span className="text-xs text-gray-400 dark:text-slate-500 truncate">{contact.department}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                        {contact.accountName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 size={14} className="text-gray-400 dark:text-slate-500 shrink-0" />
                            <span className="truncate">{contact.accountName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-600 dark:text-slate-300 text-sm">
                        {contact.city || contact.country ? (
                          [contact.city, contact.country].filter(Boolean).join(", ")
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <PreferenceBadge contact={contact} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {contact.assignedToName || contact.assignedTeamName ? (
                          <div className="flex flex-col min-w-0">
                            {contact.assignedToName && (
                              <span className="text-gray-700 dark:text-slate-200 font-medium truncate">
                                {contact.assignedToName}
                              </span>
                            )}
                            {contact.assignedTeamName && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                                <UsersRound size={11} className="shrink-0" />
                                {contact.assignedTeamName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 dark:text-slate-600">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500 dark:text-slate-400">
                        {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200">
                              <MoreHorizontal size={18} />
                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewingContact(contact)}>
                              <Info size={15} /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openInteraction(contact)}>
                              <MessageSquarePlus size={15} /> Log interaction
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(contact)}>
                              <Pencil size={15} /> Edit contact
                            </DropdownMenuItem>
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuItem onClick={() => openAssign(contact)}>
                                  <UsersRound size={15} /> Assign owner / team
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => setDeletingContact(contact)}
                                >
                                  <Trash2 size={15} /> Delete contact
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
          {!contactsQuery.isLoading && meta && meta.total > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span>
                  {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
                  {meta.total} contacts
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

      {/* Details dialog */}
      <Dialog open={!!viewingContact} onOpenChange={(open) => !open && setViewingContact(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingContact && (
            <>
              <DialogHeader>
                <DialogTitle>Contact Details</DialogTitle>
                <DialogDescription>
                  Profile, preferences, and communication history.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
                  <div className="w-12 h-12 bg-[#3F51B5]/10 dark:bg-indigo-500/15 text-[#3F51B5] dark:text-indigo-300 rounded-full flex items-center justify-center font-bold text-lg uppercase">
                    {viewingContact.firstName[0]}
                    {viewingContact.lastName[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
                      {viewingContact.firstName} {viewingContact.lastName}
                      {viewingContact.isPrimary && (
                        <span title="Primary contact for their account">
                          <Star size={14} className="text-amber-500 fill-amber-400" />
                        </span>
                      )}
                    </h4>
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      {[viewingContact.jobTitle, viewingContact.accountName].filter(Boolean).join(" · ") ||
                        viewingContact.email}
                    </span>
                  </div>
                  <div className="ml-auto shrink-0">
                    <PreferenceBadge contact={viewingContact} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Mail, label: "Email", value: viewingContact.email },
                    { icon: Phone, label: "Phone", value: viewingContact.phone || "—" },
                    {
                      icon: Building2,
                      label: "Account",
                      value: viewingContact.accountName || "No account",
                    },
                    {
                      icon: Info,
                      label: "Department",
                      value: viewingContact.department || "—",
                    },
                    {
                      icon: Cake,
                      label: "Birthday",
                      value: viewingContact.birthday
                        ? new Date(viewingContact.birthday).toLocaleDateString()
                        : "—",
                    },
                    { icon: Globe, label: "Language", value: viewingContact.language || "—" },
                    {
                      icon: MapPin,
                      label: "Location",
                      value:
                        [viewingContact.address, viewingContact.city, viewingContact.country]
                          .filter(Boolean)
                          .join(", ") || "—",
                    },
                    {
                      icon: UsersRound,
                      label: "Owner / Team",
                      value:
                        [viewingContact.assignedToName, viewingContact.assignedTeamName]
                          .filter(Boolean)
                          .join(" · ") || "Unassigned",
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

                {/* Preferences */}
                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold mb-2">
                    Communication Preferences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-800">
                      Prefers {PREFERRED_CHANNEL_LABELS[viewingContact.preferredChannel]}
                    </Badge>
                    {[
                      { label: "Email", ok: viewingContact.emailOptIn },
                      { label: "Phone", ok: viewingContact.phoneOptIn },
                      { label: "SMS", ok: viewingContact.smsOptIn },
                    ].map(({ label, ok }) => (
                      <Badge
                        key={label}
                        variant="outline"
                        className={cn(
                          "gap-1",
                          ok
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800",
                        )}
                      >
                        {ok ? <Check size={11} /> : <X size={11} />}
                        {label}
                      </Badge>
                    ))}
                    {viewingContact.doNotContact && (
                      <Badge variant="outline" className="bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30 gap-1">
                        <Ban size={11} /> Do not contact — overrides all opt-ins
                      </Badge>
                    )}
                  </div>
                </div>

                {viewingContact.notes && (
                  <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1">
                    <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Notes</p>
                    <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{viewingContact.notes}</p>
                  </div>
                )}

                {/* Communication history */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                    Communication History ({viewingContact.interactions.length})
                  </p>
                  {viewingContact.interactions.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500">No interactions logged yet.</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {viewingContact.interactions.map((i, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 text-sm bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-lg p-3"
                        >
                          <span className="shrink-0 mt-0.5">
                            {i.direction === "inbound" ? (
                              <ArrowDownLeft size={15} className="text-emerald-500 dark:text-emerald-400" />
                            ) : i.direction === "outbound" ? (
                              <ArrowUpRight size={15} className="text-sky-500 dark:text-sky-400" />
                            ) : (
                              <Pencil size={13} className="text-gray-400 dark:text-slate-500" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-800 dark:text-white">
                              {INTERACTION_TYPE_LABELS[i.type]}
                              {i.subject ? ` — ${i.subject}` : ""}
                            </p>
                            {i.note && (
                              <p className="text-gray-500 dark:text-slate-400 whitespace-pre-wrap break-words">{i.note}</p>
                            )}
                            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                              {new Date(i.occurredAt).toLocaleString()}
                              {i.recordedByName ? ` · by ${i.recordedByName}` : ""}
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
                    const target = viewingContact;
                    setViewingContact(null);
                    openInteraction(target);
                  }}
                >
                  <MessageSquarePlus size={15} /> Log interaction
                </Button>
                <Button variant="secondary" onClick={() => setViewingContact(null)}>
                  Close
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
            <DialogTitle>{editingContact ? "Edit Contact" : "Add New Contact"}</DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update the person's profile, links, and preferences."
                : "Add a person to the central contact database."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  First Name *
                </label>
                <Input disabled={isSaving} {...form.register("firstName")} />
                <FieldError message={form.formState.errors.firstName?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Last Name *
                </label>
                <Input disabled={isSaving} {...form.register("lastName")} />
                <FieldError message={form.formState.errors.lastName?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <Input type="email" placeholder="name@example.com" disabled={isSaving} {...form.register("email")} />
                <FieldError message={form.formState.errors.email?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Phone
                </label>
                <Input type="tel" placeholder="+1 234 567 890" disabled={isSaving} {...form.register("phone")} />
                <FieldError message={form.formState.errors.phone?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Job Title
                </label>
                <Input placeholder="Head of Procurement" disabled={isSaving} {...form.register("jobTitle")} />
                <FieldError message={form.formState.errors.jobTitle?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Department
                </label>
                <Input placeholder="Operations" disabled={isSaving} {...form.register("department")} />
                <FieldError message={form.formState.errors.department?.message} />
              </div>
            </div>

            {/* Account link */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-3">
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
                    {accountsPickerQuery.isLoading ? "Loading accounts..." : "No account (B2C contact)"}
                  </option>
                  {accountOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <label
                className={cn(
                  "flex items-center gap-2 text-sm font-medium cursor-pointer",
                  watchAccountId ? "text-gray-700 dark:text-slate-200" : "text-gray-400 dark:text-slate-500",
                )}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#3F51B5]"
                  disabled={isSaving || !watchAccountId}
                  {...form.register("isPrimary")}
                />
                Primary contact for this account
              </label>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Birthday
                </label>
                <Input type="date" disabled={isSaving} {...form.register("birthday")} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  City
                </label>
                <Input placeholder="Berlin" disabled={isSaving} {...form.register("city")} />
                <FieldError message={form.formState.errors.city?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Country
                </label>
                <Input placeholder="Germany" disabled={isSaving} {...form.register("country")} />
                <FieldError message={form.formState.errors.country?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Address
                </label>
                <Input placeholder="Street, ZIP" disabled={isSaving} {...form.register("address")} />
                <FieldError message={form.formState.errors.address?.message} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Language
                </label>
                <Input placeholder="en / German / ..." disabled={isSaving} {...form.register("language")} />
                <FieldError message={form.formState.errors.language?.message} />
              </div>
            </div>

            {/* Preferences */}
            <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-3">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                Communication Preferences
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Preferred Channel
                  </label>
                  <select disabled={isSaving} className={inputClasses} {...form.register("preferredChannel")}>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div className="space-y-1.5 pt-1">
                  {(
                    [
                      { name: "emailOptIn", label: "Email opt-in" },
                      { name: "phoneOptIn", label: "Phone opt-in" },
                      { name: "smsOptIn", label: "SMS opt-in" },
                    ] as const
                  ).map(({ name, label }) => (
                    <label
                      key={name}
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#3F51B5]"
                        disabled={isSaving || watchDoNotContact}
                        {...form.register(name)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 cursor-pointer border-t border-gray-100 dark:border-slate-800 pt-3">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-red-600"
                  disabled={isSaving}
                  {...form.register("doNotContact")}
                />
                Do not contact — overrides all opt-ins
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Notes
              </label>
              <textarea
                rows={2}
                disabled={isSaving}
                placeholder="Relationship context, preferences, history..."
                className={cn(inputClasses, "resize-none")}
                {...form.register("notes")}
              />
              <FieldError message={form.formState.errors.notes?.message} />
            </div>

            <CustomFieldsSection
              entityType="contact"
              values={customFieldValues}
              onChange={setCustomFieldValues}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingContact ? "Update Contact" : "Create Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Log interaction dialog */}
      <Dialog open={!!interactingContact} onOpenChange={(open) => !open && setInteractingContact(null)}>
        <DialogContent className="max-w-md">
          {interactingContact && (
            <>
              <DialogHeader>
                <DialogTitle>Log Interaction</DialogTitle>
                <DialogDescription>
                  Record a touchpoint with{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {interactingContact.firstName} {interactingContact.lastName}
                  </span>
                  {interactingContact.doNotContact && (
                    <span className="block mt-1 text-red-600 dark:text-red-400 font-medium">
                      ⚠ This contact is flagged do-not-contact.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={interactionForm.handleSubmit(onSubmitInteraction)} className="space-y-4">
                {interactionError && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {interactionError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Type *
                    </label>
                    <select
                      className={inputClasses}
                      disabled={addInteractionMutation.isPending}
                      {...interactionForm.register("type")}
                    >
                      {(Object.entries(INTERACTION_TYPE_LABELS) as [InteractionType, string][]).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Direction
                    </label>
                    <select
                      className={inputClasses}
                      disabled={
                        addInteractionMutation.isPending || interactionForm.watch("type") === "note"
                      }
                      {...interactionForm.register("direction")}
                    >
                      <option value="outbound">Outbound (we reached out)</option>
                      <option value="inbound">Inbound (they reached out)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Subject
                  </label>
                  <Input
                    placeholder="Quarterly review call"
                    disabled={addInteractionMutation.isPending}
                    {...interactionForm.register("subject")}
                  />
                  <FieldError message={interactionForm.formState.errors.subject?.message} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    disabled={addInteractionMutation.isPending}
                    placeholder="What was discussed?"
                    className={cn(inputClasses, "resize-none")}
                    {...interactionForm.register("note")}
                  />
                  <FieldError message={interactionForm.formState.errors.note?.message} />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setInteractingContact(null)}
                    disabled={addInteractionMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={addInteractionMutation.isPending}
                    className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                  >
                    {addInteractionMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                    Log Interaction
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign owner / team dialog */}
      <Dialog open={!!assigningContact} onOpenChange={(open) => !open && setAssigningContact(null)}>
        <DialogContent className="max-w-md">
          {assigningContact && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Contact</DialogTitle>
                <DialogDescription>
                  Route{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {assigningContact.firstName} {assigningContact.lastName}
                  </span>{" "}
                  to a team and/or a record owner. Team members gain visibility of this record.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {assignError && (
                  <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {assignError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Team
                  </label>
                  <select
                    className={inputClasses}
                    value={assignTeamId}
                    disabled={assignContactMutation.isPending || assignTeamsQuery.isLoading}
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
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Loading teams...</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Record Owner
                  </label>
                  <select
                    className={inputClasses}
                    value={assignOwnerId}
                    disabled={assignContactMutation.isPending || assignStaffQuery.isLoading}
                    onChange={(e) => setAssignOwnerId(e.target.value)}
                  >
                    <option value="">Unassigned (no owner)</option>
                    {assignOwnerOptions.map((s) => (
                      <option key={s.keycloakId} value={s.keycloakId}>
                        {staffDisplayName(s)} ({s.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    {assignTeamId
                      ? "Only members of the selected team can own this record."
                      : "Pick a team first to narrow the list to its members."}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssigningContact(null)}
                  disabled={assignContactMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignContactMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignContactMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Save Assignment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <DialogContent className="max-w-md">
          {deletingContact && (
            <>
              <DialogHeader>
                <DialogTitle>Delete contact?</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">
                    {deletingContact.firstName} {deletingContact.lastName}
                  </span>{" "}
                  ({deletingContact.email}) and their communication history. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingContact(null)}
                  disabled={deleteContactMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteContactMutation.isPending}
                >
                  {deleteContactMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Delete Contact
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
