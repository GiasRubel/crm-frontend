import { apiClient } from "@/lib/api-client";
import { StaffUser } from "@/features/users/types";
import {
  CreateCustomRoleDto,
  CustomRole,
  PermissionMatrix,
  UpdateCustomRoleDto,
} from "../types";

export const roleApi = {
  getAll: () => apiClient.get<CustomRole[]>("/roles"),
  create: (dto: CreateCustomRoleDto) =>
    apiClient.post<CustomRole>("/roles", dto),
  update: (id: string, dto: UpdateCustomRoleDto) =>
    apiClient.patch<CustomRole>(`/roles/${id}`, dto),
  remove: (id: string) => apiClient.delete<void>(`/roles/${id}`),
  getMyPermissions: () =>
    apiClient.get<PermissionMatrix>("/users/me/permissions"),
  setUserCustomRole: (userId: string, customRoleId: string | null) =>
    apiClient.patch<StaffUser>(`/users/${userId}/custom-role`, {
      customRoleId,
    }),
};
