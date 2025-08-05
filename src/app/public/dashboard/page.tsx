
'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, query, where, getDocs, orderBy, Timestamp, limit } from 'firebase/firestore';
import type { Match, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function PublicDashboardContent() {
    const { toast } = useToast();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [selectedClubId, setSelectedClubId] = useState<string>('');
    const [isLoadingClubs, setIsLoadingClubs] = useState(true);
    const [isLoadingMatches, setIsLoadingMatches] = useState(false);
    const [nextMatch, setNextMatch] = useState<Match | null>(null);
    const [lastMatch, setLastMatch] = useState<Match | null>(null);
    
    useEffect(() => {
        if (!firestore) {
            setIsLoadingClubs(false);
            return;
        }

        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            setIsLoadingClubs(false);
        }, (error) => {
            console.error("Error fetching clubs: ", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch clubs.' });
            setIsLoadingClubs(false);
        });

        return () => unsubscribe();
    }, [toast]);

    const handleClubSelectionChange = async (clubId: string) => {
        setSelectedClubId(clubId);
        if (!clubId || !firestore) {
            setNextMatch(null);
            setLastMatch(null);
            return;
        }

        setIsLoadingMatches(true);
        setNextMatch(null);
        setLastMatch(null);

        try {
            // Fetch next upcoming match
            const upcomingMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', clubId),
                where('status', '==', 'Upcoming'),
                orderBy('date', 'asc'),
                limit(1)
            );
            const upcomingSnapshot = await getDocs(upcomingMatchesQuery);
            if (!upcomingSnapshot.empty) {
                const matchDoc = upcomingSnapshot.docs[0];
                const matchData = matchDoc.data();
                setNextMatch({
                    id: matchDoc.id,
                    ...matchData,
                    date: (matchData.date as Timestamp).toDate(),
                } as Match);
            }

            // Fetch last completed match
            const completedMatchesQuery = query(
                collection(firestore, 'matches'),
                where('clubId', '==', clubId),
                where('status', '==', 'Completed'),
                orderBy('date', 'desc'),
                limit(1)
            );
            const completedSnapshot = await getDocs(completedMatchesQuery);
            if (!completedSnapshot.empty) {
                const matchDoc = completedSnapshot.docs[0];
                const matchData = matchDoc.data();
                setLastMatch({
                    id: matchDoc.id,
                    ...matchData,
                    date: (matchData.date as Timestamp).toDate(),
                } as Match);
            }

        } catch (error: any) {
            console.error("Error fetching match data:", error);
            toast({
                variant: 'destructive',
                title: 'Error Fetching Matches',
                description: "Could not load match data for this club. You may not have the required permissions.",
            });
        } finally {
            setIsLoadingMatches(false);
        }
    };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
        <Card>
            <CardHeader>
                <CardTitle>Public Dashboard</CardTitle>
                <CardDescription>
                View upcoming matches and recent results from clubs.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="club-filter">Select a Club</Label>
                    {isLoadingClubs ? (
                        <Skeleton className="h-10 w-full" />
                    ) : (
                        <Select
                            value={selectedClubId}
                            onValueChange={handleClubSelectionChange}
                            disabled={clubs.length === 0}
                        >
                            <SelectTrigger id="club-filter">
                                <SelectValue placeholder="Select a club to see details..." />
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
            </CardContent>
        </Card>
        
        {selectedClubId && (
            <>
                <Card>
                    <CardHeader>
                        <CardTitle>Next Upcoming Match</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingMatches ? (
                            <Skeleton className="h-10 w-full" />
                        ) : nextMatch ? (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{nextMatch.name}</p>
                                    <p className="text-sm text-muted-foreground">{nextMatch.seriesName} at {nextMatch.location}</p>
                                </div>
                                <Badge variant="outline">{format(nextMatch.date, 'PPP')}</Badge>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No upcoming matches for this club.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Last Completed Match</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoadingMatches ? (
                            <Skeleton className="h-10 w-full" />
                        ) : lastMatch ? (
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">{lastMatch.name}</p>
                                    <p className="text-sm text-muted-foreground">{lastMatch.seriesName} at {lastMatch.location}</p>
                                </div>
                                <Badge variant="outline">{format(lastMatch.date, 'PPP')}</Badge>
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No completed matches found for this club.</p>
                        )}
                    </CardContent>
                </Card>
            </>
        )}

    </div>
  );
}


export default function PublicDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PublicDashboardContent />
        </Suspense>
    )
}
