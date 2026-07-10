import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { reportApi } from "../services/reportApi";
import { CreateSavedReportRequest } from "../types";

const REPORTS_KEY = "reports";

/** Analytics dashboard overview. */
export const useDashboard = () =>
  useQuery({
    queryKey: [REPORTS_KEY, "dashboard"],
    queryFn: () => reportApi.getDashboard(),
  });

/** Rep + team performance leaderboard. */
export const useTeamPerformance = () =>
  useQuery({
    queryKey: [REPORTS_KEY, "team-performance"],
    queryFn: () => reportApi.getTeamPerformance(),
  });

/** Dataset/field/operator registry for the builder (rarely changes). */
export const useDatasets = () =>
  useQuery({
    queryKey: [REPORTS_KEY, "datasets"],
    queryFn: () => reportApi.getDatasets(),
    staleTime: 1000 * 60 * 30,
  });

/** Saved report definitions visible to the caller, plus CRUD + run. */
export const useSavedReports = () => {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [REPORTS_KEY, "saved"] });

  const savedQuery = useQuery({
    queryKey: [REPORTS_KEY, "saved"],
    queryFn: () => reportApi.getSaved(),
  });

  const runReportMutation = useMutation({
    mutationFn: reportApi.run,
  });

  const createSavedMutation = useMutation({
    mutationFn: (dto: CreateSavedReportRequest) => reportApi.createSaved(dto),
    onSuccess: invalidate,
  });

  const updateSavedMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateSavedReportRequest }) =>
      reportApi.updateSaved(id, dto),
    onSuccess: invalidate,
  });

  const deleteSavedMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteSaved(id),
    onSuccess: invalidate,
  });

  return {
    savedQuery,
    runReportMutation,
    createSavedMutation,
    updateSavedMutation,
    deleteSavedMutation,
  };
};
