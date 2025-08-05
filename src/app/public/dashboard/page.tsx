
'use client';

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, Timestamp, orderBy, limit, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { User, Match, MatchStatus, Result, Club } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
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
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

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
  const { toast } = useToast();
  const router = useRouter();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchDetails, setRecentMatchDetails] = useState<{name: string, seriesName: string, paidPlaces: number, images: string[], id: string} | null>(null);

  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Effect to fetch all clubs on initial load
  useEffect(() => {
    if (!firestore) return;
    setIsLoadingClubs(true);
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
        const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
        setClubs(clubsData);
        setIsLoadingClubs(false);
    }, (error) => {
        console.error("Error fetching clubs:", error);
        toast({ variant: 'destructive', title: 'Error fetching clubs', description: error.message });
        setIsLoadingClubs(false);
    });
    return () => unsubscribe();
  }, [toast]);
  

  // Effect to fetch data for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatches([]);
      setRecentResults([]);
      setRecentMatchDetails(null);
      return;
    }

    const processMatchesForClub = async () => {
        setIsLoadingMatches(true);
        setIsLoadingResults(true);

        try {
            const allMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', selectedClubId)
            );
            const allMatchesSnapshot = await getDocs(allMatchesQuery);
            const matchesData = allMatchesSnapshot.docs.map(doc => {
                const data = doc.data();
                let date = data.date;
                if (date instanceof Timestamp) {
                    date = date.toDate();
                }
                return {
                    id: doc.id,
                    ...data,
                    date,
                } as Match
            });
            
            const batch = writeBatch(firestore);
            let updatesMade = 0;
            matchesData.forEach(match => {
                const calculatedStatus = getCalculatedStatus(match);
                if(match.status !== calculatedStatus) {
                    const matchRef = doc(firestore, 'matches', match.id);
                    batch.update(matchRef, { status: calculatedStatus });
                    updatesMade++;
                    match.status = calculatedStatus; // Update local copy
                }
            });

            if (updatesMade > 0) {
                await batch.commit();
            }
            
            const trulyUpcoming = matchesData
                .filter(match => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(match)))
                .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
            
            setUpcomingMatches(trulyUpcoming);
            setIsLoadingMatches(false);

            const completedMatches = matchesData
                .filter(match => match.status === 'Completed')
                .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
            
            if (completedMatches.length > 0) {
                const recentMatch = completedMatches[0];
                setRecentMatchDetails({
                    id: recentMatch.id,
                    name: recentMatch.name,
                    seriesName: recentMatch.seriesName,
                    paidPlaces: recentMatch.paidPlaces || 0,
                    images: recentMatch.mediaUrls || [],
                });
                
                const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', recentMatch.id));
                const resultsSnapshot = await getDocs(resultsQuery);
                const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
                
                const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
                setRecentResults(sortedResults);
            } else {
                setRecentResults([]);
                setRecentMatchDetails(null);
            }
        } catch (error: any) {
            console.error("Error processing matches for club:", error);
            toast({ variant: 'destructive', title: 'Error Loading Data', description: 'Could not load match data for this club.' });
        } finally {
            setIsLoadingMatches(false);
            setIsLoadingResults(false);
        }
    };

    processMatchesForClub();

  }, [selectedClubId, toast]);

  const handleGoToMatch = (matchId: string | null) => {
    if (matchId) {
      router.push(`/auth/login`);
    }
  };

  const renderUpcomingMatches = () => {
    if (!selectedClubId) {
        return (
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Please select a club to view upcoming matches.
                </TableCell>
            </TableRow>
        );
    }
    if (isLoadingMatches) {
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
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <div>
                    <span>{match.location}</span>
                    <span className="text-xs text-muted-foreground block">{match.status}</span>
                </div>
                {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
        <TableCell className="text-right">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleGoToMatch(match.id)}>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Login for match details</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
    if (!selectedClubId) {
        return (
            <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Please select a club to view recent results.
                </TableCell>
            </TableRow>
        );
    }
    if (isLoadingResults) {
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

    return recentResults.slice(0, 5).map(result => {
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
  
  const recentResultsTitle = recentMatchDetails ? `${recentMatchDetails.seriesName} - ${recentMatchDetails.name}` : 'Last completed match';

  const renderImageGallery = () => {
    if (!selectedClubId) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <p className="mt-4 text-sm text-muted-foreground">Please select a club to view photos.</p>
            </div>
        );
    }
    if (isLoadingResults) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (!recentMatchDetails || recentMatchDetails.images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                 <p className="text-xs text-muted-foreground">Login to upload photos from the matches page.</p>
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
          {recentMatchDetails.images.map((url, index) => (
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
    <div className="flex flex-col gap-8 p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
            <p className="text-muted-foreground">
            Welcome! Select a club to see what's happening.
            </p>
        </div>
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <Label htmlFor="club-select">Select a Club</Label>
            {isLoadingClubs ? <Skeleton className="h-10 w-full sm:w-48" /> : (
                <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                    <SelectTrigger id="club-select" className="w-full sm:w-48">
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

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
        <Card className="lg:col-span-2">
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
                            <TableHead><span className="sr-only">Actions</span></TableHead>
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
                 {isLoadingResults ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>
                        {recentMatchDetails ? `${recentMatchDetails.seriesName} - ${recentMatchDetails.name}` : 'Last completed match'}
                    </CardDescription>
                )}
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
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/auth/login">
                            Login for More
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>

         <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Recent Photos</CardTitle>
                {isLoadingResults ? (
                    <Skeleton className="h-5 w-32" />
                ) : (
                    <CardDescription>{recentMatchDetails && recentMatchDetails.images.length > 0 ? "From the last match" : "No recent photos"}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center">
                {renderImageGallery()}
            </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
