"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CalendarSync,
  Check,
  Loader2,
  RefreshCw,
  Unplug,
  X,
} from "lucide-react";
import { useCalendarSync } from "@/features/calendar-sync/hooks/useCalendarSync";
import {
  CALENDAR_PROVIDER_LABELS,
  CalendarConnection,
  CalendarProvider,
} from "@/features/calendar-sync/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PROVIDERS: CalendarProvider[] = ["google", "microsoft"];

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Connection was cancelled.",
  invalid_state: "That connection request expired or was already used — try again.",
  connection_failed: "Couldn't complete the connection. Please try again.",
  missing_code: "The provider didn't return an authorization code. Please try again.",
};

function statusBadge(connection: CalendarConnection) {
  if (connection.status === "active") {
    return (
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
        Connected
      </Badge>
    );
  }
  if (connection.status === "error") {
    return (
      <Badge className="bg-red-50 text-red-600 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30">
        Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-gray-500 dark:text-slate-400">
      Disconnected
    </Badge>
  );
}

export function CalendarSyncPage() {
  const searchParams = useSearchParams();
  const {
    connectionsQuery,
    connectMutation,
    syncNowMutation,
    disconnectMutation,
  } = useCalendarSync();

  const [banner, setBanner] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<CalendarConnection | null>(null);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      setBanner({
        kind: "success",
        text: `${CALENDAR_PROVIDER_LABELS[connected as CalendarProvider] ?? connected} connected.`,
      });
    } else if (error) {
      setBanner({
        kind: "error",
        text: CALLBACK_ERROR_MESSAGES[error] ?? "Something went wrong connecting your calendar.",
      });
    }
    // Only react to the query params present on initial navigation back from the OAuth callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connections = connectionsQuery.data ?? [];
  const connectionByProvider = new Map(connections.map((c) => [c.provider, c]));

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    await disconnectMutation.mutateAsync(disconnectTarget.id);
    setDisconnectTarget(null);
  };

  return (
    <div className="p-6 lg:p-8 bg-[#F4F5F7] dark:bg-slate-950 min-h-screen">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href="/activities"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 mb-3"
          >
            <ArrowLeft size={14} />
            Back to Activities
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              <CalendarSync size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Calendar sync</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Connect your calendar for live two-way sync — meetings you create in the CRM
                appear on your calendar, and events you add or edit there sync back here.
              </p>
            </div>
          </div>
        </div>

        {banner && (
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm",
              banner.kind === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
            )}
          >
            {banner.kind === "success" ? <Check size={15} /> : <AlertCircle size={15} />}
            {banner.text}
            <button className="ml-auto" onClick={() => setBanner(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {connectionsQuery.isLoading ? (
          <div className="p-10 text-center text-gray-400 dark:text-slate-500">
            <Loader2 size={20} className="animate-spin mx-auto" />
          </div>
        ) : (
          <div className="space-y-4">
            {PROVIDERS.map((provider) => {
              const connection = connectionByProvider.get(provider);
              return (
                <Card key={provider} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-gray-50 text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                    <Calendar size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 dark:text-white">
                        {CALENDAR_PROVIDER_LABELS[provider]}
                      </p>
                      {connection && statusBadge(connection)}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                      {connection
                        ? (connection.providerAccountEmail ?? "Connected account")
                        : "Not connected"}
                      {connection?.lastSyncedAt &&
                        ` · last synced ${new Date(connection.lastSyncedAt).toLocaleString()}`}
                      {connection?.status === "error" && connection.lastError
                        ? ` · ${connection.lastError}`
                        : ""}
                    </p>
                  </div>
                  {connection ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        disabled={syncNowMutation.isPending}
                        onClick={() => syncNowMutation.mutate(connection.id)}
                      >
                        {syncNowMutation.isPending && syncNowMutation.variables === connection.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        Sync now
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 gap-1.5"
                        onClick={() => setDisconnectTarget(connection)}
                      >
                        <Unplug size={14} />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="bg-[#3F51B5] hover:bg-[#303F9F] text-white"
                      disabled={connectMutation.isPending}
                      onClick={() => connectMutation.mutate(provider)}
                    >
                      {connectMutation.isPending && connectMutation.variables === provider ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        "Connect"
                      )}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!disconnectTarget} onOpenChange={(open) => !open && setDisconnectTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect calendar?</DialogTitle>
            <DialogDescription>
              {disconnectTarget &&
                `Meetings will stop syncing with ${CALENDAR_PROVIDER_LABELS[disconnectTarget.provider]}. Events already created there won't be removed.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisconnectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDisconnect}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                "Disconnect"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
