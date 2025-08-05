
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { Club, Match, Result } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, MapPin, LogIn, Trophy } from 'lucide-react';
import Link from 'next/link';

// Mock data to prevent database calls from the public page
const mockClubs: Club[] = [
    { id: 'club-1', name: 'Oakwood Angling Society', description: 'Friendly local club', imageUrl: '' },
    { id: 'club-2', name: 'Willow Creek Fishery', description: 'Premier fishery', imageUrl: '' },
];

const mockMatches: Match[] = [
    {
        id: 'match-1',
        seriesId: 'series-1',
        clubId: 'club-1',
        seriesName: 'Summer League 2024',
        name: 'Round 3',
        location: 'Oakwood Lake',
        googleMapsLink: 'https://maps.app.goo.gl/12345',
        date: new Date(new Date().setDate(new Date().getDate() + 7)),
        status: 'Upcoming',
        drawTime: '08:00',
        startTime: '09:30',
        endTime: '15:30',
        capacity: 20,
        registeredCount: 15,
        registeredAnglers: [],
        paidPlaces: 3,
    },
    {
        id: 'match-2',
        seriesId: 'series-1',
        clubId: 'club-1',
        seriesName: 'Summer League 2024',
        name: 'Round 4',
        location: 'Willow Creek',
        googleMapsLink: 'https://maps.app.goo.gl/67890',
        date: new Date(new Date().setDate(new Date().getDate() + 14)),
        status: 'Upcoming',
        drawTime: '08:30',
        startTime: '10:00',
        endTime: '16:00',
        capacity: 30,
        registeredCount: 28,
        registeredAnglers: [],
        paidPlaces: 4,
    },
];

const mockCompletedMatch: Match = {
    id: 'match-3',
    seriesId: 'series-1',
    clubId: 'club-1',
    seriesName: 'Summer League 2024',
    name: 'Round 2',
    location: 'Kingfisher Pond',
    googleMapsLink: '',
    date: new Date(new Date().setDate(new Date().getDate() - 7)),
    status: 'Completed',
    drawTime: '08:00',
    startTime: '09:30',
    endTime: '15:30',
    capacity: 20,
    registeredCount: 18,
    registeredAnglers: [],
    paidPlaces: 3,
};

export default function PublicDashboard() {
  const [selectedClubId, setSelectedClubId] = useState<string>('club-1');
  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const renderUpcomingMatch = () => {
    if (mockMatches.length === 0) {
      return (
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No upcoming matches scheduled.</p>
          </CardContent>
        </Card>
      );
    }

    const nextMatch = mockMatches[0];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>{nextMatch.name}</CardTitle>
                    <CardDescription>{nextMatch.seriesName}</CardDescription>
                </div>
                <Badge variant="outline">{nextMatch.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
             <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">Date:</p>
                    <p className="font-semibold">{format(nextMatch.date as Date, 'eee, dd MMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">Location:</p>
                     <div className="flex items-center gap-1 font-semibold">
                        <span>{nextMatch.location}</span>
                        {nextMatch.googleMapsLink && (
                            <Link href={nextMatch.googleMapsLink} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4 text-primary" />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">Draw:</p>
                    <p className="font-semibold">{nextMatch.drawTime}</p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="text-muted-foreground">Capacity:</p>
                    <p className="font-semibold">{nextMatch.registeredCount} / {nextMatch.capacity}</p>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Login to Register
                <LogIn className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Last Completed Match</CardTitle>
                <CardDescription>
                    {mockCompletedMatch.name} - {format(mockCompletedMatch.date, 'dd MMM yyyy')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Results are available for logged-in members.</p>
            </CardContent>
            <CardFooter>
                 <Button asChild className="w-full" variant="outline">
                    <Link href="/auth/login">
                        <Trophy className="mr-2 h-4 w-4" />
                        View Full Results
                    </Link>
                </Button>
            </CardFooter>
        </Card>

      </div>
    );
  };
  
  const renderUpcomingMatchesList = () => (
    <div className="grid gap-4">
      {mockMatches.map((match) => (
        <Card key={match.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{match.name}</CardTitle>
                <CardDescription>{match.seriesName}</CardDescription>
              </div>
              <Badge variant="outline">{match.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{format(match.date as Date, 'eee, dd MMM yyyy')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Location:</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{match.location}</span>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary" />
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Registration:</span>
              <span className="font-medium">{match.registeredCount} / {match.capacity}</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between items-center">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Login to Register
                <LogIn className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  const renderContent = () => {
    if (!isClient) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }
    return isMobile ? renderUpcomingMatchesList() : renderUpcomingMatch();
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 justify-between">
        <h1 className="text-xl font-bold">Public Dashboard</h1>
        <Button asChild>
            <Link href="/auth/login">Member Login</Link>
        </Button>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
        <div className="max-w-6xl w-full mx-auto grid gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-semibold">Next Upcoming Match</h2>
            <div className="w-full md:w-auto">
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                    <SelectTrigger className="w-full md:w-[280px]">
                        <SelectValue placeholder="Select a club..." />
                    </SelectTrigger>
                    <SelectContent>
                        {mockClubs.map(club => (
                            <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
