"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod";
import {
  AlertCircle,
  Check,
  ListPlus,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/keycloak-provider";
import { useCustomFields } from "@/features/custom-fields/hooks/useCustomFields";
import {
  CHOICE_FIELD_TYPES,
  CUSTOM_FIELD_ENTITY_TYPES,
  CUSTOM_FIELD_TYPES,
  CustomFieldDefinition,
  CustomFieldEntityType,
  CustomFieldType,
  ENTITY_TYPE_LABELS,
  FIELD_TYPE_LABELS,
} from "@/features/custom-fields/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all disabled:bg-gray-50 disabled:dark:bg-slate-800/50 disabled:text-gray-500 disabled:dark:text-slate-400";

// ── Form schema ───────────────────────────────────────────────────────────────

const fieldFormSchema = z
  .object({
    entityType: z.enum(CUSTOM_FIELD_ENTITY_TYPES as [CustomFieldEntityType, ...CustomFieldEntityType[]]),
    key: z
      .string()
      .trim()
      .min(1, "Key is required")
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, "Lowercase letters, digits, underscore — must start with a letter"),
    label: z.string().trim().min(1, "Label is required").max(80),
    type: z.enum(CUSTOM_FIELD_TYPES as [CustomFieldType, ...CustomFieldType[]]),
    optionsText: z.string().max(1000).optional(),
    required: z.boolean(),
    helpText: z.string().max(300).optional(),
  })
  .refine(
    (v) =>
      !CHOICE_FIELD_TYPES.includes(v.type) ||
      (v.optionsText ?? "").split(",").map((o) => o.trim()).filter(Boolean).length > 0,
    { message: "At least one option is required for a dropdown field", path: ["optionsText"] },
  );

type FieldFormValues = z.infer<typeof fieldFormSchema>;

const emptyFormValues: FieldFormValues = {
  entityType: "lead",
  key: "",
  label: "",
  type: "text",
  optionsText: "",
  required: false,
  helpText: "",
};

function parseOptions(text?: string): string[] {
  return [...new Set((text ?? "").split(",").map((o) => o.trim()).filter(Boolean))];
}

