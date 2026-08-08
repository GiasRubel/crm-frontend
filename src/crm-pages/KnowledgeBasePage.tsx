"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  Archive,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Globe,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/keycloak-provider";
import { useDebouncedValue } from "@/features/customers/hooks/useCustomers";
import { initialSearchTermFromUrl } from "@/lib/initial-search-term";
import { useKb } from "@/features/kb/hooks/useKb";
import {
  KbArticle,
  KbQuery,
  KbStatus,
  KbVisibility,
} from "@/features/kb/types";
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

const articleFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  body: z.string().trim().min(1, "Write the article body").max(50000),
  category: z.string().max(50).optional(),
  tags: z.string().max(400).optional(), // comma-separated in the form
  visibility: z.enum(["internal", "public"]),
  status: z.enum(["draft", "published", "archived"]),
});
type ArticleFormValues = z.infer<typeof articleFormSchema>;

const emptyFormValues: ArticleFormValues = {
  title: "",
  body: "",
  category: "",
  tags: "",
  visibility: "internal",
  status: "draft",
};

// ── Presentational helpers ────────────────────────────────────────────────────

const statusStyles: Record<KbStatus, string> = {
  draft: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300",
  archived: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-800",
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
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value ?? "—"}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:dark:bg-slate-800/50 disabled:text-gray-500 disabled:dark:text-slate-400";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message}</p>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function KnowledgeBasePage() {
  const t = useTranslations("kb");
  const tc = useTranslations("common");
  const { user } = useAuth();
  const isStaffAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const [searchTerm, setSearchTerm] = useState(initialSearchTermFromUrl);
  const [statusFilter, setStatusFilter] = useState<KbStatus | "">("");
  const [visibilityFilter, setVisibilityFilter] = useState<KbVisibility | "">("");
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const query: KbQuery = useMemo(
    () => ({
      page,
      limit: 10,
      search: debouncedSearch,
      status: statusFilter,
      visibility: visibilityFilter,
    }),
    [page, debouncedSearch, statusFilter, visibilityFilter],
  );

  const {
    articlesQuery,
    statsQuery,
    createArticleMutation,
    updateArticleMutation,
    deleteArticleMutation,
  } = useKb(query);

  const articles = articlesQuery.data?.data ?? [];
  const meta = articlesQuery.data?.meta;
  const stats = statsQuery.data;

  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KbArticle | null>(null);
  const [viewingArticle, setViewingArticle] = useState<KbArticle | null>(null);
  const [deletingArticle, setDeletingArticle] = useState<KbArticle | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ArticleFormValues>({
    resolver: standardSchemaResolver(articleFormSchema),
    defaultValues: emptyFormValues,
  });

  const isSaving = createArticleMutation.isPending || updateArticleMutation.isPending;

  const notifySuccess = (message: string) => {
    setSuccessMsg(message);
    setErrorMsg(null);
  };

  const openCreate = () => {
    form.reset(emptyFormValues);
    setEditingArticle(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (article: KbArticle) => {
    form.reset({
      title: article.title,
      body: article.body,
      category: article.category ?? "",
      tags: article.tags.join(", "),
      visibility: article.visibility,
      status: article.status,
    });
    setEditingArticle(article);
    setFormError(null);
    setFormOpen(true);
  };

  const onSubmit = async (values: ArticleFormValues) => {
    setFormError(null);
    const payload = {
      title: values.title,
      body: values.body,
      category: values.category?.trim() || undefined,
      tags: values.tags
        ? values.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      visibility: values.visibility,
      status: values.status,
    };
    try {
      if (editingArticle) {
        await updateArticleMutation.mutateAsync({ id: editingArticle.id, data: payload });
        notifySuccess(t("toasts.updated", { title: values.title }));
      } else {
        await createArticleMutation.mutateAsync(payload);
        notifySuccess(
          values.status === "published"
            ? t("toasts.createdPublished", { title: values.title })
            : t("toasts.createdDraft", { title: values.title }),
        );
        setPage(1);
      }
      setFormOpen(false);
      setEditingArticle(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("toasts.saveFailed"));
    }
  };

  const quickStatus = async (article: KbArticle, status: KbStatus) => {
    try {
      await updateArticleMutation.mutateAsync({ id: article.id, data: { status } });
      notifySuccess(
        status === "published"
          ? t("toasts.publishedMsg", { title: article.title })
          : t("toasts.archivedMsg", { title: article.title }),
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.updateFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deletingArticle) return;
    try {
      await deleteArticleMutation.mutateAsync(deletingArticle.id);
      notifySuccess(t("toasts.deletedMsg", { title: deletingArticle.title }));
      setDeletingArticle(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t("toasts.deleteFailed"));
      setDeletingArticle(null);
    }
  };

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.open("/faq", "_blank", "noopener")} className="gap-2">
              <Globe size={16} /> {t("viewPublicFaq")}
            </Button>
            <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2">
              <Plus size={18} /> {t("newArticle")}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label={t("stats.articles")} value={stats?.total} icon={BookOpen} accent="bg-[#3F51B5]/10 text-[#3F51B5] dark:bg-indigo-500/15 dark:text-indigo-300" />
          <StatCard label={t("stats.published")} value={stats?.published} icon={Send} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" />
          <StatCard label={t("stats.drafts")} value={stats?.drafts} icon={FileText} accent="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" />
          <StatCard label={t("stats.archived")} value={stats?.archived} icon={Archive} accent="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" />
          <StatCard label={t("stats.publicFaq")} value={stats?.publicArticles} icon={Globe} accent="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400" />
          <StatCard label={t("stats.totalViews")} value={stats?.totalViews} icon={Eye} accent="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" />
        </div>

        {/* Notifications */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium flex items-center gap-2">
              <Check size={18} className="text-emerald-600 dark:text-emerald-400" /> {successMsg}
            </span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 dark:text-emerald-400">
              <X size={18} />
            </button>
          </div>
        )}
        {(errorMsg || articlesQuery.isError) && (
          <div className="bg-red-50 border border-red-200 text-red-800 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <span className="text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              {errorMsg ??
                (articlesQuery.error instanceof Error ? articlesQuery.error.message : t("toasts.loadFailed"))}
            </span>
            <button
              onClick={() => {
                setErrorMsg(null);
                if (articlesQuery.isError) articlesQuery.refetch();
              }}
              className="text-red-500 hover:text-red-700 dark:text-red-400"
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
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              {articlesQuery.isFetching && !articlesQuery.isLoading && (
                <Loader2 size={16} className="animate-spin text-gray-400 dark:text-slate-500" />
              )}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as KbStatus | "");
                  setPage(1);
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("allStatuses")}</option>
                <option value="draft">{t("statusDraft")}</option>
                <option value="published">{t("statusPublished")}</option>
                <option value="archived">{t("statusArchived")}</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value as KbVisibility | "");
                  setPage(1);
                }}
                className={cn(inputClasses, "w-auto py-1.5")}
              >
                <option value="">{t("anyVisibility")}</option>
                <option value="internal">{t("internalWiki")}</option>
                <option value="public">{t("publicFaqOption")}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/75 hover:bg-gray-50/75 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                  {[
                    t("table.article"),
                    t("table.category"),
                    t("table.visibility"),
                    t("table.status"),
                    t("table.views"),
                    t("table.feedback"),
                    t("table.updated"),
                    "",
                  ].map((h, i) => (
                    <TableHead
                      key={i}
                      className={cn(
                        "px-6 text-xs uppercase tracking-wider font-semibold text-gray-500 dark:text-slate-400",
                        h === "" && "text-right",
                      )}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {articlesQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 size={18} className="animate-spin" /> {t("fetchingArticles")}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : articles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                        <BookOpen size={32} className="text-gray-300 dark:text-slate-600" />
                        <p className="font-medium">{t("noArticlesYet")}</p>
                        <p className="text-sm text-gray-400 dark:text-slate-500">
                          {t("noArticlesDesc")}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  articles.map((article) => (
                    <TableRow key={article.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                      <TableCell className="px-6 py-4">
                        <div className="flex flex-col min-w-0 max-w-[300px]">
                          <button
                            type="button"
                            onClick={() => setViewingArticle(article)}
                            className="font-semibold text-gray-900 dark:text-white truncate text-left hover:text-[#3F51B5] transition-colors"
                          >
                            {article.title}
                          </button>
                          <span className="text-xs text-gray-400 dark:text-slate-500 font-mono truncate">/{article.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-slate-300 capitalize">
                        {article.category ?? <span className="text-gray-300 dark:text-slate-600">—</span>}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {article.visibility === "public" ? (
                          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 font-semibold gap-1">
                            <Globe size={11} /> {t("publicBadge")}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800 font-semibold gap-1">
                            <Lock size={11} /> {t("internalBadge")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[article.status])}>
                          {article.status === "draft" ? t("statusDraft") : article.status === "published" ? t("statusPublished") : t("statusArchived")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm font-semibold text-gray-700 dark:text-slate-200">{article.views}</TableCell>
                      <TableCell className="px-6 py-4 text-sm">
                        <span className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                            <ThumbsUp size={12} /> {article.helpfulCount}
                          </span>
                          <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400">
                            <ThumbsDown size={12} /> {article.notHelpfulCount}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-gray-500 dark:text-slate-400 text-sm">
                        {new Date(article.updatedAt).toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => setViewingArticle(article)}>
                              <Eye size={15} /> {t("read")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(article)}>
                              <Pencil size={15} /> {t("edit")}
                            </DropdownMenuItem>
                            {article.status !== "published" && (
                              <DropdownMenuItem onClick={() => quickStatus(article, "published")}>
                                <Send size={15} /> {t("publish")}
                              </DropdownMenuItem>
                            )}
                            {article.status === "published" && (
                              <DropdownMenuItem onClick={() => quickStatus(article, "archived")}>
                                <Archive size={15} /> {t("archive")}
                              </DropdownMenuItem>
                            )}
                            {isStaffAdmin && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setDeletingArticle(article)}>
                                  <Trash2 size={15} /> {t("delete")}
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

          {!articlesQuery.isLoading && meta && meta.total > 0 && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              <span>
                {t("articlesRange", {
                  from: (meta.page - 1) * meta.limit + 1,
                  to: Math.min(meta.page * meta.limit, meta.total),
                  total: meta.total,
                })}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1}>
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

      {/* Read dialog */}
      <Dialog open={!!viewingArticle} onOpenChange={(open) => !open && setViewingArticle(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          {viewingArticle && (
            <>
              <DialogHeader>
                <DialogTitle>{viewingArticle.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={cn("capitalize font-semibold", statusStyles[viewingArticle.status])}>
                    {viewingArticle.status === "draft" ? t("statusDraft") : viewingArticle.status === "published" ? t("statusPublished") : t("statusArchived")}
                  </Badge>
                  {viewingArticle.visibility === "public" ? (
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 gap-1">
                      <Globe size={11} /> {t("view.publicFaqBadge")}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-800 gap-1">
                      <Lock size={11} /> {t("view.internalBadge")}
                    </Badge>
                  )}
                  {viewingArticle.category && <span className="capitalize">· {viewingArticle.category}</span>}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="bg-gray-50/75 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{viewingArticle.body}</p>
                </div>
                {viewingArticle.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {viewingArticle.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="bg-white text-gray-500 border-gray-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 dark:text-slate-500">
                  {t("view.byAuthor", {
                    author: viewingArticle.authorName ?? t("view.unknownAuthor"),
                    views: viewingArticle.views,
                    helpful: viewingArticle.helpfulCount,
                  })}
                  {viewingArticle.updatedByName ? t("view.lastEditedBy", { name: viewingArticle.updatedByName }) : ""}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    const target = viewingArticle;
                    setViewingArticle(null);
                    openEdit(target);
                  }}
                >
                  <Pencil size={15} /> {t("view.edit")}
                </Button>
                <Button variant="secondary" onClick={() => setViewingArticle(null)}>
                  {t("view.close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && !isSaving && setFormOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingArticle ? t("form.editTitle") : t("form.newTitle")}</DialogTitle>
            <DialogDescription>
              {editingArticle ? t("form.editDesc") : t("form.newDesc")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/15 dark:border-red-500/30 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" /> {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.titleLabel")}
              </label>
              <Input placeholder={t("form.titlePlaceholder")} disabled={isSaving} {...form.register("title")} />
              <FieldError message={form.formState.errors.title?.message} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.category")}
                </label>
                <Input placeholder={t("form.categoryPlaceholder")} disabled={isSaving} {...form.register("category")} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.tags")}
                </label>
                <Input placeholder={t("form.tagsPlaceholder")} disabled={isSaving} {...form.register("tags")} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t("form.body")}
              </label>
              <textarea
                rows={10}
                placeholder={t("form.bodyPlaceholder")}
                className={cn(inputClasses, "resize-y font-mono text-[13px]")}
                disabled={isSaving}
                {...form.register("body")}
              />
              <FieldError message={form.formState.errors.body?.message} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.visibility")}
                </label>
                <select className={inputClasses} disabled={isSaving} {...form.register("visibility")}>
                  <option value="internal">{t("form.internalOption")}</option>
                  <option value="public">{t("form.publicOption")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                  {t("form.status")}
                </label>
                <select className={inputClasses} disabled={isSaving} {...form.register("status")}>
                  <option value="draft">{t("form.draftOption")}</option>
                  <option value="published">{t("form.publishedOption")}</option>
                  <option value="archived">{t("form.archivedOption")}</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>
                {tc("cancel")}
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-[#3F51B5] hover:bg-[#303F9F] text-white">
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {editingArticle ? t("form.updateArticle") : t("form.createArticle")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deletingArticle} onOpenChange={(open) => !open && setDeletingArticle(null)}>
        <DialogContent className="max-w-md">
          {deletingArticle && (
            <>
              <DialogHeader>
                <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
                <DialogDescription>
                  {t("deleteDialog.desc", {
                    title: deletingArticle.title,
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeletingArticle(null)}
                  disabled={deleteArticleMutation.isPending}
                >
                  {tc("cancel")}
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteArticleMutation.isPending}>
                  {deleteArticleMutation.isPending && <Loader2 size={15} className="animate-spin" />}
                  {t("deleteDialog.deleteArticle")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
