export type UserRole = 'Site Admin' | 'Club Admin' | 'Marshal' | 'Angler';
export type MembershipStatus = 'Pending' | 'Member' | 'Suspended' | 'Blocked';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  memberStatus: MembershipStatus;
  primaryClubId?: string;
}

export interface Club {
  id:string;
  name: string;
  description: string;
  imageUrl: string;
  country?: string;
  state?: string;
  subscriptionExpiryDate?: Date;
}

export interface Membership {
  userId: string;
  clubId: string;
  status: MembershipStatus;
}

export interface Series {
  id: string;
  clubId: string;
  name: string;
  matchCount: number;
  completedMatches: number;
}

export interface Match {
  id: string;
  seriesId: string;
  seriesName: string;
  date: Date;
  venue: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
}

export interface Result {
  matchId: string;
  userId: string;
  userName: string;
  position: number;
  weight: number; // in oz
  points: number;
}
