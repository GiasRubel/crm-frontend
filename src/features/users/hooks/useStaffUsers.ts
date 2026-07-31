import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../services/userApi";
import { CreateStaffDto } from "../types";

const STAFF_KEY = ["users", "staff"];

/** Staff directory (non-Customer users) for member/owner pickers. */
export const useStaffUsers = () =>
  useQuery({
    queryKey: STAFF_KEY,
    queryFn: () => userApi.getStaff(),
    staleTime: 60_000,
  });

export const useCreateStaffUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStaffDto) => userApi.createStaff(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAFF_KEY }),
  });
};
