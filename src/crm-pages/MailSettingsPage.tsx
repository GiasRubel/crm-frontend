"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import { AlertCircle, Check, Loader2, Mail, ShieldAlert } from "lucide-react";
import { useAuth } from "@/providers/keycloak-provider";
import { useMailSettings } from "@/features/mail-settings/hooks/useMailSettings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const settingsFormSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(255).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  secure: z.boolean(),
  user: z.string().trim().max(255).optional(),
  pass: z.string().max(500).optional(),
  fromAddress: z.string().trim().email().optional().or(z.literal("")),
  fromName: z.string().trim().max(255).optional(),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const emptyFormValues: SettingsFormValues = {
  enabled: false,
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromAddress: "",
  fromName: "",
};

export function MailSettingsPage() {
  const t = useTranslations("mailSettings");
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const { query, updateMutation, testMutation } = useMailSettings();
  const settings = query.data;

  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState(user?.email ?? "");
  const [testError, setTestError] = useState<string | null>(null);
  const [testSent, setTestSent] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: standardSchemaResolver(settingsFormSchema),
    defaultValues: emptyFormValues,
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      enabled: settings.enabled,
      host: settings.host ?? "",
      port: settings.port ?? 587,
      secure: settings.secure,
      user: settings.user ?? "",
      pass: "",
      fromAddress: settings.fromAddress ?? "",
      fromName: settings.fromName ?? "",
    });
  }, [settings, form]);

  const onSubmit = async (values: SettingsFormValues) => {
    setSaveError(null);
    setSavedMsg(null);
    try {
      await updateMutation.mutateAsync({
        enabled: values.enabled,
        host: values.host || undefined,
        port: values.port,
        secure: values.secure,
        user: values.user || undefined,
        pass: values.pass || undefined,
        fromAddress: values.fromAddress || undefined,
        fromName: values.fromName || undefined,
      });
      form.setValue("pass", "");
      setSavedMsg(t("saved"));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const sendTest = async () => {
    setTestError(null);
    setTestSent(null);
    try {
      await testMutation.mutateAsync(testEmail);
      setTestSent(t("testSent", { email: testEmail }));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : t("testFailed"));
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <ShieldAlert size={28} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
          <p className="font-semibold text-gray-700 dark:text-slate-200">{t("adminRequired")}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{t("adminRequiredDesc")}</p>
        </Card>
      </div>
    );
  }

  const enabled = form.watch("enabled");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
          <Mail size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>
      </div>

      {query.isLoading ? (
        <div className="p-10 text-center text-gray-400 dark:text-slate-500">
          <Loader2 size={20} className="animate-spin mx-auto" />
        </div>
      ) : (
        <Card className="p-5">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {saveError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-sm">
                <AlertCircle size={14} />
                {saveError}
              </div>
            )}
            {savedMsg && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-sm">
                <Check size={14} />
                {savedMsg}
              </div>
            )}

            <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="w-4 h-4 mt-0.5 accent-[#3F51B5]"
                {...form.register("enabled")}
              />
              <span>
                <span className="font-medium">{t("enableLabel")}</span>
                <span className="block text-xs text-gray-500 dark:text-slate-400">{t("enableDesc")}</span>
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("host")}
                </label>
                <Input {...form.register("host")} placeholder={t("hostPlaceholder")} disabled={!enabled} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("port")}
                </label>
                <Input type="number" {...form.register("port")} disabled={!enabled} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#3F51B5]"
                disabled={!enabled}
                {...form.register("secure")}
              />
              {t("secure")}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("user")}
                </label>
                <Input {...form.register("user")} placeholder={t("userPlaceholder")} disabled={!enabled} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("pass")}
                </label>
                <Input
                  type="password"
                  {...form.register("pass")}
                  placeholder={t("passPlaceholder")}
                  disabled={!enabled}
                />
                {settings?.hasPassword && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{t("passHintSaved")}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("fromAddress")}
                </label>
                <Input
                  {...form.register("fromAddress")}
                  placeholder={t("fromAddressPlaceholder")}
                  disabled={!enabled}
                />
                {form.formState.errors.fromAddress && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.fromAddress.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("fromName")}
                </label>
                <Input {...form.register("fromName")} placeholder={t("fromNamePlaceholder")} disabled={!enabled} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending} className="bg-[#3F51B5] hover:bg-[#3646a0]">
                {updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : t("save")}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-white">{t("testSection")}</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400">{t("testDesc")}</p>
        </div>
        {testError && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-sm">
            <AlertCircle size={14} />
            {testError}
          </div>
        )}
        {testSent && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-sm">
            <Check size={14} />
            {testSent}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder={t("testEmailPlaceholder")}
          />
          <Button
            type="button"
            variant="outline"
            onClick={sendTest}
            disabled={testMutation.isPending || !testEmail || !settings?.enabled}
          >
            {testMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : t("sendTest")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
