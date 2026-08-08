"use client";

import { apiClient } from "@/lib/api-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

const OTP_LENGTH = 6;

type Step = "email" | "verify";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth.forgotPassword");
  const [step, setStep] = useState<Step>("email");

  // Step 1 state
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Step 2 state
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Shared state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // ── Step 1 ────────────────────────────────────────────────────────────────

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    try {
      await apiClient.post("/auth/password/forgot", { email });
      setStep("verify");
      setCooldown(60);
      // Focus first OTP digit after render
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.sendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsSending(true);
    setError(null);
    try {
      await apiClient.post("/auth/password/forgot", { email });
      setCooldown(60);
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.resendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  // ── Step 2 ────────────────────────────────────────────────────────────────

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    setError(null);
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < OTP_LENGTH) { setError(t("errors.allDigits")); return; }
    if (newPassword.length < 8) { setError(t("errors.minLength")); return; }
    if (newPassword !== confirmPassword) { setError(t("errors.noMatch")); return; }

    setIsResetting(true);
    setError(null);
    try {
      await apiClient.post("/auth/password/reset", { email, code, newPassword });
      setSuccess(true);
      setTimeout(() => router.replace("/auth/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("errors.resetFailed"));
      setDigits(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } finally {
      setIsResetting(false);
    }
  };

  const isOtpComplete = digits.every((d) => d !== "");
  const isFormReady = isOtpComplete && newPassword.length >= 8 && confirmPassword.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-3xl shadow-2xl p-8 transition-all duration-300">

      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 mb-4">
          {step === "email" ? (
            <KeyRound className="h-7 w-7 text-indigo-500" />
          ) : (
            <ShieldCheck className="h-7 w-7 text-indigo-500" />
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {step === "email" ? t("forgotTitle") : t("resetTitle")}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          {step === "email"
            ? t("forgotSubtitle")
            : (
              <>
                {t("resetSubtitlePrefix")}{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>
                {" "}{t("resetSubtitleSuffix")}
              </>
            )}
        </p>
      </div>

      {/* ── Step 1: Email ────────────────────────────────────────────────── */}
      {step === "email" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("emailLabel")}
            </label>
            <div className="relative">
              <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder={t("emailPlaceholder")}
                className="w-full ps-10 pe-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-150"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            id="forgot-send-btn"
            type="submit"
            disabled={isSending || !email}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed px-5 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
          >
            {isSending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <>
                <span>{t("sendCode")}</span>
                <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>
        </form>
      )}

      {/* ── Step 2: OTP + New Password ───────────────────────────────────── */}
      {step === "verify" && !success && (
        <form onSubmit={handleReset} className="space-y-5">

          {/* OTP Digits */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              {t("verificationCode")}
            </label>
            <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  id={`otp-digit-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`
                    w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none
                    bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white
                    transition-all duration-150
                    ${digit ? "border-indigo-500 dark:border-indigo-400 shadow-sm shadow-indigo-500/20" : "border-slate-200 dark:border-slate-700"}
                    ${error ? "border-red-400 dark:border-red-500" : ""}
                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                  `}
                />
              ))}
            </div>
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("newPassword")}
            </label>
            <div className="relative">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                placeholder={t("newPasswordPlaceholder")}
                className="w-full pe-11 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all duration-150"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              {t("confirmPassword")}
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
              placeholder={t("confirmPasswordPlaceholder")}
              className={`w-full px-4 py-3 rounded-xl border-2 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150 ${
                confirmPassword && newPassword !== confirmPassword
                  ? "border-red-400 dark:border-red-500"
                  : "border-slate-200 dark:border-slate-700 focus:border-indigo-500"
              }`}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{t("passwordsNoMatch")}</p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            id="reset-password-btn"
            type="submit"
            disabled={!isFormReady || isResetting}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed px-5 py-4 text-sm font-semibold text-white shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200"
          >
            {isResetting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <>
                <span>{t("resetPassword")}</span>
                <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform duration-200" />
              </>
            )}
          </button>

          {/* Resend + Back */}
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 pt-1">
            <button
              type="button"
              onClick={() => { setStep("email"); setDigits(Array(OTP_LENGTH).fill("")); setError(null); }}
              className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("changeEmail")}</span>
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isSending || cooldown > 0}
              className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSending ? "animate-spin" : ""}`} />
              {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendCode")}
            </button>
          </div>
        </form>
      )}

      {/* ── Success state ─────────────────────────────────────────────────── */}
      {success && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">{t("passwordUpdated")}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t("redirecting")}</p>
          </div>
        </div>
      )}

      {/* Back to login */}
      {!success && (
        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            {t("backToSignIn")}
          </Link>
        </div>
      )}
    </div>
  );
}
