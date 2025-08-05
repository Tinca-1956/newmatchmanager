
'use client';

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, Timestamp, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import type { Match, Result, Club, MatchStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  let matchDate: Date;
    if (match.date instanceof Timestamp) {
        matchDate = match.date.toDate();
    } else if (match.date instanceof Date) {
        matchDate = match.date;
    } else {
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
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);
  
  const [isClubLoading, setIsClubLoading] = useState(true);
  const [isMatchesLoading, setIsMatchesLoading] = useState(true);
  const [isResultsLoading, setIsResultsLoading] = useState(true);

  // Effect to fetch all clubs
  useEffect(() => {
    if (!firestore) return;
    
    setIsClubLoading(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      if (clubsData.length > 0 && !selectedClubId) {
        setSelectedClubId(clubsData[0].id);
      }
      setIsClubLoading(false);
    }, (error) => {
      console.error("Error fetching clubs:", error);
      setIsClubLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId]);

  // Effect to fetch matches and results once a club is selected
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      // If no club is selected, ensure we are not in a loading state.
      setIsMatchesLoading(false);
      setIsResultsLoading(false);
      return;
    }

    setIsMatchesLoading(true);
    setIsResultsLoading(true);

    // --- Fetch Upcoming Matches ---
    const upcomingQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      where('status', '==', 'Upcoming')
    );
    const unsubscribeUpcoming = onSnapshot(upcomingQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        let date = data.date;
        if (date instanceof Timestamp) {
            date = date.toDate();
        }
        return {
          id: doc.id,
          ...data,
          date,
        } as Match;
      });
      matchesData.sort((a,b) => (a.date as Date).getTime() - (b.date as Date).getTime());
      setUpcomingMatches(matchesData);
      setIsMatchesLoading(false);
    }, (error) => {
      console.error('Error fetching upcoming matches:', error);
      setIsMatchesLoading(false);
    });


    // --- Fetch Recent Results ---
    const recentResultsQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      where('status', '==', 'Completed'),
      orderBy('date', 'desc'),
      limit(1)
    );
    const unsubscribeRecent = onSnapshot(recentResultsQuery, async (matchesSnapshot) => {
      if (matchesSnapshot.empty) {
        setRecentResults([]);
        setRecentMatchDetails(null);
        setRecentMatchImages([]);
        setIsResultsLoading(false);
        return;
      }

      const recentMatchDoc = matchesSnapshot.docs[0];
      const recentMatchData = {
          id: recentMatchDoc.id,
          ...recentMatchDoc.data(),
          date: (recentMatchDoc.data().date as Timestamp).toDate(),
      } as Match;

      setRecentMatchDetails(recentMatchData);
      setRecentMatchImages(recentMatchData.mediaUrls || []);

      const resultsQuery = query(
        collection(firestore, 'results'),
        where('matchId', '==', recentMatchData.id)
      );
      const resultsSnapshot = await getDocs(resultsQuery);
      const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
      
      const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
      setRecentResults(sortedResults);
      setIsResultsLoading(false);
    }, (error) => {
      console.error('Error fetching recent results:', error);
      setIsResultsLoading(false);
    });

    return () => {
      unsubscribeUpcoming();
      unsubscribeRecent();
    };
  }, [selectedClubId]);


  const renderUpcomingMatches = () => {
    if (isMatchesLoading) {
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
            No upcoming matches scheduled.
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
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                </div>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isResultsLoading) {
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
                    <TrophyIcon className="h-8 w-8" />
                    <p>No recent results found.</p>
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
    if (isResultsLoading) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (recentMatchImages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                 <p className="text-xs text-muted-foreground">Club admins can upload photos from the matches page.</p>
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
    <>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 bg-muted/40">
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">
                    A public view of upcoming matches and recent results.
                    </p>
                </div>
                {isClubLoading ? (
                    <Skeleton className="h-10 w-48" />
                ) : (
                    <Select
                        value={selectedClubId || ''}
                        onValueChange={(value) => setSelectedClubId(value)}
                    >
                        <SelectTrigger className="w-full sm:w-auto sm:min-w-[200px]">
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

            <div className="grid gap-6 mt-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
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
                                    <TableHead>Venue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderUpcomingMatches()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Recent Results</CardTitle>
                        <CardDescription>
                            {recentMatchDetails ? `${recentMatchDetails.name} on ${format(recentMatchDetails.date as Date, 'dd/MM/yy')}` : 'Last completed match'}
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
                            <Button variant="outline" className="w-full">
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
                           {isResultsLoading ? <Skeleton className="h-5 w-32" /> : (recentMatchImages.length > 0 ? "From the last match" : "No recent photos")}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {renderImageGallery()}
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
      <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </>
  );
}

    