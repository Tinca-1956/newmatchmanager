'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import type { User, Match, MatchStatus, Result, Club } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, addDays } from 'date-fns';
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
import { ExpiryReportModal } from '@/components/expiry-report-modal';

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


export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');
  const [recentSeriesName, setRecentSeriesName] = useState<string>('');
  const [recentMatchLocation, setRecentMatchLocation] = useState<string>('');
  const [recentMatchPaidPlaces, setRecentMatchPaidPlaces] = useState<number>(0);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);
  const [recentMatchId, setRecentMatchId] = useState<string | null>(null);
  const [expiringClubs, setExpiringClubs] = useState<Club[]>([]);
  const [isExpiryModalOpen, setIsExpiryModalOpen] = useState(false);


  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  // Effect for Site Admin expiry report
  useEffect(() => {
    // Only run for Site Admins and once per session using sessionStorage
    if (userProfile?.role === 'Site Admin' && firestore && !sessionStorage.getItem('expiryReportShown')) {
        const fetchExpiringClubs = async () => {
            const clubsQuery = query(collection(firestore, 'clubs'));
            const clubsSnapshot = await getDocs(clubsQuery);
            const allClubs = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));

            const now = new Date();
            const thresholdDate = addDays(now, 30);
            
            const expiring = allClubs.filter(club => {
                if (club.subscriptionExpiryDate) {
                    const expiryDate = club.subscriptionExpiryDate instanceof Timestamp
                        ? club.subscriptionExpiryDate.toDate()
                        : club.subscriptionExpiryDate;
                    return expiryDate <= thresholdDate && expiryDate >= now;
                }
                return false;
            });

            if (expiring.length > 0) {
                setExpiringClubs(expiring);
                setIsExpiryModalOpen(true);
                sessionStorage.setItem('expiryReportShown', 'true'); // Mark as shown for this session
            }
        };

        fetchExpiringClubs();
    }
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile?.primaryClubId || !firestore) {
        setIsLoading(false);
        setIsLoadingResults(false);
        return;
    }

    const matchesQuery = query(
        collection(firestore, 'matches'),
        where('clubId', '==', userProfile.primaryClubId)
    );

    const unsubscribe = onSnapshot(matchesQuery, async (snapshot) => {
        setIsLoading(true);
        setIsLoadingResults(true);
        
        const matchesData = snapshot.docs.map(doc => {
            const data = doc.data();
            // Ensure date is a JS Date object for calculations
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
        
        // --- Status Update Logic ---
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
            try {
                await batch.commit();
                console.log(`Updated status for ${updatesMade} matches.`);
            } catch (error) {
                console.error("Failed to batch update match statuses:", error);
            }
        }
        // --- End Status Update Logic ---
        
        // --- Filter for Upcoming Matches display ---
        const trulyUpcoming = matchesData
            .filter(match => ['Upcoming', 'In Progress'].includes(getCalculatedStatus(match)))
            .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());
        
        setUpcomingMatches(trulyUpcoming);
        setIsLoading(false);

        // --- Filter for Recent Results display ---
        const completedMatches = matchesData
            .filter(match => match.status === 'Completed')
            .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());
        
        if (completedMatches.length > 0) {
            const recentMatch = completedMatches[0];
            setRecentMatchId(recentMatch.id);
            setRecentMatchName(recentMatch.name);
            setRecentSeriesName(recentMatch.seriesName);
            setRecentMatchLocation(recentMatch.location);
            setRecentMatchPaidPlaces(recentMatch.paidPlaces || 0);
            setRecentMatchImages(recentMatch.mediaUrls || []);
            
            const resultsQuery = query(
                collection(firestore, 'results'),
                where('matchId', '==', recentMatch.id)
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs.map(d => d.data() as Result);
            
            // This sorting logic is now more direct and less prone to errors.
            const sortedResults = resultsData.sort((a, b) => (a.position || 999) - (b.position || 999));
            setRecentResults(sortedResults);

        } else {
            setRecentResults([]);
            setRecentMatchId(null);
            setRecentMatchName('');
            setRecentSeriesName('');
            setRecentMatchLocation('');
            setRecentMatchImages([]);
        }
        setIsLoadingResults(false);
    }, (error) => {
        console.error("Dashboard subscription error: ", error);
        toast({
            variant: "destructive",
            title: "Permissions Error",
            description: "Could not fetch dashboard data. Check Firestore rules.",
        });
        setIsLoading(false);
        setIsLoadingResults(false);
    });

    return () => unsubscribe();

  }, [userProfile, toast]);

  const handleGoToMatch = (matchId: string | null) => {
    if (matchId) {
      router.push(`/main/matches?matchId=${matchId}`);
    }
  };

  const renderUpcomingMatches = () => {
    if (isLoading) {
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
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" onClick={() => handleGoToMatch(match.id)}>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Go to match details</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderRecentResults = () => {
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

    return recentResults.map(result => {
        const isPaidPlace = result.position !== null && recentMatchPaidPlaces > 0 && result.position <= recentMatchPaidPlaces;
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
  
  const recentResultsTitle = recentSeriesName && recentMatchName ? `${recentSeriesName} - ${recentMatchName}` : 'Last completed match'

  const renderImageGallery = () => {
    if (isLoadingResults) {
        return <Skeleton className="w-full h-full min-h-[200px]" />
    }
    if (recentMatchImages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                 <p className="text-xs text-muted-foreground">Upload photos from the matches page.</p>
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
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userProfile?.firstName || 'Angler'}. Here&apos;s what&apos;s happening in
          your club.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 grid auto-rows-min gap-6">
            <Card>
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

            <Card className="lg:col-span-1 hidden lg:block">
              <CardHeader>
                  <CardTitle>Recent Photos</CardTitle>
                  <CardDescription>Photos from the last completed match.</CardDescription>
              </CardHeader>
              <CardContent>
                  {renderImageGallery()}
              </CardContent>
            </Card>

        </div>

         <Card className="flex flex-col lg:col-span-1">
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                 {isLoadingResults ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>{recentResults.length > 0 ? recentResultsTitle : "No completed matches"}</CardDescription>
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
            {recentMatchId && (
                <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                        <Link href={`/main/matches?matchId=${recentMatchId}`}>
                            View Full Results
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            )}
        </Card>
      </div>

       <Card className="block lg:hidden">
          <CardHeader>
              <CardTitle>Recent Photos</CardTitle>
              <CardDescription>Photos from the last completed match.</CardDescription>
          </CardHeader>
          <CardContent>
              {renderImageGallery()}
          </CardContent>
        </Card>
    </div>
    
    <ExpiryReportModal 
        isOpen={isExpiryModalOpen}
        onClose={() => setIsExpiryModalOpen(false)}
        expiringClubs={expiringClubs}
    />
    </>
  );
}
