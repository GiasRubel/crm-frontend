import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roleApi } from "../services/roleApi";
import { CreateCustomRoleDto, UpdateCustomRoleDto } from "../types";

const ROLES_KEY = "custom-roles";
const MY_PERMISSIONS_KEY = "my-permissions";
const STAFF_KEY = ["users", "staff"];

export const useCustomRoles = () => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });

  const listQuery = useQuery({
    queryKey: [ROLES_KEY],
    queryFn: () => roleApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomRoleDto) => roleApi.create(dto),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCustomRoleDto }) =>
      roleApi.update(id, dto),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => roleApi.remove(id),
    onSuccess: invalidate,
  });

  return { listQuery, createMutation, updateMutation, deleteMutation };
};

/** The signed-in staff member's effective CRUD/scope matrix — drives UI gating. */
export const useMyPermissions = () =>
  useQuery({
    queryKey: [MY_PERMISSIONS_KEY],
    queryFn: () => roleApi.getMyPermissions(),
    staleTime: 60_000,
  });

export const useSetUserCustomRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      customRoleId,
    }: {
      userId: string;
      customRoleId: string | null;
    }) => roleApi.setUserCustomRole(userId, customRoleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY });
      queryClient.invalidateQueries({ queryKey: [ROLES_KEY] });
    },
  });
};
