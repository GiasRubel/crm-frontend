import { useQuery } from "@tanstack/react-query";
import { userApi } from "../services/userApi";

/** Staff directory (non-Customer users) for member/owner pickers. */
export const useStaffUsers = () =>
  useQuery({
    queryKey: ["users", "staff"],
    queryFn: () => userApi.getStaff(),
    staleTime: 60_000,
  });
