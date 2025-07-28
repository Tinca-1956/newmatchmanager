
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import type { User, Match, MatchStatus, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const [recentMatchName, setRecentMatchName] = useState<string>('');
  const [recentSeriesName, setRecentSeriesName] = useState<string>('');
  const [recentMatchLocation, setRecentMatchLocation] = useState<string>('');
  const [recentMatchPaidPlaces, setRecentMatchPaidPlaces] = useState<number>(0);
  const [recentMatchImages, setRecentMatchImages] = useState<string[]>([]);


  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(true);

  useEffect(() => {
    if (!user || !firestore) {
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as User);
      }
    });

    return () => unsubscribeUser();
  }, [user]);

  useEffect(() => {
    if (!userProfile?.primaryClubId || !firestore) {
        setIsLoading(false);
        setIsLoadingResults(false);
        return;
    }

    const processMatches = async () => {
        setIsLoading(true);
        setIsLoadingResults(true);

        const allMatchesQuery = query(
            collection(firestore, 'matches'),
            where('clubId', '==', userProfile.primaryClubId)
        );

        const allMatchesSnapshot = await getDocs(allMatchesQuery);
        const matchesData = allMatchesSnapshot.docs.map(doc => {
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
            
            // Calculate ranks correctly
            const anglersWithWeight = resultsData
                .filter(r => r.status === 'OK' && r.weight > 0)
                .sort((a, b) => b.weight - a.weight);

            const lastRankedPosition = anglersWithWeight.length;
            const didNotWeighRank = lastRankedPosition + 1;

            const finalResults = resultsData.map(result => {
                if (['DNW', 'DNF', 'DSQ'].includes(result.status || '')) {
                    return { ...result, position: didNotWeighRank };
                }
                const rankedIndex = anglersWithWeight.findIndex(r => r.userId === result.userId);
                if (rankedIndex !== -1) {
                    return { ...result, position: rankedIndex + 1 };
                }
                // If status is OK but weight is 0, or some other edge case
                if(result.status === 'OK' && result.weight === 0) {
                    return { ...result, position: didNotWeighRank };
                }
                // Fallback for any other case
                return result;
            });
            
            const sortedResults = finalResults.sort((a, b) => (a.position || 999) - (b.position || 999));
            setRecentResults(sortedResults);

        } else {
            setRecentResults([]);
            setRecentMatchName('');
            setRecentSeriesName('');
            setRecentMatchLocation('');
            setRecentMatchImages([]);
        }
        setIsLoadingResults(false);
    };

    processMatches();

  }, [userProfile, toast]);

  const renderUpcomingMatches = () => {
    if (isLoading) {
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
          <TableCell colSpan={4} className="text-center h-24">
            No upcoming matches
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
                    <span className="text-xs text-muted-foreground block">{getCalculatedStatus(match)}</span>
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
          <TableCell colSpan={4} className="text-center h-24">
            No recent results found.
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
  
  const recentResultsTitle = recentSeriesName && recentMatchName ? `${recentSeriesName} - ${recentMatchName} at ${recentMatchLocation}` : 'Last completed match'

  const renderImageGallery = () => {
    if (isLoadingResults) {
        return <Skeleton className="w-full h-full" />
    }
    if (recentMatchImages.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No images found for the most recent match.</p>
            </div>
        )
    }
    return (
      <Carousel>
        <CarouselContent>
          {recentMatchImages.map((url, index) => (
            <CarouselItem key={index}>
              <div className="relative w-full aspect-video">
                <NextImage
                  src={url}
                  alt={`Recent match image ${index + 1}`}
                  fill
                  sizes="(max-width: 1280px) 25vw, 33vw"
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderUpcomingMatches()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                 {isLoadingResults ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>{recentResultsTitle}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
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

         <Card>
            <CardHeader>
                <CardTitle>Recent Photos</CardTitle>
                {isLoadingResults ? (
                    <Skeleton className="h-5 w-32" />
                ) : (
                    <CardDescription>From the last match</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                {renderImageGallery()}
            </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}

