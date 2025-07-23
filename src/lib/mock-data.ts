
import type { Club, Match, Result, User } from './types';

// This is a placeholder mock for a dashboard-specific match type.
// The main Match type is now more detailed.
interface DashboardMatch { 
  id: string;
  seriesId: string;
  seriesName: string;
  date: Date;
  venue: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
}

export const mockUpcomingMatches: DashboardMatch[] = [
    { id: 'match-1', seriesId: 'series-1', seriesName: 'Summer League', date: new Date(new Date().setDate(new Date().getDate() + 7)), venue: 'Oakwood Lake', status: 'Upcoming' },
    { id: 'match-2', seriesId: 'series-1', seriesName: 'Summer League', date: new Date(new Date().setDate(new Date().getDate() + 14)), venue: 'Willow Creek', status: 'Upcoming' },
    { id: 'match-3', seriesId: 'series-2', seriesName: 'Evening Mini-Series', date: new Date(new Date().setDate(new Date().getDate() + 21)), venue: 'Canal Stretch 5', status: 'Upcoming' },
];

export const mockRecentResults: (Result & { seriesName: string; venue: string, date: Date })[] = [
    { clubId: 'club-1', seriesId: 'series-1', matchId: 'match-4', userId: 'user-2', userName: 'Jane Doe', position: 1, weight: 80.5, points: 1, seriesName: 'Spring Open', venue: 'Kingfisher Pond', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { clubId: 'club-1', seriesId: 'series-1', matchId: 'match-4', userId: 'user-1', userName: 'John Angler', position: 2, weight: 70.0, points: 2, seriesName: 'Spring Open', venue: 'Kingfisher Pond', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { clubId: 'club-1', seriesId: 'series-1', matchId: 'match-4', userId: 'user-3', userName: 'Peter Smith', position: 3, weight: 61.25, points: 3, seriesName: 'Spring Open', venue: 'Kingfisher Pond', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { clubId: 'club-1', seriesId: 'series-1', matchId: 'match-5', userId: 'user-4', userName: 'Susan B.', position: 1, weight: 150.0, points: 1, seriesName: 'Club Championship', venue: 'Grand Union Canal', date: new Date(new Date().setDate(new Date().getDate() - 14)) },
];

    
