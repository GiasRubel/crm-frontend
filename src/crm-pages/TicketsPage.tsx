"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  EyeOff,
  Inbox,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  TicketCheck,
  Timer,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { initialSearchTermFromUrl } from "@/lib/initial-search-term";
import { useMyTickets, useTickets } from "@/features/tickets/hooks/useTickets";
import { CustomFieldsSection } from "@/features/custom-fields/components/CustomFieldsSection";
import { AttachmentsSection } from "@/features/attachments/components/AttachmentsSection";
import { ImportExportBar } from "@/features/import-export/components/ImportExportBar";
import {
  Ticket,
  TICKET_STATUS_LABELS,
  TICKET_TYPE_LABELS,
  TicketPriority,
  TicketQuery,
  TicketSortField,
  TicketStatus,
  TicketType,
} from "@/features/tickets/types";
import { customerApi } from "@/features/customers/services/customerApi";
import { ticketApi } from "@/features/tickets/services/ticketApi";
import { kbApi } from "@/features/kb/services/kbApi";
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

const ticketFormSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().trim().min(1, "Describe the issue").max(10000),
  customerId: z.string().min(1, "Pick a customer"),
  type: z.enum(["question", "problem", "bug", "feature_request", "billing", "other"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
});
type TicketFormValues = z.infer<typeof ticketFormSchema>;

const myTicketFormSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required").max(200),
  description: z.string().trim().min(1, "Describe the issue").max(10000),
  type: z.enum(["question", "problem", "bug", "feature_request", "billing", "other"]),
});
type MyTicketFormValues = z.infer<typeof myTicketFormSchema>;

// ── Presentational helpers ────────────────────────────────────────────────────

const statusStyles: Record<TicketStatus, string> = {
  open: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
  waiting_on_customer: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  closed: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
};

const priorityStyles: Record<TicketPriority, string> = {
  urgent: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30",
  high: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
  normal: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  low: "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700",
};

function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge variant="outline" className={cn("font-semibold", statusStyles[status])}>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-semibold", priorityStyles[priority])}>
      {priority}
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
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:text-gray-500 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800";

