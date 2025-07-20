export type UserRole = 'Site Admin' | 'Club Admin' | 'Marshal' | 'Angler';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  primaryClubId?: string;
  avatarUrl?: string;
}

export interface Club {
  id:string;
  name: string;
  description: string;
  imageUrl: string;
}

export type MembershipStatus = 'Pending' | 'Member' | 'Guest' | 'Suspended' | 'Blocked';

export interface Membership {
  userId: string;
  clubId: string;
  status: MembershipStatus;
}

export interface Series {
  id: string;
  name: string;
  clubId: string;
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
