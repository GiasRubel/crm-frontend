import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { leadApi } from "../services/leadApi";
import {
  AddEngagementDto,
  AssignLeadDto,
  ConvertLeadDto,
  CreateLeadDto,
  LeadQuery,
  UpdateLeadDto,
} from "../types";

const LEADS_KEY = "leads";

export const useLeads = (query: LeadQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [LEADS_KEY] });

  const leadsQuery = useQuery({
    queryKey: [LEADS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => leadApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [LEADS_KEY, "stats"],
    queryFn: () => leadApi.getStats(),
  });

  const createLeadMutation = useMutation({
    mutationFn: (data: CreateLeadDto) => leadApi.create(data),
    onSuccess: invalidate,
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadDto }) =>
      leadApi.update(id, data),
    onSuccess: invalidate,
  });

  const addEngagementMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddEngagementDto }) =>
      leadApi.addEngagement(id, data),
    onSuccess: invalidate,
  });

  const assignLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignLeadDto }) =>
      leadApi.assign(id, data),
    onSuccess: invalidate,
  });

  const convertLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ConvertLeadDto }) =>
      leadApi.convert(id, data),
    onSuccess: () => {
      invalidate();
      // Conversion creates a customer and (usually) an opportunity
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => leadApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    leadsQuery,
    statsQuery,
    createLeadMutation,
    updateLeadMutation,
    addEngagementMutation,
    assignLeadMutation,
    convertLeadMutation,
    deleteLeadMutation,
  };
};
