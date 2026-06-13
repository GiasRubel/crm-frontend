"use client";

import { useAuth } from "@/providers/keycloak-provider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, ArrowRight, ShieldCheck } from "lucide-react";


// Official brand SVG icons (inline — no external library needed)
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073C24 5.41 18.627 0 12 0S0 5.41 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
    </svg>
  );
}

export default function LoginPage() {
  const { login, loginWithProvider, authenticated, isLoading } = useAuth();
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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Securely sign in to manage your leads, customers, and operations.
        </p>
      </div>

      <div className="space-y-3">
        {/* Primary SSO button */}
        <button
          id="login-keycloak-btn"
          onClick={login}
          className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
        >
          <LogIn className="h-5 w-5 opacity-90 group-hover:scale-110 transition-transform duration-200" />
          <span>Sign In with Keycloak</span>
          <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform duration-200" />
        </button>

        {/* Forgot password link */}
        <div className="text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/80" />
          <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase tracking-widest font-semibold">
            or continue with
          </span>
          <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/80" />
        </div>

        {/* Social buttons row */}
        <div className="grid grid-cols-2 gap-3">
          <button
            id="login-google-btn"
            onClick={() => loginWithProvider("google")}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
          >
            <GoogleIcon />
            <span>Google</span>
          </button>

          <button
            id="login-facebook-btn"
            onClick={() => loginWithProvider("facebook")}
            className="flex items-center justify-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
          >
            <FacebookIcon />
            <span>Facebook</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/80" />
          <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase tracking-widest font-semibold">
            New to CRM Pro?
          </span>
          <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/80" />
        </div>

        <a
          href="/auth/register"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300 active:scale-[0.98] transition-all duration-200"
        >
          Create an Account
        </a>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <span>Enterprise-grade Single Sign-On enabled</span>
      </div>
    </div>
  );
}