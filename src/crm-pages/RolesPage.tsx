"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Check,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/providers/keycloak-provider";
import { useCustomFields } from "@/features/custom-fields/hooks/useCustomFields";
import { useCustomRoles } from "@/features/roles/hooks/useRoles";
import {
  ACTION_LABELS,
  CustomRole,
  EntityPermission,
  ENTITY_TYPE_LABELS,
  FieldRestriction,
  PERMISSION_ACTIONS,
  PERMISSION_ENTITY_TYPES,
  PermissionAction,
  PermissionEntityType,
  PermissionScope,
  SCOPE_LABELS,
} from "@/features/roles/types";
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
import { ApiError } from "@/lib/api-client";

const inputClasses =
  "w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#3F51B5]/20 focus:border-[#3F51B5] transition-all";

type PermissionsState = Record<
  PermissionEntityType,
  { actions: Set<PermissionAction>; scope: PermissionScope }
>;
type FieldRestrictionsState = Record<
  string,
  { hidden: boolean; readonly: boolean }
>;

function emptyPermissions(): PermissionsState {
  return Object.fromEntries(
    PERMISSION_ENTITY_TYPES.map((entityType) => [
      entityType,
      { actions: new Set<PermissionAction>(), scope: "own" as PermissionScope },
    ]),
  ) as PermissionsState;
}

function fieldKey(entityType: PermissionEntityType, key: string): string {
  return `${entityType}:${key}`;
}

function permissionsFromRole(role: CustomRole): PermissionsState {
  const state = emptyPermissions();
  for (const p of role.permissions) {
    state[p.entityType] = { actions: new Set(p.actions), scope: p.scope };
  }
  return state;
}

function fieldRestrictionsFromRole(role: CustomRole): FieldRestrictionsState {
  const state: FieldRestrictionsState = {};
  for (const f of role.fieldRestrictions) {
    state[fieldKey(f.entityType, f.fieldKey)] = {
      hidden: f.hidden,
      readonly: f.readonly,
    };
  }
  return state;
}

function toPermissionsDto(state: PermissionsState): EntityPermission[] {
  return PERMISSION_ENTITY_TYPES.filter(
    (entityType) => state[entityType].actions.size > 0,
  ).map((entityType) => ({
    entityType,
    actions: [...state[entityType].actions],
    scope: state[entityType].scope,
  }));
}

function toFieldRestrictionsDto(
  state: FieldRestrictionsState,
): FieldRestriction[] {
  return Object.entries(state)
    .filter(([, v]) => v.hidden || v.readonly)
    .map(([key, v]) => {
      const [entityType, fieldKeyPart] = key.split(":") as [
        PermissionEntityType,
        string,
      ];
      return { entityType, fieldKey: fieldKeyPart, ...v };
    });
}

