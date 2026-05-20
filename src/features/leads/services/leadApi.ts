import { apiClient } from "@/lib/api-client";
import { Lead, CreateLeadDto } from "../types";

export const leadApi = {
  getAll: () => apiClient.get<Lead[]>("/leads"),
  getById: (id: number) => apiClient.get<Lead>(`/leads/${id}`),
  create: (data: CreateLeadDto) => apiClient.post<Lead>("/leads", data),
  update: (id: number, data: Partial<CreateLeadDto>) => apiClient.patch<Lead>(`/leads/${id}`, data),
  delete: (id: number) => apiClient.delete(`/leads/${id}`),
};