function SortableHead({
  field,
  sortBy,
  sortOrder,
  onToggle,
  children,
  className,
}: {
  field: TicketSortField;
  sortBy: TicketSortField;
  sortOrder: "asc" | "desc";
  onToggle: (field: TicketSortField) => void;
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

/** Conversation thread — shared by staff and portal views. */
function CommentThread({ ticket }: { ticket: Ticket }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
        Conversation ({ticket.comments.length})
      </p>
      {ticket.comments.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-slate-500">No replies yet.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {ticket.comments.map((c, i) => (
            <li
              key={i}
              className={cn(
                "rounded-lg p-3 text-sm border",
                c.isInternal
                  ? "bg-amber-50/60 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30"
                  : c.authorRole === "customer"
                    ? "bg-sky-50/60 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/30"
                    : "bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800",
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-gray-800 dark:text-slate-200">
                  {c.authorName ?? (c.authorRole === "customer" ? "Customer" : "Staff")}
                </span>
                <span className="text-[11px] text-gray-400 dark:text-slate-500">
                  {new Date(c.postedAt).toLocaleString()}
                </span>
                {c.isInternal && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 text-[10px] gap-1">
                    <EyeOff size={10} /> Internal note
                  </Badge>
                )}
              </div>
              <p className="text-gray-700 dark:text-slate-200 whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Customer portal view ──────────────────────────────────────────────────────

function CustomerTicketsView() {
  const { myTicketsQuery, createMyTicketMutation, addMyCommentMutation } = useMyTickets(true);
  const tickets = myTicketsQuery.data ?? [];

  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Ticket | null>(null);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<MyTicketFormValues>({
    resolver: standardSchemaResolver(myTicketFormSchema),
    defaultValues: { subject: "", description: "", type: "question" },
  });

  // Keep the open dialog in sync after mutations refresh the list
  const viewingFresh = viewing ? (tickets.find((t) => t.id === viewing.id) ?? viewing) : null;

  const onSubmit = async (values: MyTicketFormValues) => {
    try {
      await createMyTicketMutation.mutateAsync(values);
      setMessage("Ticket submitted — our team will get back to you.");
      setFormOpen(false);
      form.reset();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit ticket");
    }
  };

  const sendReply = async () => {
    if (!viewingFresh || !reply.trim()) return;
    try {
      await addMyCommentMutation.mutateAsync({ id: viewingFresh.id, body: reply.trim() });
      setReply("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send reply");
    }
  };

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Support</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">Your support tickets and their status.</p>
          </div>
          <Button
            onClick={() => {
              form.reset();
              setFormOpen(true);
            }}
            className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2"
          >
            <Plus size={18} /> New Ticket
          </Button>
        </div>

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium flex items-center gap-2">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400" /> {message}
            </span>
            <button onClick={() => setMessage(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" /> {errorMsg}
            </span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
              <X size={18} />
            </button>
          </div>
        )}

        <Card className="py-0 overflow-hidden">
          {myTicketsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-16">
              <Loader2 size={18} className="animate-spin" /> Loading your tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400 py-16">
              <Inbox size={32} className="text-gray-300 dark:text-slate-600" />
              <p className="font-medium">No tickets yet</p>
              <p className="text-sm text-gray-400 dark:text-slate-500">Raise a ticket and we&apos;ll help you out.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-slate-800">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setViewing(t)}
                    className="w-full px-6 py-4 flex items-center gap-4 text-left hover:bg-gray-50/50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span className="text-xs font-mono font-bold text-gray-400 dark:text-slate-500 shrink-0">{t.number}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white truncate">{t.subject}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {TICKET_TYPE_LABELS[t.type]} · updated {new Date(t.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* New ticket dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Tell us what&apos;s wrong and we&apos;ll get back to you.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Subject *
              </label>
              <Input disabled={createMyTicketMutation.isPending} {...form.register("subject")} />
              <FieldError message={form.formState.errors.subject?.message} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Category
              </label>
              <select className={inputClasses} disabled={createMyTicketMutation.isPending} {...form.register("type")}>
                {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                What happened? *
              </label>
              <textarea
                rows={4}
                className={cn(inputClasses, "resize-none")}
                disabled={createMyTicketMutation.isPending}
                {...form.register("description")}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMyTicketMutation.isPending}
                className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
              >
                {createMyTicketMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                Submit Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Ticket conversation dialog */}
      <Dialog open={!!viewingFresh} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          {viewingFresh && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-400 dark:text-slate-500">{viewingFresh.number}</span>
                  {viewingFresh.subject}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <StatusBadge status={viewingFresh.status} />
                  <span>{TICKET_TYPE_LABELS[viewingFresh.type]}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{viewingFresh.description}</p>
                </div>
                <CommentThread ticket={viewingFresh} />
                {viewingFresh.status !== "closed" ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Write a reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={addMyCommentMutation.isPending}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendReply()}
                    />
                    <Button
                      onClick={sendReply}
                      disabled={addMyCommentMutation.isPending || !reply.trim()}
                      className="bg-[#3F51B5] hover:bg-[#303F9F] text-white shrink-0"
                    >
                      {addMyCommentMutation.isPending ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} />
                      )}
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-slate-500">
                    This ticket is closed. Open a new ticket if you need more help.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Staff helpdesk view ───────────────────────────────────────────────────────

function StaffTicketsView() {
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const [searchTerm, setSearchTerm] = useState(initialSearchTermFromUrl);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [typeFilter, setTypeFilter] = useState<TicketType | "">("");
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<TicketSortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: TicketQuery = useMemo(
    () => ({
      page,
      limit,
      search: debouncedSearch,
      status: statusFilter,
      priority: priorityFilter,
      type: typeFilter,
      unassigned: unassignedOnly ? "true" : "",
      sortBy,
      sortOrder,
    }),
    [page, limit, debouncedSearch, statusFilter, priorityFilter, typeFilter, unassignedOnly, sortBy, sortOrder],
  );

  const {
    ticketsQuery,
    statsQuery,
    createTicketMutation,
    updateTicketMutation,
    setStatusMutation,
    addCommentMutation,
    assignTicketMutation,
    deleteTicketMutation,
  } = useTickets(query);

  const tickets = ticketsQuery.data?.data ?? [];
  const meta = ticketsQuery.data?.meta;
  const stats = statsQuery.data;

  const [formOpen, setFormOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [deletingTicket, setDeletingTicket] = useState<Ticket | null>(null);
  const [assigningTicket, setAssigningTicket] = useState<Ticket | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [replyInternal, setReplyInternal] = useState(false);
  const [articlePick, setArticlePick] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const viewing = viewingId ? (tickets.find((t) => t.id === viewingId) ?? null) : null;
  // Detail may not be on the current page after a filter change — fetch it
  const viewingDetailQuery = useQuery({
    queryKey: ["tickets", "detail", viewingId],
    queryFn: () => ticketApi.getById(viewingId!),
    enabled: !!viewingId && !viewing,
  });
  const viewingTicket = viewing ?? viewingDetailQuery.data ?? null;

  const form = useForm<TicketFormValues>({
    resolver: standardSchemaResolver(ticketFormSchema),
    defaultValues: { subject: "", description: "", customerId: "", type: "question", priority: "normal" },
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, unknown>>({});

  // Pickers
  const customersPickerQuery = useQuery({
    queryKey: ["customers", "picker"],
    queryFn: () => customerApi.getAll({ limit: 100, sortBy: "firstName", sortOrder: "asc" }),
    enabled: formOpen,
  });
  const kbPickerQuery = useQuery({
    queryKey: ["kb", "picker"],
    queryFn: () => kbApi.getAll({ limit: 100, sortBy: "title", sortOrder: "asc" }),
    enabled: !!viewingTicket,
  });
  const assignDialogOpen = isStaffAdmin && !!assigningTicket;
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
  const selectedAssignTeam = assignTeams.find((t) => t.id === assignTeamId);
  const assignOwnerOptions = selectedAssignTeam
    ? (assignStaffQuery.data ?? []).filter((s) =>
        selectedAssignTeam.members.some((m) => m.keycloakId === s.keycloakId),
      )
    : (assignStaffQuery.data ?? []);

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };
  const resetToFirstPage = () => setPage(1);

  const toggleSort = (field: TicketSortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder(field === "subject" || field === "number" ? "asc" : "desc");
    }
    resetToFirstPage();
  };

  const onSubmit = async (values: TicketFormValues) => {
    setFormError(null);
    try {
      const created = await createTicketMutation.mutateAsync({
        ...values,
        customFields: customFieldValues,
      });
      notifySuccess(`Ticket ${created.number} created.`);
      setFormOpen(false);
      form.reset();
      setCustomFieldValues({});
      resetToFirstPage();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create ticket");
    }
  };

  const changeStatus = async (ticket: Ticket, status: TicketStatus) => {
    try {
      await setStatusMutation.mutateAsync({ id: ticket.id, status });
      notifySuccess(`${ticket.number} → ${TICKET_STATUS_LABELS[status]}.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const sendReply = async () => {
    if (!viewingTicket || !reply.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        id: viewingTicket.id,
        data: { body: reply.trim(), isInternal: replyInternal },
      });
      setReply("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to add comment");
    }
  };

  const linkArticle = async () => {
    if (!viewingTicket || !articlePick) return;
    const current = viewingTicket.relatedArticles.map((a) => a.id);
    if (current.includes(articlePick)) return;
    try {
      await updateTicketMutation.mutateAsync({
        id: viewingTicket.id,
        data: { relatedArticleIds: [...current, articlePick] },
      });
      setArticlePick("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to link article");
    }
  };

  const handleAssign = async () => {
    if (!assigningTicket) return;
    setAssignError(null);
    try {
      await assignTicketMutation.mutateAsync({
        id: assigningTicket.id,
        data: { assignedToId: assignOwnerId || null, assignedTeamId: assignTeamId || null },
      });
      notifySuccess(`${assigningTicket.number} reassigned.`);
      setAssigningTicket(null);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to reassign");
    }
  };

  const handleDelete = async () => {
    if (!deletingTicket) return;
    try {
      await deleteTicketMutation.mutateAsync(deletingTicket.id);
      notifySuccess(`Ticket ${deletingTicket.number} deleted.`);
      setDeletingTicket(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete ticket");
      setDeletingTicket(null);
    }
  };

  const sortProps = { sortBy, sortOrder, onToggle: toggleSort };

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tickets</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Customer issues, bugs, and inquiries — from first response to resolution.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ImportExportBar onExport={() => ticketApi.exportCsv(query)} exportFilename="tickets.csv" />
            <Button
              onClick={() => {
                form.reset();
                setCustomFieldValues({});
                setFormError(null);
                setFormOpen(true);
              }}
              className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2"
            >
              <Plus size={18} /> New Ticket
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Open" value={stats?.open} icon={Inbox} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
          <StatCard label="In Progress" value={stats?.inProgress} icon={Clock} accent="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400" />
          <StatCard label="Unassigned" value={stats?.unassigned} icon={UserRound} accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
          <StatCard label="Urgent" value={stats?.urgent} icon={AlertTriangle} accent="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400" />
          <StatCard
            label="No 1st Response"
            value={stats?.awaitingFirstResponse}
            icon={Timer}
            accent="bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400"
          />
          <StatCard
            label="Avg 1st Resp."
            value={stats?.avgFirstResponseHours !== null && stats !== undefined ? `${stats.avgFirstResponseHours}h` : "—"}
            icon={CheckCircle2}
            accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium flex items-center gap-2">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400" /> {successMsg}
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300">
              <X size={18} />
            </button>
          </div>
        )}
        {(errorMsg || ticketsQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              {errorMsg ??
                (ticketsQuery.error instanceof Error ? ticketsQuery.error.message : "Failed to load tickets")}
            </span>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (ticketsQuery.isError) ticketsQuery.refetch();
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filters & table */}
        <Card className="py-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
              <Input
                type="text"
                placeholder="Search number, subject, description..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  resetToFirstPage();
                }}
                className="pl-10"
              />
            </div>
            <div className="flex w-full md:w-auto items-center gap-2 justify-end flex-wrap">
              {ticketsQuery.isFetching && !ticketsQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  className="w-4 h-4 accent-[#3F51B5]"
                  checked={unassignedOnly}
                  onChange={(e) => {
                    setUnassignedOnly(e.target.checked);
                    resetToFirstPage();
                  }}
                />
                Unassigned
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TicketStatus | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Statuses</option>
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value as TicketPriority | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TicketType | "");
                  resetToFirstPage();
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">All Types</option>
                {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  <SortableHead field="number" className="px-6" {...sortProps}>Ticket</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Customer
                  </TableHead>
                  <SortableHead field="type" className="px-6" {...sortProps}>Type</SortableHead>
                  <SortableHead field="priority" className="px-6" {...sortProps}>Priority</SortableHead>
                  <SortableHead field="status" className="px-6" {...sortProps}>Status</SortableHead>
                  <TableHead className="px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Assigned To
                  </TableHead>
                  <SortableHead field="updatedAt" className="px-6" {...sortProps}>Updated</SortableHead>
                  <TableHead className="px-6 text-right text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" /> Fetching tickets...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : tickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <TicketCheck size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">No tickets found</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {debouncedSearch || statusFilter || priorityFilter || typeFilter || unassignedOnly
                            ? "Try adjusting your search or filters."
                            : "Customer issues will land here — or create one on a customer's behalf."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  tickets.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col min-w-0 max-w-[280px]">
                          <button
                            type="button"
                            onClick={() => setViewingId(ticket.id)}
                            className="font-semibold text-gray-900 dark:text-white truncate text-left hover:text-[#3F51B5] dark:hover:text-indigo-300 transition-colors"
                          >
                            {ticket.subject}
                          </button>
                          <span className="text-xs font-mono text-gray-400 dark:text-slate-500">{ticket.number}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 truncate max-w-[160px]">
                        {ticket.customerName ?? "—"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300">
                        {TICKET_TYPE_LABELS[ticket.type]}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <PriorityBadge priority={ticket.priority} />
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        {ticket.assignedToName ? (
                          <div className="flex flex-col min-w-0">
                            <span className="text-gray-700 dark:text-slate-200 font-medium truncate">{ticket.assignedToName}</span>
                            {ticket.assignedTeamName && (
                              <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate flex items-center gap-1">
                                <UsersRound size={11} className="shrink-0" /> {ticket.assignedTeamName}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">
                        {new Date(ticket.updatedAt).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => setViewingId(ticket.id)}>
                              <MessageSquare size={15} /> Open conversation
                            </DropdownMenuItem>
                            {ticket.status !== "resolved" && ticket.status !== "closed" && (
                              <DropdownMenuItem onClick={() => changeStatus(ticket, "resolved")}>
                                <CheckCircle2 size={15} /> Mark resolved
                              </DropdownMenuItem>
                            )}
                            {ticket.status === "resolved" && (
                              <DropdownMenuItem onClick={() => changeStatus(ticket, "closed")}>
                                <Check size={15} /> Close ticket
                              </DropdownMenuItem>
                            )}
                            {(ticket.status === "resolved" || ticket.status === "closed") && (
                              <DropdownMenuItem onClick={() => changeStatus(ticket, "open")}>
                                <Inbox size={15} /> Reopen
                              </DropdownMenuItem>
                            )}
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAssignOwnerId(ticket.assignedToId ?? "");
                                    setAssignTeamId(ticket.assignedTeamId ?? "");
                                    setAssignError(null);
                                    setAssigningTicket(ticket);
                                  }}
                                >
                                  <UsersRound size={15} /> Assign owner / team
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeletingTicket(ticket)}>
                                  <Trash2 size={15} /> Delete ticket
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

          {/* Pagination */}
          {!ticketsQuery.isLoading && meta && meta.total > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-3">
                <span>
                  {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of{" "}
                  {meta.total} tickets
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

      {/* Conversation / detail dialog */}
      <Dialog open={!!viewingId} onOpenChange={(open) => !open && setViewingId(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          {viewingTicket ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-400 dark:text-slate-500">{viewingTicket.number}</span>
                  {viewingTicket.subject}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={viewingTicket.status} />
                  <PriorityBadge priority={viewingTicket.priority} />
                  <span>{TICKET_TYPE_LABELS[viewingTicket.type]}</span>
                  {viewingTicket.customerName && <span>· {viewingTicket.customerName}</span>}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status workflow */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status:</label>
                  <select
                    className={cn(inputClasses, "w-auto py-1.5")}
                    value={viewingTicket.status}
                    disabled={setStatusMutation.isPending}
                    onChange={(e) => changeStatus(viewingTicket, e.target.value as TicketStatus)}
                  >
                    {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {viewingTicket.firstResponseAt ? (
                    <span className="text-[11px] text-gray-400 dark:text-slate-500">
                      First response: {new Date(viewingTicket.firstResponseAt).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-[11px] text-orange-500 dark:text-orange-400 font-semibold">Awaiting first response</span>
                  )}
                </div>

                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{viewingTicket.description}</p>
                </div>

                <AttachmentsSection entityType="ticket" entityId={viewingTicket.id} />

                <CommentThread ticket={viewingTicket} />

                {/* Reply box */}
                {viewingTicket.status !== "closed" && (
                  <div className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder={replyInternal ? "Internal note (customer never sees this)..." : "Reply to the customer..."}
                      className={cn(inputClasses, "resize-none", replyInternal && "bg-amber-50/50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30")}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={addCommentMutation.isPending}
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-amber-500"
                          checked={replyInternal}
                          onChange={(e) => setReplyInternal(e.target.checked)}
                        />
                        <EyeOff size={12} /> Internal note
                      </label>
                      <Button
                        size="sm"
                        onClick={sendReply}
                        disabled={addCommentMutation.isPending || !reply.trim()}
                        className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-1.5"
                      >
                        {addCommentMutation.isPending ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                        {replyInternal ? "Add note" : "Send reply"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Knowledge base links */}
                <div className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-800/50 space-y-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={13} /> Linked Knowledge Base Articles
                  </p>
                  {viewingTicket.relatedArticles.length > 0 && (
                    <ul className="space-y-1">
                      {viewingTicket.relatedArticles.map((a) => (
                        <li key={a.id} className="text-sm text-gray-700 dark:text-slate-200 flex items-center gap-2">
                          <BookOpen size={13} className="text-gray-400 dark:text-slate-500 shrink-0" /> {a.title}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-2">
                    <select
                      className={cn(inputClasses, "flex-1")}
                      value={articlePick}
                      disabled={kbPickerQuery.isLoading || updateTicketMutation.isPending}
                      onChange={(e) => setArticlePick(e.target.value)}
                    >
                      <option value="">
                        {kbPickerQuery.isLoading ? "Loading articles..." : "Link an article as resolution..."}
                      </option>
                      {(kbPickerQuery.data?.data ?? [])
                        .filter((a) => !viewingTicket.relatedArticles.some((r) => r.id === a.id))
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="outline"
                      onClick={linkArticle}
                      disabled={!articlePick || updateTicketMutation.isPending}
                    >
                      Link
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="secondary" onClick={() => setViewingId(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-16">
              <Loader2 size={18} className="animate-spin" /> Loading ticket...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && setFormOpen(false)}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Ticket</DialogTitle>
            <DialogDescription>Log an issue on behalf of a customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" /> {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Customer *
              </label>
              <select
                className={inputClasses}
                disabled={createTicketMutation.isPending || customersPickerQuery.isLoading}
                {...form.register("customerId")}
              >
                <option value="">
                  {customersPickerQuery.isLoading ? "Loading customers..." : "Select a customer"}
                </option>
                {(customersPickerQuery.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName} ({c.email})
                  </option>
                ))}
              </select>
              <FieldError message={form.formState.errors.customerId?.message} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Subject *
              </label>
              <Input disabled={createTicketMutation.isPending} {...form.register("subject")} />
              <FieldError message={form.formState.errors.subject?.message} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select className={inputClasses} disabled={createTicketMutation.isPending} {...form.register("type")}>
                  {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Priority
                </label>
                <select className={inputClasses} disabled={createTicketMutation.isPending} {...form.register("priority")}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Description *
              </label>
              <textarea
                rows={4}
                className={cn(inputClasses, "resize-none")}
                disabled={createTicketMutation.isPending}
                {...form.register("description")}
              />
              <FieldError message={form.formState.errors.description?.message} />
            </div>

            <CustomFieldsSection
              entityType="ticket"
              values={customFieldValues}
              onChange={setCustomFieldValues}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTicketMutation.isPending}
                className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
              >
                {createTicketMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                Create Ticket
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={!!assigningTicket} onOpenChange={(open) => !open && setAssigningTicket(null)}>
        <DialogContent className="max-w-md">
          {assigningTicket && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Ticket</DialogTitle>
                <DialogDescription>
                  Route <span className="font-semibold text-gray-700 dark:text-slate-200">{assigningTicket.number}</span> to a
                  team and/or an owner.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {assignError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" /> {assignError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Team
                  </label>
                  <select
                    className={inputClasses}
                    value={assignTeamId}
                    disabled={assignTicketMutation.isPending || assignTeamsQuery.isLoading}
                    onChange={(e) => {
                      const teamId = e.target.value;
                      setAssignTeamId(teamId);
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
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Owner
                  </label>
                  <select
                    className={inputClasses}
                    value={assignOwnerId}
                    disabled={assignTicketMutation.isPending || assignStaffQuery.isLoading}
                    onChange={(e) => setAssignOwnerId(e.target.value)}
                  >
                    <option value="">Unassigned (triage queue)</option>
                    {assignOwnerOptions.map((s) => (
                      <option key={s.keycloakId} value={s.keycloakId}>
                        {staffDisplayName(s)} ({s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAssigningTicket(null)}
                  disabled={assignTicketMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={assignTicketMutation.isPending}
                  className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                >
                  {assignTicketMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Save Assignment
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deletingTicket} onOpenChange={(open) => !open && setDeletingTicket(null)}>
        <DialogContent className="max-w-md">
          {deletingTicket && (
            <>
              <DialogHeader>
                <DialogTitle>Delete ticket?</DialogTitle>
                <DialogDescription>
                  This permanently removes{" "}
                  <span className="font-semibold text-gray-700 dark:text-slate-200">{deletingTicket.number}</span> and its
                  conversation. Consider closing instead — this cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingTicket(null)}
                  disabled={deleteTicketMutation.isPending}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteTicketMutation.isPending}>
                  {deleteTicketMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  Delete Ticket
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Page (role switch) ────────────────────────────────────────────────────────

export function TicketsPage() {
  const { user } = useAuth();
  if (user?.role === "Customer") return <CustomerTicketsView />;
  return <StaffTicketsView />;
}
