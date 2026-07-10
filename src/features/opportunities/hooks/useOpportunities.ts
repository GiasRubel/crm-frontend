import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { opportunityApi } from "../services/opportunityApi";
import {
  AssignOpportunityDto,
  CreateOpportunityDto,
  MoveStageDto,
  OpportunityQuery,
  UpdateOpportunityDto,
} from "../types";

const OPPORTUNITIES_KEY = "opportunities";

/** Kanban board + stats + mutations. Pass a query to also load the flat list. */
export const useOpportunities = (query?: OpportunityQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [OPPORTUNITIES_KEY] });

  const boardQuery = useQuery({
    queryKey: [OPPORTUNITIES_KEY, "board"],
    queryFn: () => opportunityApi.getBoard(),
  });

  const statsQuery = useQuery({
    queryKey: [OPPORTUNITIES_KEY, "stats"],
    queryFn: () => opportunityApi.getStats(),
  });

  const listQuery = useQuery({
    queryKey: [OPPORTUNITIES_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => opportunityApi.getAll(query),
    placeholderData: keepPreviousData,
    enabled: query !== undefined,
  });

  const createOpportunityMutation = useMutation({
    mutationFn: (data: CreateOpportunityDto) => opportunityApi.create(data),
    onSuccess: invalidate,
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOpportunityDto }) =>
      opportunityApi.update(id, data),
    onSuccess: invalidate,
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MoveStageDto }) =>
      opportunityApi.moveStage(id, data),
    onSuccess: invalidate,
  });

  const assignOpportunityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignOpportunityDto }) =>
      opportunityApi.assign(id, data),
    onSuccess: invalidate,
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: (id: string) => opportunityApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    boardQuery,
    statsQuery,
    listQuery,
    createOpportunityMutation,
    updateOpportunityMutation,
    moveStageMutation,
    assignOpportunityMutation,
    deleteOpportunityMutation,
  };
};
