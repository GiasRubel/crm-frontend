import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadApi } from "../services/leadApi";
import { CreateLeadDto } from "../types";

export const useLeads = () => {
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    queryKey: ["leads"],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => leadApi.getAll(),
  });

  const createLeadMutation = useMutation({
    mutationFn: (data: CreateLeadDto) => leadApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: number) => leadApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  return {
    leadsQuery,
    createLeadMutation,
    deleteLeadMutation,
  };
};
