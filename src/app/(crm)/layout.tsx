"use client";

import { useAuth } from "@/providers/keycloak-provider";
import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { authenticated, isLoading, login } = useAuth();

  useEffect(() => {
    // Deep-linking into a protected route while logged out sends the user
    // straight to Keycloak — no intermediate /auth/login stop ("one click").
    if (!isLoading && !authenticated) {
      login();
    }
  }, [isLoading, authenticated, login]);

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
            <h3 className="font-semibold text-lg tracking-tight bg-gradient-to-r from-indigo-200 to-slate-200 bg-clip-text text-transparent">Securing Session</h3>
            <p className="text-xs text-slate-400/80">Verifying authorization with Keycloak...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50/50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-64 transition-all duration-300">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