export function CustomFieldsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const { listQuery, createMutation, updateMutation, deleteMutation } = useCustomFields();
  const definitions = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomFieldDefinition | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomFieldDefinition | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const form = useForm<FieldFormValues>({
    resolver: standardSchemaResolver(fieldFormSchema),
    defaultValues: emptyFormValues,
  });
  const fieldType = form.watch("type");
  const isChoiceType = CHOICE_FIELD_TYPES.includes(fieldType);

  const grouped = useMemo(() => {
    const map = new Map<CustomFieldEntityType, CustomFieldDefinition[]>();
    for (const entityType of CUSTOM_FIELD_ENTITY_TYPES) map.set(entityType, []);
    for (const def of definitions) map.get(def.entityType)?.push(def);
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [definitions]);

  const openCreate = () => {
    form.reset(emptyFormValues);
    setEditing(null);
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (def: CustomFieldDefinition) => {
    form.reset({
      entityType: def.entityType,
      key: def.key,
      label: def.label,
      type: def.type,
      optionsText: def.options.join(", "),
      required: def.required,
      helpText: def.helpText ?? "",
    });
    setEditing(def);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setFormOpen(false);
    setEditing(null);
  };

  const onSubmit = async (values: FieldFormValues) => {
    setFormError(null);
    const options = isChoiceType ? parseOptions(values.optionsText) : undefined;

    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          dto: {
            label: values.label,
            type: values.type,
            options,
            required: values.required,
            helpText: values.helpText?.trim() || undefined,
          },
        });
        setSuccessMsg(`Custom field "${values.label}" updated.`);
      } else {
        await createMutation.mutateAsync({
          entityType: values.entityType,
          key: values.key.trim(),
          label: values.label,
          type: values.type,
          options,
          required: values.required,
          helpText: values.helpText?.trim() || undefined,
        });
        setSuccessMsg(`Custom field "${values.label}" added.`);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save custom field");
    }
  };

  const toggleActive = async (def: CustomFieldDefinition) => {
    await updateMutation.mutateAsync({ id: def.id, dto: { isActive: !def.isActive } });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setSuccessMsg(`Custom field "${deleteTarget.label}" removed.`);
    setDeleteTarget(null);
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <ShieldAlert size={28} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
          <p className="font-semibold text-gray-700 dark:text-slate-200">Admin access required</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Custom field configuration is visible to Admins and Administrators only.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
            <ListPlus size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Custom Fields</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Add your own fields to leads, contacts, accounts, opportunities, customers, and tickets.
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#3646a0]">
          <Plus size={16} className="mr-1.5" />
          Add field
        </Button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 text-sm">
          <Check size={15} />
          {successMsg}
          <button className="ml-auto" onClick={() => setSuccessMsg(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {listQuery.isLoading ? (
        <div className="p-10 text-center text-gray-400 dark:text-slate-500">
          <Loader2 size={20} className="animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-6">
          {CUSTOM_FIELD_ENTITY_TYPES.map((entityType) => {
            const defs = grouped.get(entityType) ?? [];
            return (
              <Card key={entityType} className="py-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    {ENTITY_TYPE_LABELS[entityType]}
                  </h3>
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {defs.length} field{defs.length === 1 ? "" : "s"}
                  </span>
                </div>
                {defs.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-gray-400 dark:text-slate-500">
                    No custom fields defined yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                    {defs.map((def) => (
                      <li key={def.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                            {def.label}
                            {def.required && <span className="text-red-500 ml-1">*</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                            {def.key} · {FIELD_TYPE_LABELS[def.type]}
                            {def.options.length > 0 ? ` (${def.options.join(", ")})` : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "cursor-pointer font-semibold",
                            def.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                              : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                          )}
                          onClick={() => toggleActive(def)}
                        >
                          {def.isActive ? "active" : "inactive"}
                        </Badge>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(def)}>
                          <Pencil size={15} />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(def)}>
                          <Trash2 size={15} className="text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit custom field" : "Add custom field"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Existing stored values are preserved when you change label, type, or options."
                : "This field becomes available on every record's form immediately."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-sm">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Applies to
              </label>
              <select className={inputClasses} disabled={!!editing} {...form.register("entityType")}>
                {CUSTOM_FIELD_ENTITY_TYPES.map((entityType) => (
                  <option key={entityType} value={entityType}>
                    {ENTITY_TYPE_LABELS[entityType]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Label
              </label>
              <Input {...form.register("label")} placeholder="e.g. Renewal date" />
              {form.formState.errors.label && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.label.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Key
              </label>
              <Input
                {...form.register("key")}
                disabled={!!editing}
                placeholder="e.g. renewal_date"
                onChange={(e) =>
                  form.setValue("key", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
              />
              {form.formState.errors.key && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.key.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Field type
              </label>
              <select className={inputClasses} {...form.register("type")}>
                {CUSTOM_FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            {isChoiceType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Options (comma-separated)
                </label>
                <Input {...form.register("optionsText")} placeholder="e.g. Bronze, Silver, Gold" />
                {form.formState.errors.optionsText && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.optionsText.message}</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Help text (optional)
              </label>
              <Input {...form.register("helpText")} placeholder="Shown under the field on the form" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input type="checkbox" className="w-4 h-4 accent-[#3F51B5]" {...form.register("required")} />
              Required
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#3F51B5] hover:bg-[#3646a0]"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Add field"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove custom field?</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  &quot;{deleteTarget.label}&quot; will no longer appear on {ENTITY_TYPE_LABELS[deleteTarget.entityType].toLowerCase()} forms.
                  Values already stored on existing records are kept but become inaccessible.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
