import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'Site Admin' | 'Club Admin' | 'Marshal' | 'Angler';
export type MembershipStatus = 'Pending' | 'Member' | 'Suspended' | 'Blocked' | 'Deleted';
export type MatchStatus = 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' | 'Weigh-in';
export type WeighInStatus = 'NYW' | 'OK' | 'DNF' | 'DNW' | 'DSQ';

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
  subscriptionExpiryDate?: Date | Timestamp;
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
}

export interface Match {
  id: string;
  seriesId: string;
  clubId: string;
  seriesName: string;
  name: string;
  location: string;
  date: Date | Timestamp;
  status: MatchStatus;
  drawTime: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registeredCount: number;
  registeredAnglers: string[];
}

export interface Result {
  matchId: string;
  seriesId: string;
  clubId: string;
  userId: string;
  userName: string;
  position: number | null;
  weight: number; // in kg
  date: Date | Timestamp;
  status?: WeighInStatus;
  peg?: string;
  section?: string;
}
