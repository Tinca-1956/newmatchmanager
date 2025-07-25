
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import type { User, Match, MatchStatus, Result } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

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
    const lastName = parts.slice(1).join(' ');
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
             <div className="flex flex-col">
                <span>{match.location}</span>
                <span className="text-xs text-muted-foreground">{getCalculatedStatus(match)}</span>
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
          <TableCell><Skeleton className="h-4 w-full" /></TableCell>
        </TableRow>
      ));
    }

    if (recentResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} className="text-center h-24">
            No recent results found.
          </TableCell>
        </TableRow>
      );
    }

    return recentResults.map(result => (
      <TableRow key={result.userId}>
        <TableCell>
            <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
              {result.position || '-'}
            </div>
        </TableCell>
        <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
      </TableRow>
    ));
  };
  
  const recentResultsTitle = recentSeriesName && recentMatchName ? `${recentSeriesName} - ${recentMatchName}` : 'Last completed match'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userProfile?.firstName || 'Angler'}. Here&apos;s what&apos;s happening in
          your club.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderRecentResults()}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