export function RolesPage() {
  const { user } = useAuth();
  const t = useTranslations("roles");
  const tc = useTranslations("common");
  const isAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const { listQuery, createMutation, updateMutation, deleteMutation } =
    useCustomRoles();
  const { listQuery: customFieldsQuery } = useCustomFields();
  const customFields = customFieldsQuery.data;
  const roles = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const fieldsByEntity = useMemo(() => {
    const map = new Map<PermissionEntityType, { key: string; label: string }[]>();
    for (const entityType of PERMISSION_ENTITY_TYPES) map.set(entityType, []);
    for (const def of customFields ?? []) {
      map.get(def.entityType as PermissionEntityType)?.push({
        key: def.key,
        label: def.label,
      });
    }
    return map;
  }, [customFields]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionsState>(
    emptyPermissions(),
  );
  const [fieldRestrictions, setFieldRestrictions] =
    useState<FieldRestrictionsState>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setPermissions(emptyPermissions());
    setFieldRestrictions({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (role: CustomRole) => {
    setEditing(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setPermissions(permissionsFromRole(role));
    setFieldRestrictions(fieldRestrictionsFromRole(role));
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setFormOpen(false);
    setEditing(null);
  };

  const toggleAction = (
    entityType: PermissionEntityType,
    action: PermissionAction,
  ) => {
    setPermissions((prev) => {
      const actions = new Set(prev[entityType].actions);
      if (actions.has(action)) actions.delete(action);
      else actions.add(action);
      return { ...prev, [entityType]: { ...prev[entityType], actions } };
    });
  };

  const setScope = (entityType: PermissionEntityType, scope: PermissionScope) => {
    setPermissions((prev) => ({
      ...prev,
      [entityType]: { ...prev[entityType], scope },
    }));
  };

  const toggleFieldFlag = (
    entityType: PermissionEntityType,
    key: string,
    flag: "hidden" | "readonly",
  ) => {
    const mapKey = fieldKey(entityType, key);
    setFieldRestrictions((prev) => {
      const current = prev[mapKey] ?? { hidden: false, readonly: false };
      return { ...prev, [mapKey]: { ...current, [flag]: !current[flag] } };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const dto = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: toPermissionsDto(permissions),
      fieldRestrictions: toFieldRestrictionsDto(fieldRestrictions),
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, dto });
        setSuccessMsg(t("toasts.updated", { name: dto.name }));
      } else {
        await createMutation.mutateAsync(dto);
        setSuccessMsg(t("toasts.created", { name: dto.name }));
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("toasts.saveFailed"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setSuccessMsg(t("toasts.removed", { name: deleteTarget.name }));
      setDeleteTarget(null);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("toasts.deleteFailed"));
      setDeleteTarget(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-10 text-center">
          <ShieldAlert size={28} className="mx-auto mb-3 text-gray-400 dark:text-slate-500" />
          <p className="font-semibold text-gray-700 dark:text-slate-200">{t("adminRequired")}</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {t("adminRequiredDesc")}
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
            <KeyRound size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("title")}</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-[#3F51B5] hover:bg-[#3646a0]">
          <Plus size={16} className="me-1.5" />
          {t("addRole")}
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
      ) : roles.length === 0 ? (
        <Card className="p-10 text-center text-sm text-gray-400 dark:text-slate-500">
          {t("noRolesYet")}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {role.name}
                  </p>
                  {role.description && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                      {role.description}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0">
                  {t("usersCount", { count: role.userCount })}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.length === 0 ? (
                  <span className="text-xs text-gray-400 dark:text-slate-500">
                    {t("noAccessGranted")}
                  </span>
                ) : (
                  role.permissions.map((p) => (
                    <Badge
                      key={p.entityType}
                      variant="secondary"
                      className="text-[11px] font-normal"
                    >
                      {ENTITY_TYPE_LABELS[p.entityType]}: {p.actions.join(", ")}
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => openEdit(role)}
                >
                  <Pencil size={13} className="me-1.5" />
                  {t("edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteTarget(role)}
                  disabled={role.userCount > 0}
                  title={
                    role.userCount > 0
                      ? t("reassignBeforeDelete")
                      : undefined
                  }
                >
                  <Trash2 size={13} className="text-red-500" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t("dialog.editTitle") : t("dialog.addTitle")}</DialogTitle>
            <DialogDescription>
              {t("dialog.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-5">
            {formError && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30 text-sm">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("dialog.name")}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("dialog.namePlaceholder")}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  {t("dialog.description")}
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("dialog.descriptionPlaceholder")}
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                {t("dialog.recordAccess")}
              </p>
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-800/50">
                    <tr>
                      <th className="text-start px-3 py-2 font-medium text-gray-600 dark:text-slate-300">
                        {t("dialog.recordType")}
                      </th>
                      {PERMISSION_ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="px-2 py-2 font-medium text-gray-600 dark:text-slate-300"
                        >
                          {ACTION_LABELS[action]}
                        </th>
                      ))}
                      <th className="text-start px-3 py-2 font-medium text-gray-600 dark:text-slate-300">
                        {t("dialog.scope")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {PERMISSION_ENTITY_TYPES.map((entityType) => (
                      <tr key={entityType}>
                        <td className="px-3 py-2 text-gray-800 dark:text-white whitespace-nowrap">
                          {ENTITY_TYPE_LABELS[entityType]}
                        </td>
                        {PERMISSION_ACTIONS.map((action) => (
                          <td key={action} className="text-center px-2 py-2">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-[#3F51B5]"
                              checked={permissions[entityType].actions.has(action)}
                              onChange={() => toggleAction(entityType, action)}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          <select
                            className={inputClasses}
                            value={permissions[entityType].scope}
                            onChange={(e) =>
                              setScope(entityType, e.target.value as PermissionScope)
                            }
                          >
                            {Object.entries(SCOPE_LABELS).map(([scope, label]) => (
                              <option key={scope} value={scope}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {PERMISSION_ENTITY_TYPES.some(
              (entityType) => (fieldsByEntity.get(entityType) ?? []).length > 0,
            ) && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  {t("dialog.customFieldVisibility")}
                </p>
                <div className="space-y-3">
                  {PERMISSION_ENTITY_TYPES.map((entityType) => {
                    const fields = fieldsByEntity.get(entityType) ?? [];
                    if (fields.length === 0) return null;
                    return (
                      <div key={entityType}>
                        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1">
                          {ENTITY_TYPE_LABELS[entityType]}
                        </p>
                        <div className="space-y-1">
                          {fields.map((f) => {
                            const state =
                              fieldRestrictions[fieldKey(entityType, f.key)] ?? {
                                hidden: false,
                                readonly: false,
                              };
                            return (
                              <div
                                key={f.key}
                                className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/50 text-sm"
                              >
                                <span className="text-gray-700 dark:text-slate-300 truncate">
                                  {f.label}
                                </span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 accent-[#3F51B5]"
                                      checked={state.hidden}
                                      onChange={() =>
                                        toggleFieldFlag(entityType, f.key, "hidden")
                                      }
                                    />
                                    {t("dialog.hidden")}
                                  </label>
                                  <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 accent-[#3F51B5]"
                                      checked={state.readonly}
                                      onChange={() =>
                                        toggleFieldFlag(entityType, f.key, "readonly")
                                      }
                                    />
                                    {t("dialog.readOnly")}
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeForm}>
                {tc("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-[#3F51B5] hover:bg-[#3646a0]"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : editing ? (
                  t("dialog.saveChanges")
                ) : (
                  t("addRole")
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
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {deleteTarget && t("deleteDialog.confirm", { name: deleteTarget.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : t("deleteDialog.remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
