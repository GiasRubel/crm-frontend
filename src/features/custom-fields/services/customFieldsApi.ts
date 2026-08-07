import { apiClient } from "@/lib/api-client";
import {
  CreateCustomFieldDefinitionDto,
  CustomFieldDefinition,
  CustomFieldEntityType,
  UpdateCustomFieldDefinitionDto,
} from "../types";

export const customFieldsApi = {
  getAll: (entityType?: CustomFieldEntityType) =>
    apiClient.get<CustomFieldDefinition[]>(
      `/custom-field-definitions${entityType ? `?entityType=${entityType}` : ""}`,
    ),
  create: (dto: CreateCustomFieldDefinitionDto) =>
    apiClient.post<CustomFieldDefinition>("/custom-field-definitions", dto),
  update: (id: string, dto: UpdateCustomFieldDefinitionDto) =>
    apiClient.patch<CustomFieldDefinition>(`/custom-field-definitions/${id}`, dto),
  remove: (id: string) => apiClient.delete<void>(`/custom-field-definitions/${id}`),
};
