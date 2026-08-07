"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { useCustomFieldDefinitions } from "../hooks/useCustomFields";
import {
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldValues,
} from "../types";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all";

function FieldInput({
  definition,
  value,
  onChange,
}: {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  switch (definition.type) {
    case "textarea":
      return (
        <textarea
          className={cn(inputClasses, "min-h-[80px] resize-y")}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          type="number"
          className={inputClasses}
          value={value === null || value === undefined ? "" : (value as number)}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
        />
      );
    case "date":
      return (
        <input
          type="date"
          className={inputClasses}
          value={value ? String(value).slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="w-4 h-4 accent-[#3F51B5]"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          {value ? "Yes" : "No"}
        </label>
      );
    case "select":
      return (
        <select
          className={inputClasses}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">— Select —</option>
          {definition.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (opt: string) => {
        onChange(
          selected.includes(opt)
            ? selected.filter((v) => v !== opt)
            : [...selected, opt],
        );
      };
      return (
        <div className="flex flex-wrap gap-3">
          {definition.options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-slate-300"
            >
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#3F51B5]"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case "email":
      return (
        <input
          type="email"
          className={inputClasses}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "url":
      return (
        <input
          type="url"
          className={inputClasses}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    default:
      return (
        <input
          type="text"
          className={inputClasses}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/**
 * Dynamic form section rendering one input per active custom field
 * definition for `entityType`. Renders nothing while loading or when the
 * org has no custom fields defined for this entity — safe to always embed.
 */
export function CustomFieldsSection({
  entityType,
  values,
  onChange,
}: {
  entityType: CustomFieldEntityType;
  values: CustomFieldValues;
  onChange: (values: CustomFieldValues) => void;
}) {
  const { data: definitions, isLoading } = useCustomFieldDefinitions(entityType);

  if (isLoading) {
    return <Loader2 size={14} className="animate-spin text-gray-400 dark:text-slate-500" />;
  }
  if (!definitions || definitions.length === 0) return null;

  const setValue = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <div className="space-y-4 border-t border-gray-100 dark:border-slate-800 pt-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
        Custom fields
      </h4>
      {definitions.map((def) => (
        <div key={def.key}>
          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
            {def.label}
            {def.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          <FieldInput
            definition={def}
            value={values[def.key]}
            onChange={(value) => setValue(def.key, value)}
          />
          {def.helpText && (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{def.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}
