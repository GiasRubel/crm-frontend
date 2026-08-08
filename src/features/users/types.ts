export interface StaffUser {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  customRoleId: string | null;
  customRoleName: string | null;
}

export type StaffRole = "User" | "Admin" | "Administrator";

export interface CreateStaffDto {
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
}

export function staffDisplayName(user: StaffUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}
