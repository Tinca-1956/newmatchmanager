
import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'Site Admin' | 'Club Admin' | 'Angler';
export type MembershipStatus = 'Pending' | 'Member' | 'Suspended' | 'Blocked' | 'Deleted' | 'Unverified';
export type MatchStatus = 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' | 'Weigh-in';
export type WeighInStatus = 'NYW' | 'OK' | 'DNF' | 'DNW' | 'DSQ';
export type ClubStatus = 'Active' | 'Suspended';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  memberStatus: MembershipStatus; // Status for the primary club
  primaryClubId?: string;
  // secondaryClubId is deprecated in favor of the applications/memberships model
}

export interface Club {
  id:string;
  name: string;
  description: string;
  imageUrl: string;
  country?: string;
  state?: string;
  subscriptionExpiryDate?: Date | Timestamp;
  status?: ClubStatus;
}

export interface Series {
  id: string;
  clubId: string;
  name: string;
  isCompleted?: boolean;
}

export interface Match {
  id: string;
  seriesId: string;
  clubId: string;
  seriesName: string;
  name: string;
  location: string;
  googleMapsLink?: string;
  date: Date | Timestamp;
  status: MatchStatus;
  drawTime: string;
  startTime: string;
  endTime: string;
  capacity: number;
  registeredCount: number;
  registeredAnglers: string[];
  paidPlaces: number;
  mediaUrls?: string[];
  description?: string;
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
  payout?: number;
  sectionRank?: number | null;
}

export interface StandardText {
  id: string;
  clubId: string;
  summary?: string;
  content: string;
}

export interface MatchReview {
  id: string;
  reviewContent: string;
  reviewImages?: string[];
  authorId: string;
  lastUpdated: Timestamp;
}

export interface Comment {
  id: string;
  commentText: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
}


// Public-facing types for the publicMatches collection
export interface PublicResult {
    userId: string;
    userName: string;
    peg: string;
    section: string;
    weight: number;
    status: string;
    position: number | null;
    sectionRank: number | null;
}

export interface PublicMatch {
    id: string;
    clubId: string;
    clubName: string;
    seriesId: string;
    seriesName: string;
    name: string;
    location: string;
    date: any; // Stored as Timestamp
    status: string;
    paidPlaces: number;
    results: PublicResult[];
    mediaUrls?: string[];
}

// A simplified, public-safe version of an upcoming match
export interface PublicUpcomingMatch {
    id: string;
    clubId: string;
    seriesId: string;
    seriesName: string;
    name: string;
    location: string;
    date: any; // Stored as Timestamp
    drawTime: string;
    startTime: string;
    endTime: string;
    status: MatchStatus;
}

export interface Blog {
  id: string;
  clubId: string;
  authorId: string;
  authorName: string;
  subject: string;
  content: string;
  mediaUrls?: { url: string; name: string; type: string }[];
  createdAt: Timestamp;
  lastUpdated: Timestamp;
}

export interface BlogComment {
  id: string;
  commentText: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  clubId: string;
  type: 'new_blog_post' | 'new_comment';
  entityId: string; // ID of the blog post
  message: string;
  link: string;
  createdAt: Timestamp;
  isRead: boolean;
  readAt?: Timestamp;
}
