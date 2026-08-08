"use client";

import { useAuth } from "@/providers/keycloak-provider";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // middleware.ts already gates every (crm) route on a valid session cookie
  // before this ever renders — no client-side redirect-to-login needed here.
  const t = useTranslations("layout");
  const { authenticated, isLoading, subscriptionStatus, deploymentMode, user } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleManageBilling = async () => {
    try {
      setIsRedirecting(true);
      const res = await apiClient.post<{ url: string }>("/subscriptions/portal-session", {});
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (error) {
      console.error("Failed to redirect to Stripe Billing Portal", error);
    } finally {
      setIsRedirecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-6 p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md shadow-2xl">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute h-full w-full rounded-full border-4 border-indigo-500/10" />
            <div className="absolute h-full w-full rounded-full border-4 border-t-indigo-500 border-r-indigo-400 animate-spin" />
            <span className="text-xl font-black text-indigo-400">C</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h3 className="font-semibold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">{t("securingSession")}</h3>
            <p className="text-xs text-slate-400/80">{t("loadingProfile")}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  // Standalone (Regular License) installs have no billing to enforce.
  const isLocked =
    deploymentMode !== "standalone" &&
    subscriptionStatus &&
    subscriptionStatus !== "active" &&
    subscriptionStatus !== "trialing";

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:ms-64 transition-all duration-300">
        {isLocked && (
          <Alert variant="destructive" className="rounded-none border-b border-rose-500/20 bg-rose-500/10 text-rose-200 py-3 px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <AlertDescription className="text-sm font-medium">
                {t("subscriptionInactive")}
              </AlertDescription>
            </div>
            {user?.role === "Admin" && (
              <Button
                variant="outline"
                size="sm"
                className="border-rose-500/30 hover:bg-rose-500/20 text-rose-200 hover:text-white"
                onClick={handleManageBilling}
                disabled={isRedirecting}
              >
                {isRedirecting ? t("redirecting") : t("manageBilling")}
              </Button>
            )}
          </Alert>
        )}
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
