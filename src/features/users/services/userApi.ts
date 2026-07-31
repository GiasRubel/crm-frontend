import { apiClient } from "@/lib/api-client";
import { CreateStaffDto, StaffUser } from "../types";

export const userApi = {
  getStaff: () => apiClient.get<StaffUser[]>("/users/staff"),
  createStaff: (data: CreateStaffDto) => apiClient.post<StaffUser>("/users", data),
};
