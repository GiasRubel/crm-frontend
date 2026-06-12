"use client";

import { useAuth } from "@/providers/keycloak-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ArrowRight, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const { register, authenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && authenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, authenticated, router]);

  if (isLoading || authenticated) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500/10 border-t-indigo-500" />
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl shadow-2xl p-8 transition-all duration-300">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create Account</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Start your free trial and experience premium customer relationship management.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={register}
          className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 px-5 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200"
        >
          <UserPlus className="h-5 w-5 opacity-90 group-hover:scale-110 transition-transform duration-200" />
          <span>Register with Keycloak</span>
          <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform duration-200" />
        </button>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/80"></div>
          <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase tracking-widest font-semibold">Already have an account?</span>
          <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/80"></div>
        </div>

        <a
          href="/auth/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-5 py-4.5 text-sm font-semibold text-slate-700 dark:text-slate-300 active:scale-[0.98] transition-all duration-200"
        >
          Sign In
        </a>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Enterprise-grade security and data privacy</span>
      </div>
    </div>
  );
}