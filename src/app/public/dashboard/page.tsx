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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, orderBy, Timestamp, limit, onSnapshot } from 'firebase/firestore';
import type { Club, Match, Result, MatchStatus } from '@/lib/types';
import { MapPin, ArrowRight, Trophy, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  let matchDate: Date;
    if (match.date instanceof Timestamp) {
        matchDate = match.date.toDate();
    } else if (match.date instanceof Date) {
        matchDate = match.date;
    } else {
        // Fallback for invalid date format
        return match.status;
    }
  
  if (!match.drawTime || !match.endTime || !match.drawTime.includes(':') || !match.endTime.includes(':')) {
    return match.status;
  }

  const [drawHours, drawMinutes] = match.drawTime.split(':').map(Number);
  const drawDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), drawHours, drawMinutes);

  const [endHours, endMinutes] = match.endTime.split(':').map(Number);
  const endDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), endHours, endMinutes);
  
  const weighInProgressUntil = new Date(endDateTime.getTime() + 90 * 60 * 1000);

  if (match.status === 'Cancelled') return 'Cancelled';
  if (now > weighInProgressUntil) return 'Completed';
  if (now > endDateTime) return 'Weigh-in';
  if (now > drawDateTime) return 'In Progress';
  
  return 'Upcoming';
};

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}


export default function PublicDashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);

  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingUpcomingMatches, setIsLoadingUpcomingMatches] = useState(true);
  const [isLoadingRecentResults, setIsLoadingRecentResults] = useState(true);
  const [isClubReady, setIsClubReady] = useState(false);

  // Effect 1: Fetch all clubs once on initial load
  useEffect(() => {
    if (!firestore) {
      setIsLoadingClubs(false);
      return;
    };
    
    const clubsQuery = query(collection(firestore, 'clubs'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        if (clubsData.length > 0 && !selectedClubId) {
            setSelectedClubId(clubsData[0].id);
        }
        setIsLoadingClubs(false);
        setIsClubReady(true); // Signal that we are ready to fetch data
    }, (error) => {
        console.error("Error fetching clubs: ", error);
        setIsLoadingClubs(false);
    });
    
    return () => unsubscribe();
  }, [selectedClubId]);
  
  // Effect 2: Fetch matches and results based on the selected club
  useEffect(() => {
    if (!isClubReady || !selectedClubId || !firestore) {
      // If we are not ready, ensure loading states are true
      if (!isClubReady) {
        setIsLoadingUpcomingMatches(true);
        setIsLoadingRecentResults(true);
      }
      return;
    }
    
    // Set loading states to true when a new club is selected
    setIsLoadingUpcomingMatches(true);
    setIsLoadingRecentResults(true);

    // --- UPCOMING MATCHES ---
    const upcomingQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      where('status', 'in', ['Upcoming', 'In Progress'])
    );
    const unsubscribeUpcoming = onSnapshot(upcomingQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: (data.date as Timestamp).toDate(),
        } as Match;
      });
      // Client-side sort
      matchesData.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
      setUpcomingMatches(matchesData);
      setIsLoadingUpcomingMatches(false);
    }, (error) => {
      console.error("Error fetching upcoming matches: ", error);
      setIsLoadingUpcomingMatches(false);
    });

    // --- RECENT RESULTS ---
    const recentQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      where('status', '==', 'Completed')
      // No server-side order by, sort on client
    );
    const unsubscribeRecent = onSnapshot(recentQuery, async (snapshot) => {
      const completedMatches = snapshot.docs.map(doc => {
         const data = doc.data();
          return {
            id: doc.id,
            ...data,
            date: (data.date as Timestamp).toDate(),
          } as Match;
      });
      
      // Client-side sort to find the most recent
      completedMatches.sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

      if (completedMatches.length > 0) {
        const recentMatch = completedMatches[0];
        setRecentMatchDetails(recentMatch);
        setRecentMatchImages(recentMatch.mediaUrls || []);

        const resultsQuery = query(
          collection(firestore, 'results'),
          where('matchId', '==', recentMatch.id)
        );
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
        resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
        setRecentResults(resultsData);
      } else {
        setRecentMatchDetails(null);
        setRecentResults([]);
        setRecentMatchImages([]);
      }
      setIsLoadingRecentResults(false);
    }, (error) => {
      console.error("Error fetching recent matches: ", error);
      setIsLoadingRecentResults(false);
    });

    return () => {
        unsubscribeUpcoming();
        unsubscribeRecent();
    };
  }, [selectedClubId, isClubReady]);


  const renderUpcomingMatches = () => {
    if (isLoadingUpcomingMatches) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled for this club.
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span>{format(match.date as Date, 'dd/MM/yyyy')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell className="font-medium">{match.name.includes("Round") ? `${match.name} at ${match.location}` : match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                    <span className="text-xs text-muted-foreground block">{getCalculatedStatus(match)}</span>
                </div>
                {match.googleMapsLink && (
                  <a href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </a>
                )}
            </div>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoadingRecentResults) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
        </TableRow>
      ));
    }

    if (recentResults.length === 0) {
      return (
        <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Trophy className="h-8 w-8" />
                    <p>No recent results found for this club.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }

    const paidPlaces = recentMatchDetails?.paidPlaces || 0;

    return recentResults.map(result => {
        const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
        return (
            <TableRow 
                key={result.userId}
                className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}
            >
                <TableCell>
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                    {result.position || '-'}
                    </div>
                </TableCell>
                <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
                <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
                <TableCell>
                    <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
                </TableCell>
            </TableRow>
        );
    });
  };

  const renderImageGallery = () => {
    if (isLoadingRecentResults) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (recentMatchImages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
            </div>
        )
    }
    return (
      <Carousel
        opts={{
            align: "start",
            loop: true,
        }}
         className="w-full"
      >
        <CarouselContent className="-ml-1">
          {recentMatchImages.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-square w-full">
                <NextImage
                  src={url}
                  alt={`Recent match image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  style={{ objectFit: 'contain' }}
                  className="rounded-md"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome! Here&apos;s a brief overview of club activities.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Viewing Club:</span>
            {isLoadingClubs ? (
                <Skeleton className="h-10 w-48" />
            ) : (
                <Select value={selectedClubId || ''} onValueChange={setSelectedClubId} disabled={clubs.length <= 1}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select a club..." />
                    </SelectTrigger>
                    <SelectContent>
                        {clubs.map(club => (
                            <SelectItem key={club.id} value={club.id}>
                                {club.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="lg:col-span-1 xl:col-span-2">
            <CardHeader>
                <CardTitle>Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date &amp; Series</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Venue &amp; Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderUpcomingMatches()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <div className="space-y-6">
            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Recent Results</CardTitle>
                    <CardDescription>
                        {isLoadingRecentResults ? <Skeleton className="h-5 w-48" /> : (
                            recentMatchDetails ? `${recentMatchDetails.name} on ${format(recentMatchDetails.date as Date, 'dd/MM/yy')}` : 'Last completed match'
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Pos</TableHead>
                                <TableHead>Angler</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderRecentResults()}
                        </TableBody>
                    </Table>
                </CardContent>
                {recentMatchDetails && (
                    <CardFooter>
                        <Button variant="outline" className="w-full" disabled>
                            View Full Results
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </CardFooter>
                )}
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Recent Photos</CardTitle>
                    <CardDescription>
                        {isLoadingRecentResults ? <Skeleton className="h-5 w-32" /> : "From the last match"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    {renderImageGallery()}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
