'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, Timestamp, orderBy, limit, getDocs, onSnapshot, doc } from 'firebase/firestore';
import type { Club, Match, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon, ArrowRight, Trophy as TrophyIcon, ServerCrash } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const getCalculatedStatus = (match: Match): 'Upcoming' | 'In Progress' | 'Completed' | 'Cancelled' | 'Weigh-in' => {
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
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [selectedClub, setSelectedClub] = useState<Club | null>(null);

    const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
    const [recentResults, setRecentResults] = useState<Result[]>([]);
    const [recentMatchDetails, setRecentMatchDetails] = useState<Match | null>(null);
    
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingContent, setIsLoadingContent] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Effect to fetch all clubs once on component mount
    useEffect(() => {
        if (!firestore) return;

        setIsLoadingClubs(true);
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));

        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            if (clubsData.length > 0 && !selectedClubId) {
                setSelectedClubId(clubsData[0].id);
            }
            setIsLoadingClubs(false);
        }, (err) => {
            console.error("Error fetching clubs:", err);
            setError("Could not fetch the list of clubs. The database may be offline.");
            setIsLoadingClubs(false);
        });

        return () => unsubscribe();
    }, [selectedClubId]);


    // Effect to fetch content when a club is selected
    useEffect(() => {
        if (!selectedClubId || !firestore) {
            return;
        }

        // Set the selected club object for the header display
        const currentClub = clubs.find(c => c.id === selectedClubId);
        setSelectedClub(currentClub || null);
        
        setIsLoadingContent(true);
        setError(null);

        const fetchAllData = async () => {
            try {
                // Fetch Upcoming Matches
                const upcomingQuery = query(
                    collection(firestore, 'matches'),
                    where('clubId', '==', selectedClubId),
                    where('status', 'in', ['Upcoming', 'In Progress']),
                    limit(5)
                );
                const upcomingSnapshot = await getDocs(upcomingQuery);
                const upcomingData = upcomingSnapshot.docs.map(doc => ({
                    id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate()
                } as Match));
                setUpcomingMatches(upcomingData.sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime()));
                
                // Fetch Recent Completed Match
                const recentMatchQuery = query(
                    collection(firestore, 'matches'),
                    where('clubId', '==', selectedClubId),
                    where('status', '==', 'Completed'),
                    orderBy('date', 'desc'),
                    limit(1)
                );
                const recentMatchSnapshot = await getDocs(recentMatchQuery);

                if (!recentMatchSnapshot.empty) {
                    const recentMatch = {
                        id: recentMatchSnapshot.docs[0].id,
                        ...recentMatchSnapshot.docs[0].data(),
                        date: (recentMatchSnapshot.docs[0].data().date as Timestamp).toDate()
                    } as Match;
                    setRecentMatchDetails(recentMatch);
                    
                    // Fetch Results for that match
                    const resultsQuery = query(
                        collection(firestore, 'results'),
                        where('matchId', '==', recentMatch.id),
                        orderBy('position', 'asc')
                    );
                    const resultsSnapshot = await getDocs(resultsQuery);
                    const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                    setRecentResults(resultsData);
                } else {
                    // No completed matches found
                    setRecentMatchDetails(null);
                    setRecentResults([]);
                }
            } catch (err: any) {
                 console.error("Error fetching dashboard content:", err);
                 setError("Could not load match data for this club. There might be a permissions issue.");
            } finally {
                setIsLoadingContent(false);
            }
        };

        fetchAllData();

    }, [selectedClubId, clubs]);


  const renderUpcomingMatches = () => {
    if (isLoadingContent) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ));
    }

    if (upcomingMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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
        <TableCell className="font-medium">{match.name.includes("Round") ? `${match.name} at ${match.location}` : match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                    <span className="text-xs text-muted-foreground block">{getCalculatedStatus(match)}</span>
                </div>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
        <TableCell className="text-right">
             <Button variant="ghost" size="icon" disabled>
                <ArrowRight className="h-4 w-4" />
            </Button>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (isLoadingContent) {
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

    return recentResults.map(result => {
        const isPaidPlace = result.position !== null && (recentMatchDetails?.paidPlaces || 0) > 0 && result.position <= (recentMatchDetails?.paidPlaces || 0);
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
    if (isLoadingContent) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!recentMatchDetails?.mediaUrls || recentMatchDetails.mediaUrls.length === 0) {
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
          {recentMatchDetails.mediaUrls.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-square w-full">
                <NextImage
                  src={url}
                  alt={`Recent match image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  style={{ objectFit: 'contain' }}
                  className="rounded-md"
                  data-ai-hint="fishing landscape"
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
  
  const renderHeader = () => {
      return (
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                <p className="text-muted-foreground">
                    Viewing data for: {isLoadingClubs ? <Skeleton className="h-6 w-48 inline-block" /> : <strong>{selectedClub?.name || '...'}</strong>}
                </p>
             </div>
             <div className="flex flex-col gap-1.5 w-full md:w-auto max-w-xs">
                <Label htmlFor="club-select">Select a Club</Label>
                 {isLoadingClubs ? <Skeleton className="h-10 w-full" /> : (
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-select">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            {clubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 )}
             </div>
          </div>
      )
  }

  return (
    <main className="flex-1 flex flex-col p-4 md:p-8 lg:p-12">
        <div className="container mx-auto space-y-8">
            {renderHeader()}
            
            {error && (
                <Alert variant="destructive">
                    <ServerCrash className="h-4 w-4" />
                    <AlertTitle>Error Loading Data</AlertTitle>
                    <AlertDescription>
                        {error}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
                <Card className="lg:col-span-2 xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Upcoming Matches</CardTitle>
                        <CardDescription>The next 5 matches scheduled for this club.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date &amp; Series</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Venue &amp; Status</TableHead>
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderUpcomingMatches()}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <Card className="flex flex-col xl:col-span-1">
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
                </Card>

                <Card className="flex flex-col xl:col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Photos</CardTitle>
                         <CardDescription>{(recentMatchDetails?.mediaUrls?.length || 0) > 0 ? "From the last match" : "No recent photos"}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center">
                        {renderImageGallery()}
                    </CardContent>
                </Card>
            </div>
        </div>
    </main>
  );
}