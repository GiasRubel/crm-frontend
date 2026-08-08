"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Plus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/keycloak-provider";
import { useCreateStaffUser, useStaffUsers } from "@/features/users/hooks/useStaffUsers";
import { staffDisplayName, StaffRole, StaffUser } from "@/features/users/types";
import { useCustomRoles, useSetUserCustomRole } from "@/features/roles/hooks/useRoles";
import { ApiError } from "@/lib/api-client";

const ROLES: StaffRole[] = ["User", "Admin", "Administrator"];

function getRoleBadge(role: string, staffLabel: string) {
  switch (role) {
    case 'Admin':
    case 'Administrator':
      return <Badge variant="destructive">{role}</Badge>;
    case 'User':
      return <Badge className="bg-blue-500 hover:bg-blue-600">{staffLabel}</Badge>;
    default:
      return <Badge variant="secondary">{role}</Badge>;
  }
}

export function UsersPage() {
  const { user } = useAuth();
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const isAdmin = user?.role === "Admin" || user?.role === "Administrator";

  const { data: staff, isLoading } = useStaffUsers();
  const createStaffMutation = useCreateStaffUser();
  const { listQuery: rolesQuery } = useCustomRoles();
  const customRoles = rolesQuery.data ?? [];
  const setCustomRoleMutation = useSetUserCustomRole();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{ firstName: string; lastName: string; email: string; role: StaffRole }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'User',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filteredStaff = (staff ?? []).filter(
    (u) =>
      staffDisplayName(u).toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = () => {
    setFormData({ firstName: '', lastName: '', email: '', role: 'User' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCustomRoleChange = async (targetUser: StaffUser, customRoleId: string) => {
    await setCustomRoleMutation.mutateAsync({
      userId: targetUser.id,
      customRoleId: customRoleId || null,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      await createStaffMutation.mutateAsync(formData);
      setIsModalOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : t("errors.createFailed"));
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        {isAdmin && (
          <Button onClick={handleOpenModal} className="shadow-lg shadow-primary/20 gap-2">
            <Plus size={18} />
            {t("addStaff")}
          </Button>
        )}
      </div>

      <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="relative max-w-md group">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10 bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 h-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50">
                <TableRow>
                  <TableHead className="w-[250px]">{t("teamMember")}</TableHead>
                  <TableHead>{t("role")}</TableHead>
                  <TableHead>{t("customRole")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : filteredStaff.length > 0 ? (
                  filteredStaff.map((u) => (
                    <TableRow key={u.id} className="group hover:bg-slate-50/30 dark:hover:bg-slate-800 transition-colors">
                      <TableCell className="py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 dark:text-white">{staffDisplayName(u)}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(u.role, t("staffBadge"))}</TableCell>
                      <TableCell>
                        {u.role === "User" && isAdmin ? (
                          <select
                            className="text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                            value={u.customRoleId ?? ""}
                            onChange={(e) => handleCustomRoleChange(u, e.target.value)}
                            disabled={setCustomRoleMutation.isPending}
                          >
                            <option value="">{t("fullAccessDefault")}</option>
                            {customRoles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : u.role === "User" ? (
                          <span className="text-sm text-muted-foreground">
                            {u.customRoleName ?? t("fullAccessDefault")}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{tc("notAvailable")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      {t("noMembers")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t("dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("dialog.subtitle")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {formError && (
              <p className="text-sm font-medium text-destructive">{formError}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dialog.firstName")}</label>
                <Input
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-700"
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dialog.lastName")}</label>
                <Input
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="rounded-xl border-slate-200 dark:border-slate-700"
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dialog.email")}</label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="rounded-xl border-slate-200 dark:border-slate-700"
                placeholder="name@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">{t("dialog.role")}</label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    type="button"
                    variant={formData.role === role ? "default" : "ghost"}
                    className={cn(
                      "h-9 text-sm",
                      formData.role === role ? "shadow-sm" : "text-slate-500 dark:text-slate-400"
                    )}
                    onClick={() => setFormData({ ...formData, role })}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" className="px-8 shadow-lg shadow-primary/20" disabled={createStaffMutation.isPending}>
                {createStaffMutation.isPending ? t("dialog.creating") : t("dialog.createAccount")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
