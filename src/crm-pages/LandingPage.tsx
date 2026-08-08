"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/providers/keycloak-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Contact,
  Filter,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Small building blocks                                              */
/* ------------------------------------------------------------------ */

function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-lg font-black text-white shadow-lg shadow-indigo-500/30">
        C
      </div>
      <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        CRM Pro
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function Navbar() {
  const t = useTranslations("landing.nav");
  const { authenticated, isLoading, login, register, deploymentMode } = useAuth();
  const isStandalone = deploymentMode !== "saas";
  const NAV_LINKS = [
    { label: t("features"), href: "#features" },
    { label: t("product"), href: "#product" },
    { label: t("pricing"), href: "#pricing" },
    { label: t("customers"), href: "#customers" },
  ];
  const navLinks = isStandalone ? NAV_LINKS.filter((l) => l.label !== t("pricing")) : NAV_LINKS;
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/80"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" aria-label="CRM Pro home">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          ) : authenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              {t("goToDashboard")} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              {!isStandalone && (
                <button
                  type="button"
                  onClick={login}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
                >
                  {t("signIn")}
                </button>
              )}
              <button
                type="button"
                onClick={register}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-[0.98]"
              >
                {isStandalone ? t("signIn") : t("getStarted")}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200/70 bg-white/95 backdrop-blur-xl md:hidden dark:border-slate-800/70 dark:bg-slate-950/95">
          <div className="space-y-1 px-4 py-4">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {l.label}
              </a>
            ))}
            <div className={`grid gap-2 pt-2 ${isStandalone && !authenticated ? "grid-cols-1" : "grid-cols-2"}`}>
              {!(isStandalone && !authenticated) && (
                <button
                  type="button"
                  onClick={login}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  {t("signIn")}
                </button>
              )}
              {authenticated ? (
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {t("dashboard")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={register}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  {isStandalone ? t("signIn") : t("getStarted")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero() {
  const t = useTranslations("landing.hero");
  const { authenticated, isLoading, register, deploymentMode } = useAuth();
  const isStandalone = deploymentMode !== "saas";

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute right-[-5%] top-[20%] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12),transparent_60%)] blur-2xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,116,139,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,116,139,0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            {t("badge")}
          </div>

          <h1
            className="animate-rise mt-6 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-6xl dark:text-white"
            style={{ animationDelay: "60ms" }}
          >
            {t("titlePrefix")}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              {t("titleHighlight")}
            </span>
          </h1>

          <p
            className="animate-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300"
            style={{ animationDelay: "120ms" }}
          >
            {t("subtitle")}
          </p>

          <div
            className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            {isLoading ? (
              <div className="h-12 w-56 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            ) : authenticated ? (
              <Link
                href="/dashboard"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 active:scale-[0.98] sm:w-auto"
              >
                {t("openDashboard")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={register}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 active:scale-[0.98] sm:w-auto"
              >
                {isStandalone ? t("signIn") : t("startFree")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            )}
            <a
              href="#product"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t("seeInAction")}
            </a>
          </div>

          <p
            className="animate-rise mt-5 text-sm text-slate-500 dark:text-slate-400"
            style={{ animationDelay: "240ms" }}
          >
            {t("trialNote")}
          </p>
        </div>

        {/* Dashboard mockup */}
        <div
          className="animate-rise mx-auto mt-16 max-w-5xl"
          style={{ animationDelay: "300ms" }}
        >
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

/* A lightweight faux dashboard rendered purely with markup — no assets. */
function DashboardMockup() {
  const t = useTranslations("landing.mockup");
  const bars = [42, 68, 55, 80, 62, 95, 74];
  const stats = [
    { label: t("statNewLeads"), value: "1,284", trend: "+12.4%" },
    { label: t("statOpenDeals"), value: "$412k", trend: "+8.1%" },
    { label: t("statWinRate"), value: "34.7%", trend: "+3.2%" },
  ];

  return (
    <div className="animate-float rounded-2xl border border-slate-200/70 bg-white/80 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/40">
      <div className="overflow-hidden rounded-xl border border-slate-200/70 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-slate-200/70 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <div className="ml-4 hidden items-center gap-2 rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-400 sm:flex dark:bg-slate-800">
            {t("url")}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 p-4">
          {/* mini sidebar */}
          <div className="col-span-3 hidden flex-col gap-2 sm:flex">
            {[
              { icon: LayoutDashboard, active: true },
              { icon: Target },
              { icon: Filter },
              { icon: Contact },
              { icon: LifeBuoy },
              { icon: BarChart3 },
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${
                  item.active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span
                  className={`h-2 w-14 rounded ${
                    item.active ? "bg-white/40" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
              </div>
            ))}
          </div>

          {/* main */}
          <div className="col-span-12 flex flex-col gap-3 sm:col-span-9">
            <div className="grid grid-cols-3 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-200/70 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <p className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                    {s.label}
                  </p>
                  <p className="mt-1 text-base font-bold text-slate-900 sm:text-xl dark:text-white">
                    {s.value}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-500 sm:text-xs">
                    {s.trend}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200/70 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {t("revenueThisQuarter")}
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {t("onTrack")}
                </span>
              </div>
              <div className="flex h-28 items-end justify-between gap-2 sm:gap-3">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="animate-bar w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400"
                    style={{ height: `${h}%`, animationDelay: `${400 + i * 90}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Logo cloud                                                         */
/* ------------------------------------------------------------------ */

function LogoCloud() {
  const t = useTranslations("landing.logoCloud");
  const names = [
    "Northwind",
    "Acme Corp",
    "Globex",
    "Initech",
    "Umbrella",
    "Soylent",
    "Hooli",
    "Vandelay",
  ];
  const row = [...names, ...names];

  return (
    <section className="border-y border-slate-200/70 bg-slate-50/60 py-10 dark:border-slate-800/70 dark:bg-slate-900/30">
      <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
        {t("trustedBy")}
      </p>
      <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="animate-marquee flex w-max items-center gap-14 px-7">
          {row.map((n, i) => (
            <span
              key={i}
              className="whitespace-nowrap text-xl font-bold tracking-tight text-slate-400/80 dark:text-slate-600"
            >
              {n}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features                                                           */
/* ------------------------------------------------------------------ */

const FEATURE_ICONS = [Target, Filter, Contact, LifeBuoy, Bot, BarChart3];

function Features() {
  const t = useTranslations("landing.features");
  const items = t.raw("items") as { title: string; desc: string }[];
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {t("eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f, i) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-400">
                {(() => { const Icon = FEATURE_ICONS[i]; return <Icon className="h-6 w-6" />; })()}
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Product showcase (alternating)                                     */
/* ------------------------------------------------------------------ */

const SHOWCASE_ICONS = [Filter, Zap];

function Showcase() {
  const t = useTranslations("landing.showcase");
  const SHOWCASE = t.raw("items") as { eyebrow: string; title: string; desc: string; points: string[] }[];
  return (
    <section id="product" className="border-y border-slate-200/70 bg-slate-50/60 py-24 sm:py-32 dark:border-slate-800/70 dark:bg-slate-900/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-24 px-4 sm:px-6 lg:px-8">
        {SHOWCASE.map((s, i) => (
          <div
            key={s.title}
            className="grid items-center gap-12 lg:grid-cols-2"
          >
            <div className={i % 2 === 1 ? "lg:order-2" : ""}>
              <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                {(() => { const Icon = SHOWCASE_ICONS[i]; return <Icon className="h-4 w-4" />; })()}
                {s.eyebrow}
              </span>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {s.title}
              </h3>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                {s.desc}
              </p>
              <ul className="mt-6 space-y-3">
                {s.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className={i % 2 === 1 ? "lg:order-1" : ""}>
              <div className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900">
                <div className="pointer-events-none absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 blur-xl" />
                {i === 0 ? <PipelinePreview /> : <AutomationPreview />}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PipelinePreview() {
  const t = useTranslations("landing.showcase.pipelinePreview");
  const cols = [
    { name: t("new"), count: 8, tint: "bg-slate-400" },
    { name: t("qualified"), count: 5, tint: "bg-indigo-500" },
    { name: t("proposal"), count: 3, tint: "bg-violet-500" },
    { name: t("won"), count: 6, tint: "bg-emerald-500" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {cols.map((c) => (
        <div key={c.name} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
          <div className="mb-2 flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${c.tint}`} />
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
              {c.name}
            </span>
          </div>
          <div className="space-y-1.5">
            {Array.from({ length: Math.min(c.count, 3) }).map((_, i) => (
              <div
                key={i}
                className="rounded-md border border-slate-200/70 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="h-1.5 w-full rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-1 h-1.5 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AutomationPreview() {
  const t = useTranslations("landing.showcase.automationPreview");
  const steps = [
    { icon: Target, label: t("step1"), tint: "text-indigo-500" },
    { icon: Users, label: t("step2"), tint: "text-violet-500" },
    { icon: Zap, label: t("step3"), tint: "text-amber-500" },
    { icon: Check, label: t("step4"), tint: "text-emerald-500" },
  ];
  return (
    <div className="space-y-2">
      {steps.map((s) => (
        <div key={s.label} className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-slate-50 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <s.icon className={`h-4 w-4 ${s.tint}`} />
          </div>
          <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats                                                              */
/* ------------------------------------------------------------------ */

function Stats() {
  const t = useTranslations("landing.stats");
  const stats = t.raw("items") as { value: string; label: string }[];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 rounded-3xl border border-slate-200/80 bg-white p-10 shadow-sm sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-900">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Testimonials                                                       */
/* ------------------------------------------------------------------ */

function Testimonials() {
  const t = useTranslations("landing.testimonials");
  const items = t.raw("items") as { quote: string; name: string; role: string }[];
  return (
    <section id="customers" className="border-t border-slate-200/70 bg-slate-50/60 py-24 sm:py-32 dark:border-slate-800/70 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            {t("subtitle")}
          </p>
        </div>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {items.map((item) => (
            <figure
              key={item.name}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="flex-1 text-slate-700 dark:text-slate-200">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                  {item.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.role}
                  </p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                            */
/* ------------------------------------------------------------------ */

const PLAN_HIGHLIGHTED = [false, true, false];

function Pricing() {
  const t = useTranslations("landing.pricing");
  const { register, deploymentMode } = useAuth();
  if (deploymentMode !== "saas") return null;
  const PLANS = (
    t.raw("plans") as { name: string; price: string; period: string; desc: string; features: string[]; cta: string }[]
  ).map((p, i) => ({ ...p, highlighted: PLAN_HIGHLIGHTED[i] }));
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {t("eyebrow")}
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {t("title")}
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            {t("subtitle")}
          </p>
        </div>

        <div className="mt-16 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((p, i) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-3xl border p-8 ${
                p.highlighted
                  ? "border-indigo-500 bg-white shadow-2xl shadow-indigo-500/20 lg:-mt-4 lg:mb-4 dark:bg-slate-900"
                  : "border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                  {t("mostPopular")}
                </span>
              )}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {p.name}
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {p.desc}
              </p>
              <div className="mt-6 flex items-end gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {p.price}
                </span>
                <span className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                  {p.period}
                </span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                    <Check className="mt-0.5 h-4 w-4 flex-none text-indigo-500" />
                    {f}
                  </li>
                ))}
              </ul>
              {i === 2 ? (
                <a
                  href="mailto:sales@crmpro.com?subject=CRM%20Pro%20Enterprise%20inquiry"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {p.cta}
                  <ChevronRight className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={register}
                  className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98] ${
                    p.highlighted
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {p.cta}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Final CTA                                                          */
/* ------------------------------------------------------------------ */

function FinalCTA() {
  const t = useTranslations("landing.finalCta");
  const { authenticated, register, deploymentMode } = useAuth();
  const isStandalone = deploymentMode !== "saas";
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-8 py-16 text-center shadow-2xl shadow-indigo-500/30 sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <h2 className="relative text-3xl font-black tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-indigo-100">
            {t("subtitle")}
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 active:scale-[0.98] sm:w-auto"
              >
                {t("openDashboard")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={register}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 active:scale-[0.98] sm:w-auto"
              >
                {isStandalone ? t("signIn") : t("getStartedFree")}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <a
              href={isStandalone ? "#features" : "#pricing"}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98] sm:w-auto"
            >
              {isStandalone ? t("seeFeatures") : t("viewPricing")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                             */
/* ------------------------------------------------------------------ */

function Footer() {
  const t = useTranslations("landing.footer");
  const cols = t.raw("columns") as { title: string; links: string[] }[];
  return (
    <footer className="border-t border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {t("tagline")}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t("security")}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200/70 pt-8 sm:flex-row dark:border-slate-800/70">
          <p className="text-sm text-slate-400">
            {t("rights", { year: new Date().getFullYear() })}
          </p>
          <p className="text-sm text-slate-400">{t("madeFor")}</p>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <Navbar />
      <main>
        <Hero />
        <LogoCloud />
        <Features />
        <Showcase />
        <Stats />
        <Testimonials />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
