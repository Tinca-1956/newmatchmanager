// This file is not part of the main app bundle.
// It's used by the Cloud Function to provide type safety.

export type UserRole = 'Site Admin' | 'Club Admin' | 'Angler';
export type MembershipStatus = 'Pending' | 'Member' | 'Suspended' | 'Blocked' | 'Deleted';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  memberStatus: MembershipStatus;
  primaryClubId?: string;
}
