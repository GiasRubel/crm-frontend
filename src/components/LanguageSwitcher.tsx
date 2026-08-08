"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { locales, localeNames } from "@/i18n/config";
import { setLocale } from "@/i18n/actions";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("nav");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: string) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <label
      className={cn(
        "flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      <Languages size={16} className="shrink-0" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full cursor-pointer bg-transparent text-sm font-medium text-slate-600 outline-none disabled:opacity-60 dark:text-slate-300"
      >
        {locales.map((l) => (
          <option key={l} value={l} className="text-slate-900">
            {localeNames[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
