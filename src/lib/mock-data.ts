import type { Club, Match, Result, User } from './types';

export const mockUser: User = {
    id: 'user-1',
    name: 'John Angler',
    email: 'john.angler@example.com',
    role: 'Site Admin',
    primaryClubId: 'club-1',
    avatarUrl: 'https://placehold.co/100x100'
};

export const mockClubs: Club[] = [
    { id: 'club-1', name: 'Riverside Angling Club', description: 'A friendly club for all ages.', imageUrl: 'https://placehold.co/40x40' },
    { id: 'club-2', name: 'Lakeside Casters', description: 'Competitive match fishing.', imageUrl: 'https://placehold.co/40x40' },
    { id: 'club-3', name: 'Coastal Fishers United', description: 'Sea fishing specialists.', imageUrl: 'https://placehold.co/40x40' },
    { id: 'club-4', name: 'Pike Masters', description: 'Predator fishing experts.', imageUrl: 'https://placehold.co/40x40' },
    { id: 'club-5', name: 'The Carp Collective', description: 'For the dedicated carp angler.', imageUrl: 'https://placehold.co/40x40' },
];

export const mockUpcomingMatches: Match[] = [
    { id: 'match-1', seriesId: 'series-1', seriesName: 'Summer League', date: new Date(new Date().setDate(new Date().getDate() + 7)), venue: 'Oakwood Lake', status: 'Upcoming' },
    { id: 'match-2', seriesId: 'series-1', seriesName: 'Summer League', date: new Date(new Date().setDate(new Date().getDate() + 14)), venue: 'Willow Creek', status: 'Upcoming' },
    { id: 'match-3', seriesId: 'series-2', seriesName: 'Evening Mini-Series', date: new Date(new Date().setDate(new Date().getDate() + 21)), venue: 'Canal Stretch 5', status: 'Upcoming' },
];

export const mockRecentResults: (Result & { seriesName: string; venue: string, date: Date })[] = [
    { matchId: 'match-4', userId: 'user-2', userName: 'Jane Doe', position: 1, weight: 1280, points: 1, seriesName: 'Spring Open', venue: 'Kingfisher Pond', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { matchId: 'match-4', userId: 'user-1', userName: 'John Angler', position: 2, weight: 1120, points: 2, seriesName: 'Spring Open', venue: 'Kingfisher Pond', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { matchId: 'match-4', userId: 'user-3', userName: 'Peter Smith', position: 3, weight: 980, points: 3, seriesName: 'Spring Open', venue: 'Kingfisher Pond', date: new Date(new Date().setDate(new Date().getDate() - 7)) },
    { matchId: 'match-5', userId: 'user-4', userName: 'Susan B.', position: 1, weight: 2400, points: 1, seriesName: 'Club Championship', venue: 'Grand Union Canal', date: new Date(new Date().setDate(new Date().getDate() - 14)) },
];
