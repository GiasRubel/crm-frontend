"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/keycloak-provider";
import {
  LayoutDashboard,
  HelpCircle,
  UsersRound,
  UserCheck,
  TrendingUp,
  Target,
  Activity,
  TicketCheck,
  Building2,
  BookUser,
  Zap,
  BookOpen,
  BarChart3,
  Shield,
  History,
  ListPlus,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type NavItem = { icon: React.ElementType; label: string; href: string };
type NavSection = { title: string; items: NavItem[] };

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const role = user?.role;
  const isCustomer = role === "Customer";
  const isAdmin = role === "Admin" || role === "Administrator";

  // Role-aware navigation.
  const sections: NavSection[] = isCustomer
    ? [
        {
          title: "Menu",
          items: [
            { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
            { icon: TicketCheck, label: "Support Tickets", href: "/tickets" },
            { icon: HelpCircle, label: "Help Center", href: "/faq" },
          ],
        },
      ]
    : [
        {
          title: "Main Menu",
          items: [
            { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
            { icon: BarChart3, label: "Reports", href: "/reports" },
          ],
        },
        {
          title: "CRM",
          items: [
            { icon: TrendingUp, label: "Leads", href: "/leads" },
            { icon: Target, label: "Opportunities", href: "/opportunities" },
            { icon: UserCheck, label: "Customers", href: "/customers" },
            { icon: Building2, label: "Accounts", href: "/accounts" },
            { icon: BookUser, label: "Contacts", href: "/contacts" },
            { icon: UsersRound, label: "Teams", href: "/teams" },
            { icon: Activity, label: "Activities", href: "/activities" },
          ],
        },
        {
          title: "Support",
          items: [
            { icon: TicketCheck, label: "Tickets", href: "/tickets" },
            { icon: BookOpen, label: "Knowledge Base", href: "/kb" },
          ],
        },
        // Administration — admins only.
        ...(isAdmin
          ? [
              {
                title: "Administration",
                items: [
                  { icon: Zap, label: "Automations", href: "/automations" },
                  { icon: ListPlus, label: "Custom Fields", href: "/custom-fields" },
                  { icon: Shield, label: "Users", href: "/users" },
                  { icon: History, label: "Audit Log", href: "/audit-log" },
                ],
              } satisfies NavSection,
            ]
          : []),
      ];

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") ?? false);

  return (
    <nav className="fixed left-0 top-0 z-10 hidden h-screen w-64 flex-col overflow-y-auto border-r border-slate-100 bg-white p-6 lg:flex dark:border-slate-800 dark:bg-slate-900">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="group mb-10 flex flex-shrink-0 cursor-pointer items-center gap-3 px-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xl font-bold text-white shadow-lg shadow-indigo-200 transition-transform group-hover:scale-110">
          C
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          CRM Pro
        </span>
      </Link>

      {/* Nav sections */}
      <div className="flex-1 space-y-6">
        {sections.map((section, i) => (
          <div key={section.title}>
            {i > 0 && <Separator className="mb-6 bg-slate-50 dark:bg-slate-800" />}
            <h3 className="mb-4 px-4 text-[11px] font-bold uppercase tracking-[2px] text-slate-400 dark:text-slate-500">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} className="block w-full">
                    <Button
                      variant={active ? "secondary" : "ghost"}
                      className={cn(
                        "h-11 w-full justify-start gap-3 rounded-xl px-4 transition-all duration-200",
                        active
                          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200"
                          : "text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                      )}
                    >
                      <item.icon
                        size={18}
                        className={cn(active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")}
                      />
                      <span className="font-medium">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-auto pt-6">
        <Button
          variant="ghost"
          className="h-11 w-full justify-start gap-3 rounded-xl px-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          onClick={logout}
        >
          <LogOut size={18} />
          <span className="font-medium">Logout</span>
        </Button>
      </div>
    </nav>
  );
}
