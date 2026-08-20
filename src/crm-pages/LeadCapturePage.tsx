"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { leadApi } from "@/features/leads/services/leadApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ORGANIZATION_SLUG } from "@/lib/organization";

// Mirrors the backend CaptureLeadDto validation (POST /leads/capture)
const captureFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.email("Enter a valid email address").max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s().-]{6,}$/, "Enter a valid phone number")
    .max(30)
    .optional()
    .or(z.literal("")),
  company: z.string().max(150).optional(),
  region: z.string().max(100).optional(),
  message: z.string().max(2000).optional(),
  // Honeypot — hidden from humans; bots that fill it are dropped server-side
  website: z.string().max(200).optional(),
});

type CaptureFormValues = z.infer<typeof captureFormSchema>;

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 dark:disabled:bg-slate-800/50 disabled:text-gray-500 dark:disabled:text-slate-400";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 dark:text-red-400 mt-1">{message}</p>;
}

/**
 * Public "Contact Sales" form — no sign-in required. Posts to the
 * unauthenticated POST /leads/capture endpoint; submissions appear on the
 * Leads page (source: web form) and are auto-routed by region.
 */
export function LeadCapturePage() {
  const t = useTranslations("leadCapture");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<CaptureFormValues>({
    resolver: standardSchemaResolver(captureFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      region: "",
      message: "",
      website: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: CaptureFormValues) => {
    setSubmitError(null);
    try {
      await leadApi.capture({
        organizationSlug: ORGANIZATION_SLUG,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone?.trim() || undefined,
        company: values.company?.trim() || undefined,
        region: values.region?.trim() || undefined,
        message: values.message?.trim() || undefined,
        source: "web_form",
        website: values.website || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : t("genericError"),
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] dark:bg-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-md">
        <CardContent className="p-8">
          {submitted ? (
            <div className="flex flex-col items-center text-center gap-3 py-8">
              <CheckCircle2 size={48} className="text-emerald-500" />
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">{t("thanks")}</h1>
              <p className="text-sm text-gray-500 dark:text-slate-400 max-w-sm">
                {t("received")}
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => {
                  form.reset();
                  setSubmitted(false);
                }}
              >
                {t("submitAnother")}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {t("subtitle")}
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {submitError && (
                  <div className="bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 rounded-lg p-3 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    {submitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("firstName")}
                    </label>
                    <Input disabled={isSubmitting} {...form.register("firstName")} />
                    <FieldError message={form.formState.errors.firstName?.message} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("lastName")}
                    </label>
                    <Input disabled={isSubmitting} {...form.register("lastName")} />
                    <FieldError message={form.formState.errors.lastName?.message} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("workEmail")}
                  </label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    disabled={isSubmitting}
                    {...form.register("email")}
                  />
                  <FieldError message={form.formState.errors.email?.message} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("phone")}
                    </label>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 890"
                      disabled={isSubmitting}
                      {...form.register("phone")}
                    />
                    <FieldError message={form.formState.errors.phone?.message} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                      {t("company")}
                    </label>
                    <Input placeholder="Acme Corp" disabled={isSubmitting} {...form.register("company")} />
                    <FieldError message={form.formState.errors.company?.message} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("region")}
                  </label>
                  <Input
                    placeholder={t("regionPlaceholder")}
                    disabled={isSubmitting}
                    {...form.register("region")}
                  />
                  <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
                    {t("regionHint")}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t("howCanWeHelp")}
                  </label>
                  <textarea
                    rows={3}
                    disabled={isSubmitting}
                    placeholder={t("messagePlaceholder")}
                    className={cn(inputClasses, "resize-none")}
                    {...form.register("message")}
                  />
                  <FieldError message={form.formState.errors.message?.message} />
                </div>

                {/* Honeypot: visually hidden, must stay empty */}
                <div className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden" aria-hidden="true">
                  <label>
                    {t("website")}
                    <input tabIndex={-1} autoComplete="off" {...form.register("website")} />
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#3F51B5] hover:bg-[#303F9F] text-white gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {t("sendEnquiry")}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
