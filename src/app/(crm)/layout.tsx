"use client";

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
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
