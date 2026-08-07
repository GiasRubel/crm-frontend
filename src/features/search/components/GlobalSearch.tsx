"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { entityRoute } from "@/lib/entity-routes";
import { useGlobalSearch } from "../hooks/useGlobalSearch";
import { SearchResult, SearchResultType } from "../types";

const TYPE_LABELS: Record<SearchResultType, string> = {
  lead: "Leads",
  contact: "Contacts",
  account: "Accounts",
  opportunity: "Opportunities",
  customer: "Customers",
  ticket: "Tickets",
  kb_article: "Knowledge Base",
};

function groupByType(results: SearchResult[]): [SearchResultType, SearchResult[]][] {
  const groups = new Map<SearchResultType, SearchResult[]>();
  for (const result of results) {
    const list = groups.get(result.type) ?? [];
    list.push(result);
    groups.set(result.type, list);
  }
  return Array.from(groups.entries());
}

export function GlobalSearch() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const { data, isFetching } = useGlobalSearch(term);
  const results = data ?? [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    router.push(entityRoute(result.type, result.title));
    setOpen(false);
    setTerm("");
  };

  const showPanel = open && term.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      <div className="relative group">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors"
          size={18}
        />
        <Input
          placeholder="Search everything..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-full pl-10 h-11 focus-visible:ring-primary/20"
        />
      </div>

      {showPanel && (
        <div className="absolute top-full left-0 mt-2 w-full max-h-[70vh] overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 z-50">
          {isFetching && results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
              No results for &quot;{term.trim()}&quot;
            </p>
          ) : (
            groupByType(results).map(([type, items]) => (
              <div key={type} className="py-1">
                <p className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-slate-500">
                  {TYPE_LABELS[type]}
                </p>
                {items.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleSelect(item)}
                    className="w-full flex flex-col items-start px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground rounded-md"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-slate-100">{item.title}</span>
                    {item.subtitle && (
                      <span className="text-xs text-gray-500 dark:text-slate-400">{item.subtitle}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
