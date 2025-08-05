
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Match } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, ArrowRight, MoreVertical } from 'lucide-react';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';

// Placeholder data to prevent database calls from the public page
const placeholderUpcomingMatch: Match = {
  id: 'match-1',
  seriesId: 'series-1',
  clubId: 'club-1',
  seriesName: 'Summer League 2024',
  name: 'Round 5',
  location: 'Oakwood Lake',
  googleMapsLink: 'https://maps.app.goo.gl/123456789',
  date: new Date(new Date().setDate(new Date().getDate() + 7)),
  status: 'Upcoming',
  drawTime: '08:00',
  startTime: '09:30',
  endTime: '14:30',
  capacity: 30,
  registeredCount: 15,
  paidPlaces: 3,
  registeredAnglers: [],
};

const placeholderCompletedMatch: Match = {
    id: 'match-2',
    seriesId: 'series-1',
    clubId: 'club-1',
    seriesName: 'Summer League 2024',
    name: 'Round 4',
    location: 'Willow Creek',
    googleMapsLink: 'https://maps.app.goo.gl/987654321',
    date: new Date(new Date().setDate(new Date().getDate() - 7)),
    status: 'Completed',
    drawTime: '08:00',
    startTime: '09:30',
    endTime: '14:30',
    capacity: 25,
    registeredCount: 25,
    paidPlaces: 3,
    registeredAnglers: [],
};


export default function PublicDashboard() {
  const isMobile = useIsMobile();
  const [view, setView] = useState<'loading' | 'desktop' | 'mobile'>('loading');

  useEffect(() => {
    if (isMobile === undefined) {
      setView('loading');
    } else if (isMobile) {
      setView('mobile');
    } else {
      setView('desktop');
    }
  }, [isMobile]);

  const renderUpcomingMatch = (match: Match) => {
    if (view === 'mobile') {
        return (
             <Card>
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
                        <span className="font-medium">{format(match.date, 'eee, dd MMM yyyy')}</span>
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
                <CardFooter>
                    <Button asChild className="w-full">
                        <Link href="/auth/login">
                            Login to Register
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        )
    }
    // Desktop view (Table Row)
    return (
        <TableRow>
            <TableCell>{format(match.date, 'dd/MM/yyyy')}</TableCell>
            <TableCell className="font-medium">{match.name}</TableCell>
            <TableCell>{match.seriesName}</TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <span>{match.location}</span>
                    {match.googleMapsLink && (
                        <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                            <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                        </Link>
                    )}
                </div>
            </TableCell>
            <TableCell>{match.registeredCount} / {match.capacity}</TableCell>
            <TableCell>
                 <Button asChild variant="outline" size="sm">
                    <Link href="/auth/login">Login to Register</Link>
                </Button>
            </TableCell>
        </TableRow>
    )
  }

  const renderLastCompletedMatch = () => {
    if (!placeholderCompletedMatch) return null;
    return (
        <div>
            <h2 className="text-xl font-bold tracking-tight mb-4">Last Completed Match</h2>
            <Card className="bg-muted/20">
                <CardHeader>
                    <CardTitle>{placeholderCompletedMatch.name}</CardTitle>
                    <CardDescription>{placeholderCompletedMatch.seriesName} at {placeholderCompletedMatch.location}</CardDescription>
                </CardHeader>
                <CardFooter>
                     <Button asChild variant="secondary" className="w-full">
                        <Link href="/auth/login">Login to View Results</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }
  
  if (view === 'loading') {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome! Here is the latest public information for the selected club.
        </p>
      </div>
      
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
            <Label htmlFor="club-filter">Viewing Club</Label>
            <Select value="placeholder-club" disabled>
                <SelectTrigger id="club-filter" className="w-[220px]">
                    <SelectValue placeholder="Select a club..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="placeholder-club">Placeholder Angling Club</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <p className="text-sm text-muted-foreground pb-2 flex-1">Login to see results and other clubs.</p>
      </div>

       <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Next Upcoming Match</h2>
        {view === 'mobile' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {renderUpcomingMatch(placeholderUpcomingMatch)}
            </div>
        ) : (
            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Series</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Registration</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {renderUpcomingMatch(placeholderUpcomingMatch)}
                    </TableBody>
                </Table>
            </Card>
        )}
       </div>

       {renderLastCompletedMatch()}
    </div>
  );
}
