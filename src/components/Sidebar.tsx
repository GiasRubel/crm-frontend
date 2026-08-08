"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
  KeyRound,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { cn } from "@/lib/utils";

type NavItem = { icon: React.ElementType; label: string; href: string };
type NavSection = { title: string; items: NavItem[] };

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const t = useTranslations("nav");

  const role = user?.role;
  const isCustomer = role === "Customer";
  const isAdmin = role === "Admin" || role === "Administrator";

  // Role-aware navigation.
  const sections: NavSection[] = isCustomer
    ? [
        {
          title: t("sections.menu"),
          items: [
            { icon: LayoutDashboard, label: t("items.dashboard"), href: "/dashboard" },
            { icon: TicketCheck, label: t("items.supportTickets"), href: "/tickets" },
            { icon: HelpCircle, label: t("items.helpCenter"), href: "/faq" },
          ],
        },
      ]
    : [
        {
          title: t("sections.mainMenu"),
          items: [
            { icon: LayoutDashboard, label: t("items.dashboard"), href: "/dashboard" },
            { icon: BarChart3, label: t("items.reports"), href: "/reports" },
          ],
        },
        {
          title: t("sections.crm"),
          items: [
            { icon: TrendingUp, label: t("items.leads"), href: "/leads" },
            { icon: Target, label: t("items.opportunities"), href: "/opportunities" },
            { icon: UserCheck, label: t("items.customers"), href: "/customers" },
            { icon: Building2, label: t("items.accounts"), href: "/accounts" },
            { icon: BookUser, label: t("items.contacts"), href: "/contacts" },
            { icon: UsersRound, label: t("items.teams"), href: "/teams" },
            { icon: Activity, label: t("items.activities"), href: "/activities" },
          ],
        },
        {
          title: t("sections.support"),
          items: [
            { icon: TicketCheck, label: t("items.tickets"), href: "/tickets" },
            { icon: BookOpen, label: t("items.knowledgeBase"), href: "/kb" },
          ],
        },
        // Administration — admins only.
        ...(isAdmin
          ? [
              {
                title: t("sections.administration"),
                items: [
                  { icon: Zap, label: t("items.automations"), href: "/automations" },
                  { icon: ListPlus, label: t("items.customFields"), href: "/custom-fields" },
                  { icon: KeyRound, label: t("items.roles"), href: "/roles" },
                  { icon: Shield, label: t("items.users"), href: "/users" },
                  { icon: History, label: t("items.auditLog"), href: "/audit-log" },
                ],
              } satisfies NavSection,
            ]
          : []),
      ];

  const isActive = (href: string) =>
    pathname === href || (pathname?.startsWith(href + "/") ?? false);

  return (
    <nav className="fixed start-0 top-0 z-10 hidden h-screen w-64 flex-col overflow-y-auto border-e border-slate-100 bg-white p-6 lg:flex dark:border-slate-800 dark:bg-slate-900">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="group mb-10 flex flex-shrink-0 cursor-pointer items-center gap-3 px-2"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-xl font-bold text-white shadow-lg shadow-indigo-200 transition-transform group-hover:scale-110">
          C
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          {t("appName")}
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

      {/* Language + Logout */}
      <div className="mt-auto space-y-1 pt-6">
        <LanguageSwitcher />
        <Button
          variant="ghost"
          className="h-11 w-full justify-start gap-3 rounded-xl px-4 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          onClick={logout}
        >
          <LogOut size={18} />
          <span className="font-medium">{t("logout")}</span>
        </Button>
      </div>
    </nav>
  );
}
