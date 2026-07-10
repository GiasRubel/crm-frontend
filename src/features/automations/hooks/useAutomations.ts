import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  automationApi,
  RuleQuery,
  RunQuery,
} from "../services/automationApi";
import { CreateAutomationRuleDto, UpdateAutomationRuleDto } from "../types";

const AUTOMATIONS_KEY = "automations";

export const useAutomations = (query: RuleQuery, runQuery: RunQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });

  const rulesQuery = useQuery({
    queryKey: [AUTOMATIONS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => automationApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [AUTOMATIONS_KEY, "stats"],
    queryFn: () => automationApi.getStats(),
  });

  const runsQuery = useQuery({
    queryKey: [AUTOMATIONS_KEY, "runs", runQuery],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => automationApi.getRuns(runQuery),
    placeholderData: keepPreviousData,
    // The engine runs in the background — keep the log reasonably fresh
    refetchInterval: 30_000,
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: CreateAutomationRuleDto) => automationApi.create(data),
    onSuccess: invalidate,
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAutomationRuleDto }) =>
      automationApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (id: string) => automationApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    rulesQuery,
    statsQuery,
    runsQuery,
    createRuleMutation,
    updateRuleMutation,
    deleteRuleMutation,
  };
};
