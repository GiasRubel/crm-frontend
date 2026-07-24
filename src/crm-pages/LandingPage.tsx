"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/keycloak-provider";
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

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Product", href: "#product" },
  { label: "Pricing", href: "#pricing" },
  { label: "Customers", href: "#customers" },
];

/* ------------------------------------------------------------------ */
/*  Navbar                                                             */
/* ------------------------------------------------------------------ */

function Navbar() {
  const { authenticated, login, register } = useAuth();
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
          {NAV_LINKS.map((l) => (
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
          {authenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Go to dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={login}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-200 dark:hover:text-white"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={register}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 active:scale-[0.98]"
              >
                Get started
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200/70 bg-white/95 backdrop-blur-xl md:hidden dark:border-slate-800/70 dark:bg-slate-950/95">
          <div className="space-y-1 px-4 py-4">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {l.label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={login}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                Sign in
              </button>
              {authenticated ? (
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={register}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Get started
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
  const { authenticated, register } = useAuth();

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
            The all-in-one revenue platform
          </div>

          <h1
            className="animate-rise mt-6 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-6xl dark:text-white"
            style={{ animationDelay: "60ms" }}
          >
            Close more deals with a CRM your{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-500 bg-clip-text text-transparent">
              whole team loves
            </span>
          </h1>

          <p
            className="animate-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300"
            style={{ animationDelay: "120ms" }}
          >
            Capture leads, manage your pipeline, support customers and automate
            the busywork — all in one place. CRM Pro gives sales, marketing and
            support a single source of truth.
          </p>

          <div
            className="animate-rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            {authenticated ? (
              <Link
                href="/dashboard"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 active:scale-[0.98] sm:w-auto"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={register}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:shadow-indigo-500/50 active:scale-[0.98] sm:w-auto"
              >
                Start free — it&apos;s on us
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            )}
            <a
              href="#product"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              See it in action
            </a>
          </div>

          <p
            className="animate-rise mt-5 text-sm text-slate-500 dark:text-slate-400"
            style={{ animationDelay: "240ms" }}
          >
            Free 14-day trial · No credit card required · Cancel anytime
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
  const bars = [42, 68, 55, 80, 62, 95, 74];
  const stats = [
    { label: "New leads", value: "1,284", trend: "+12.4%" },
    { label: "Open deals", value: "$412k", trend: "+8.1%" },
    { label: "Win rate", value: "34.7%", trend: "+3.2%" },
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
            app.crmpro.com/dashboard
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
                  Revenue this quarter
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  On track
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
        Trusted by fast-growing teams worldwide
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

const FEATURES = [
  {
    icon: Target,
    title: "Lead capture & scoring",
    desc: "Turn website forms into qualified pipeline. Auto-score, route and never let a hot lead go cold.",
  },
  {
    icon: Filter,
    title: "Visual sales pipeline",
    desc: "A drag-and-drop Kanban board for every stage. Forecast revenue and spot stalled deals at a glance.",
  },
  {
    icon: Contact,
    title: "Contacts & accounts",
    desc: "A 360° view of every company and person — interactions, preferences and history in one timeline.",
  },
  {
    icon: LifeBuoy,
    title: "Helpdesk & tickets",
    desc: "Built-in support with a customer portal and knowledge base, so service lives right next to sales.",
  },
  {
    icon: Bot,
    title: "Workflow automation",
    desc: "Rules that assign owners, send follow-ups and enforce SLAs — the busywork runs itself.",
  },
  {
    icon: BarChart3,
    title: "Reports & analytics",
    desc: "Live dashboards and a custom report builder across every object. Answers, not spreadsheets.",
  },
];

function Features() {
  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Everything you need
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            One platform for the entire customer journey
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Stop stitching together five different tools. CRM Pro covers
            marketing, sales and support end to end.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
            >
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 text-indigo-600 ring-1 ring-inset ring-indigo-500/20 dark:text-indigo-400">
                <f.icon className="h-6 w-6" />
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

const SHOWCASE = [
  {
    eyebrow: "Sales pipeline",
    title: "See every deal, move it forward",
    desc: "Drag deals between stages, get a live forecast and let automations nudge reps before a deal goes quiet.",
    points: [
      "Drag-and-drop Kanban board",
      "Weighted revenue forecasting",
      "Win/loss analysis built in",
    ],
    icon: Filter,
  },
  {
    eyebrow: "Automation",
    title: "Let the busywork run itself",
    desc: "Trigger-based rules assign owners, schedule tasks and send the right message at the right moment — no code required.",
    points: [
      "No-code rule builder",
      "SLA timers & escalations",
      "Auto-routing by team & territory",
    ],
    icon: Zap,
  },
];

function Showcase() {
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
                <s.icon className="h-4 w-4" />
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
  const cols = [
    { name: "New", count: 8, tint: "bg-slate-400" },
    { name: "Qualified", count: 5, tint: "bg-indigo-500" },
    { name: "Proposal", count: 3, tint: "bg-violet-500" },
    { name: "Won", count: 6, tint: "bg-emerald-500" },
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
  const steps = [
    { icon: Target, label: "New lead captured", tint: "text-indigo-500" },
    { icon: Users, label: "Auto-assign to rep", tint: "text-violet-500" },
    { icon: Zap, label: "Send welcome email", tint: "text-amber-500" },
    { icon: Check, label: "Create follow-up task", tint: "text-emerald-500" },
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
  const stats = [
    { value: "37%", label: "more deals closed" },
    { value: "2.4×", label: "faster follow-up" },
    { value: "12k+", label: "teams onboarded" },
    { value: "99.9%", label: "uptime SLA" },
  ];
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

const TESTIMONIALS = [
  {
    quote:
      "We replaced three tools with CRM Pro. Our reps finally have one place to work, and pipeline visibility has never been clearer.",
    name: "Sarah Chen",
    role: "VP of Sales, Northwind",
  },
  {
    quote:
      "The automation engine alone pays for itself. Follow-ups that used to slip through the cracks now happen automatically.",
    name: "Marcus Reyes",
    role: "RevOps Lead, Globex",
  },
  {
    quote:
      "Support and sales sharing the same customer record changed everything. Our CSAT is up and churn is down.",
    name: "Amara Okafor",
    role: "Head of CX, Initech",
  },
];

function Testimonials() {
  return (
    <section id="customers" className="border-t border-slate-200/70 bg-slate-50/60 py-24 sm:py-32 dark:border-slate-800/70 dark:bg-slate-900/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Loved by revenue teams
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Don&apos;t take our word for it — here&apos;s what customers say.
          </p>
        </div>
        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-4 flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="flex-1 text-slate-700 dark:text-slate-200">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.role}
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

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/user/mo",
    desc: "For small teams getting organized.",
    features: [
      "Up to 3 users",
      "Contacts & lead capture",
      "Single pipeline",
      "Email support",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$29",
    period: "/user/mo",
    desc: "For scaling sales & support teams.",
    features: [
      "Unlimited users",
      "Multiple pipelines & teams",
      "Workflow automation",
      "Helpdesk & knowledge base",
      "Advanced reports",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For organizations with advanced needs.",
    features: [
      "SSO & advanced security",
      "Custom roles & territories",
      "Dedicated success manager",
      "API & custom integrations",
      "99.9% uptime SLA",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

function Pricing() {
  const { register } = useAuth();
  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Pricing
          </span>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Simple, transparent plans
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            Start free and upgrade as you grow. No hidden fees.
          </p>
        </div>

        <div className="mt-16 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
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
                  Most popular
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
              {p.name === "Enterprise" ? (
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
  const { authenticated, register } = useAuth();
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 px-8 py-16 text-center shadow-2xl shadow-indigo-500/30 sm:px-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
          <h2 className="relative text-3xl font-black tracking-tight text-white sm:text-4xl">
            Ready to grow faster?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-lg text-indigo-100">
            Join thousands of teams running their revenue engine on CRM Pro.
            Get started in minutes.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {authenticated ? (
              <Link
                href="/dashboard"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 active:scale-[0.98] sm:w-auto"
              >
                Open dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={register}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-base font-semibold text-indigo-700 shadow-lg transition-all hover:bg-indigo-50 active:scale-[0.98] sm:w-auto"
              >
                Get started free
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            <a
              href="#pricing"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98] sm:w-auto"
            >
              View pricing
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
  const cols = [
    {
      title: "Product",
      links: ["Features", "Pricing", "Integrations", "Changelog"],
    },
    {
      title: "Company",
      links: ["About", "Careers", "Blog", "Contact"],
    },
    {
      title: "Resources",
      links: ["Documentation", "Help center", "API", "Status"],
    },
    {
      title: "Legal",
      links: ["Privacy", "Terms", "Security", "GDPR"],
    },
  ];
  return (
    <footer className="border-t border-slate-200/70 bg-white dark:border-slate-800/70 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              The all-in-one CRM for sales, marketing and support teams.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Enterprise-grade security
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
            © {new Date().getFullYear()} CRM Pro. All rights reserved.
          </p>
          <p className="text-sm text-slate-400">Made for revenue teams.</p>
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
