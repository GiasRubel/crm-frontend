import { apiClient } from "@/lib/api-client";
import { StaffUser } from "../types";

export const userApi = {
  getStaff: () => apiClient.get<StaffUser[]>("/users/staff"),
};
