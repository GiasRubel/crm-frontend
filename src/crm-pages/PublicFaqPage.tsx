"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  Loader2,
  Search,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { kbApi } from "@/features/kb/services/kbApi";
import { PublicKbArticle } from "@/features/kb/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Public help center — no sign-in required. Lists published+public KB
 * articles (GET /kb/public) with search, category filter, article view
 * (view-counted), and anonymous helpful/not-helpful feedback.
 */
export function PublicFaqPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [voted, setVoted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const listQuery = useQuery({
    queryKey: ["kb", "public", debouncedSearch, category],
    queryFn: () => kbApi.getPublic(debouncedSearch, category),
  });
  const articles = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const articleQuery = useQuery({
    queryKey: ["kb", "public-article", openSlug],
    queryFn: () => kbApi.getPublicBySlug(openSlug!),
    enabled: !!openSlug,
  });
  const article = articleQuery.data;

  const categories = useMemo(
    () => [...new Set(articles.map((a) => a.category).filter((c): c is string => !!c))].sort(),
    [articles],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, PublicKbArticle[]>();
    for (const a of articles) {
      const key = a.category ?? "general";
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()];
  }, [articles]);

  const sendVote = async (target: PublicKbArticle, helpful: boolean) => {
    if (voted[target.id]) return;
    try {
      await kbApi.sendFeedback(target.id, helpful);
      setVoted((v) => ({ ...v, [target.id]: true }));
    } catch {
      // anonymous vote — fail silently
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-[#3F51B5] text-white">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center space-y-4">
          <h1 className="text-3xl font-bold">How can we help?</h1>
          <p className="text-white/80 text-sm">
            Answers to common questions — search or browse by topic.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
            <Input
              type="text"
              placeholder="Search the help center..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setOpenSlug(null);
              }}
              className="pl-10 bg-white dark:bg-slate-900 text-gray-900 dark:text-white h-11"
            />
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {openSlug ? (
          /* ── Article view ── */
          <Card>
            <CardContent className="p-8 space-y-5">
              <Button variant="ghost" size="sm" className="text-gray-500 dark:text-slate-400 -ml-2" onClick={() => setOpenSlug(null)}>
                <ChevronLeft size={16} /> All articles
              </Button>
              {articleQuery.isLoading ? (
                <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-16">
                  <Loader2 size={18} className="animate-spin" /> Loading article...
                </div>
              ) : articleQuery.isError || !article ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">This article is no longer available.</p>
              ) : (
                <>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{article.title}</h2>
                    {article.category && (
                      <Badge variant="outline" className="mt-2 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 capitalize">
                        {article.category}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[15px] leading-7 text-gray-700 dark:text-slate-200 whitespace-pre-wrap">{article.body}</p>
                  {article.tags.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {article.tags.map((t) => (
                        <Badge key={t} variant="outline" className="bg-white dark:bg-slate-900 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-slate-800">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="border-t border-gray-100 dark:border-slate-800 pt-5 flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-slate-400">Was this article helpful?</span>
                    {voted[article.id] ? (
                      <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Thanks for the feedback!</span>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => sendVote(article, true)}>
                          <ThumbsUp size={14} /> Yes
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => sendVote(article, false)}>
                          <ThumbsDown size={14} /> No
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          /* ── List view ── */
          <>
            {categories.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCategory("")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize",
                    !category
                      ? "bg-[#3F51B5] text-white border-[#3F51B5]"
                      : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:border-[#3F51B5]/40",
                  )}
                >
                  All topics
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c === category ? "" : c)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors capitalize",
                      category === c
                        ? "bg-[#3F51B5] text-white border-[#3F51B5]"
                        : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-800 hover:border-[#3F51B5]/40",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {listQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 text-gray-400 dark:text-slate-500 py-20">
                <Loader2 size={18} className="animate-spin" /> Loading help center...
              </div>
            ) : articles.length === 0 ? (
              <Card>
                <CardContent className="py-16 flex flex-col items-center gap-2 text-gray-500 dark:text-slate-400">
                  <BookOpen size={32} className="text-gray-300 dark:text-slate-600" />
                  <p className="font-medium">No articles found</p>
                  <p className="text-sm text-gray-400 dark:text-slate-500">
                    {debouncedSearch ? "Try a different search term." : "Check back soon."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              grouped.map(([cat, items]) => (
                <div key={cat} className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-[2px] px-1 capitalize">
                    {cat}
                  </h3>
                  <Card className="py-0 overflow-hidden">
                    <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                      {items.map((a) => (
                        <li key={a.id}>
                          <button
                            type="button"
                            onClick={() => setOpenSlug(a.slug)}
                            className="w-full px-6 py-4 flex items-center gap-3 text-left hover:bg-gray-50/70 dark:hover:bg-slate-800 transition-colors"
                          >
                            <BookOpen size={16} className="text-[#3F51B5] shrink-0" />
                            <span className="font-medium text-gray-800 dark:text-white flex-1 truncate">{a.title}</span>
                            {a.helpfulCount > 0 && (
                              <span className="text-[11px] text-gray-400 dark:text-slate-500 flex items-center gap-1 shrink-0">
                                <ThumbsUp size={11} /> {a.helpfulCount}
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
