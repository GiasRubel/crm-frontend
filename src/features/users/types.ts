export interface StaffUser {
  id: string;
  keycloakId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export function staffDisplayName(user: StaffUser): string {
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}
