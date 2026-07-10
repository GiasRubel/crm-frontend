import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { activityApi } from "../services/activityApi";
import {
  ActivityQuery,
  AssignActivityDto,
  CreateActivityDto,
  SetActivityStatusDto,
  UpdateActivityDto,
} from "../types";

const ACTIVITIES_KEY = "activities";

export const useActivities = (query: ActivityQuery) => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] });
    // Completed communications feed lead scores / contact histories
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  const activitiesQuery = useQuery({
    queryKey: [ACTIVITIES_KEY, "list", query],
    queryKeyHashFn: (queryKey) => JSON.stringify(queryKey),
    queryFn: () => activityApi.getAll(query),
    placeholderData: keepPreviousData,
  });

  const statsQuery = useQuery({
    queryKey: [ACTIVITIES_KEY, "stats"],
    queryFn: () => activityApi.getStats(),
  });

  const createActivityMutation = useMutation({
    mutationFn: (data: CreateActivityDto) => activityApi.create(data),
    onSuccess: invalidate,
  });

  const updateActivityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateActivityDto }) =>
      activityApi.update(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] }),
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SetActivityStatusDto }) =>
      activityApi.setStatus(id, data),
    onSuccess: invalidate,
  });

  const assignActivityMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignActivityDto }) =>
      activityApi.assign(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] }),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: (id: string) => activityApi.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: [ACTIVITIES_KEY] }),
  });

  return {
    activitiesQuery,
    statsQuery,
    createActivityMutation,
    updateActivityMutation,
    setStatusMutation,
    assignActivityMutation,
    deleteActivityMutation,
  };
};
