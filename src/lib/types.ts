
export type UserRole = 'Site Admin' | 'Club Admin' | 'Marshal' | 'Angler';
export type MembershipStatus = 'Pending' | 'Member' | 'Suspended' | 'Blocked';
export type MatchStatus = 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled';

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
  clubId: string;
  seriesName: string;
  name: string;
  location: string;
  date: Date;
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
  userId: string;
  userName: string;
  position: number;
  weight: number; // in oz
  points: number;
}
