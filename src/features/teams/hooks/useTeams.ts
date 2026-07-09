import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { teamApi } from "../services/teamApi";
import { CreateTeamDto, TeamQuery, UpdateTeamDto } from "../types";

const TEAMS_KEY = "teams";
const CUSTOMERS_KEY = "customers";

export const useTeams = (query: TeamQuery) => {
  const queryClient = useQueryClient();

  // Team changes affect customer visibility/assignment labels too
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [TEAMS_KEY] });
    queryClient.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
  };

  const teamsQuery = useQuery({
    queryKey: [TEAMS_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => teamApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [TEAMS_KEY, "stats"],
    queryFn: () => teamApi.getStats(),
  });

  const createTeamMutation = useMutation({
    mutationFn: (data: CreateTeamDto) => teamApi.create(data),
    onSuccess: invalidate,
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTeamDto }) =>
      teamApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => teamApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    teamsQuery,
    statsQuery,
    createTeamMutation,
    updateTeamMutation,
    deleteTeamMutation,
  };
};

/** Active teams the signed-in staff user belongs to. */
export const useMyTeams = () =>
  useQuery({
    queryKey: [TEAMS_KEY, "my"],
    queryFn: () => teamApi.getMy(),
  });
