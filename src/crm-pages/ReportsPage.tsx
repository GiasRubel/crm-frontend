"use client";

import React, { useState } from "react";
import { BarChart3, LayoutDashboard } from "lucide-react";
import { ReportsAnalytics } from "@/features/reports/components/ReportsAnalytics";
import { ReportBuilder } from "@/features/reports/components/ReportBuilder";
import { cn } from "@/lib/utils";

type Tab = "analytics" | "builder";

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("analytics");

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reporting &amp; Analytics</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Real-time overviews of your pipeline, conversion, and team — plus a custom report builder.
            </p>
          </div>
          {/* Tabs */}
          <div className="flex rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shrink-0">
            <button
              onClick={() => setTab("analytics")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "analytics" ? "bg-[#3F51B5] text-white" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800",
              )}
            >
              <LayoutDashboard size={16} /> Dashboards
            </button>
            <button
              onClick={() => setTab("builder")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === "builder" ? "bg-[#3F51B5] text-white" : "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800",
              )}
            >
              <BarChart3 size={16} /> Report Builder
            </button>
          </div>
        </div>

        {tab === "analytics" ? <ReportsAnalytics /> : <ReportBuilder />}
      </div>
    </div>
  );
}
