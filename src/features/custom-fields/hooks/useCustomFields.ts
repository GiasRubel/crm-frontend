import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFieldsApi } from "../services/customFieldsApi";
import {
  CreateCustomFieldDefinitionDto,
  CustomFieldEntityType,
  UpdateCustomFieldDefinitionDto,
} from "../types";

const CUSTOM_FIELDS_KEY = "custom-field-definitions";

/** Admin management: every definition, optionally filtered to one entity type. */
export const useCustomFields = (entityType?: CustomFieldEntityType) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [CUSTOM_FIELDS_KEY] });

  const listQuery = useQuery({
    queryKey: [CUSTOM_FIELDS_KEY, entityType ?? "all"],
    queryFn: () => customFieldsApi.getAll(entityType),
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomFieldDefinitionDto) =>
      customFieldsApi.create(dto),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      dto,
    }: {
      id: string;
      dto: UpdateCustomFieldDefinitionDto;
    }) => customFieldsApi.update(id, dto),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customFieldsApi.remove(id),
    onSuccess: invalidate,
  });

  return { listQuery, createMutation, updateMutation, deleteMutation };
};

/**
 * Form-embedding: active field definitions for one entity type, for
 * rendering a dynamic custom-fields section on a create/edit form.
 */
export const useCustomFieldDefinitions = (entityType: CustomFieldEntityType) => {
  return useQuery({
    queryKey: [CUSTOM_FIELDS_KEY, entityType, "active"],
    queryFn: () => customFieldsApi.getAll(entityType),
    select: (definitions) =>
      definitions
        .filter((d) => d.isActive)
        .sort((a, b) => a.order - b.order),
    staleTime: 60_000,
  });
};
