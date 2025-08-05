'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Club, Match, Result } from '@/lib/types';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CalendarDays, Trophy, List, Info, Fish } from 'lucide-react';
import Link from 'next/link';

export default function PublicDashboardPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null);
  const [completedMatch, setCompletedMatch] = useState<Match | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to fetch the list of all clubs
  useEffect(() => {
    if (!firestore) return;

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
      setError("Could not load club data.");
      setIsLoadingClubs(false);
    });

    return () => unsubscribe();
  }, [selectedClubId]);

  // Effect to fetch matches and results when a club is selected
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setUpcomingMatch(null);
      setCompletedMatch(null);
      setResults([]);
      return;
    }

    const fetchData = async () => {
      setIsLoadingMatches(true);
      setIsLoadingResults(true);
      setError(null);
      
      try {
        // Fetch all matches for the club
        const matchesQuery = query(
          collection(firestore, 'matches'),
          where('clubId', '==', selectedClubId)
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const allMatches = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: (doc.data().date as Timestamp).toDate(),
        } as Match));

        // Find the next upcoming match
        const nextUpcomingMatch = allMatches
          .filter(m => m.status === 'Upcoming')
          .sort((a, b) => a.date.getTime() - b.date.getTime())[0] || null;
        setUpcomingMatch(nextUpcomingMatch);

        // Find the last completed match
        const lastCompletedMatch = allMatches
          .filter(m => m.status === 'Completed')
          .sort((a, b) => b.date.getTime() - a.date.getTime())[0] || null;
        setCompletedMatch(lastCompletedMatch);
        setIsLoadingMatches(false);

        // If a completed match is found, fetch its results
        if (lastCompletedMatch) {
            const resultsQuery = query(
                collection(firestore, 'results'),
                where('matchId', '==', lastCompletedMatch.id),
                orderBy('position', 'asc')
            );
            const resultsSnapshot = await getDocs(resultsQuery);
            const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
            setResults(resultsData);
        } else {
            setResults([]); // No completed match, so no results
        }

      } catch (err) {
        console.error("Error fetching match data:", err);
        setError("Could not load match data for this club. The required database indexes might be missing.");
      } finally {
        setIsLoadingMatches(false);
        setIsLoadingResults(false);
      }
    };

    fetchData();
  }, [selectedClubId]);

  const renderUpcomingMatch = () => {
    if (isLoadingMatches) {
        return <Skeleton className="h-24 w-full" />;
    }

    if (!upcomingMatch) {
      return <p className="text-sm text-muted-foreground">No upcoming matches scheduled for this club.</p>;
    }
    
    return (
        <div className="text-sm">
            <p className="font-semibold">{upcomingMatch.name}</p>
            <p className="text-muted-foreground">{format(upcomingMatch.date, 'PPPP')} at {upcomingMatch.location}</p>
        </div>
    );
  };
  
  const renderCompletedMatch = () => {
     if (isLoadingMatches) {
        return <Skeleton className="h-6 w-1/2" />;
    }
    if (!completedMatch) {
        return <p className="text-sm text-muted-foreground">No completed matches found for this club.</p>;
    }
    return <p className="font-semibold">{completedMatch.name} at {completedMatch.location}</p>;
  }
  
  const renderResultsTable = () => {
    if (isLoadingResults) {
        return (
            <div className="space-y-2">
                {Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
        )
    }
     if (results.length === 0) {
        return null; // Don't show anything if there are no results
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Angler</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Peg</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {results.map((result) => (
                    <TableRow key={result.userId}>
                        <TableCell className="font-medium">{result.userName}</TableCell>
                        <TableCell>{result.weight.toFixed(3)}kg</TableCell>
                        <TableCell>{result.peg || '-'}</TableCell>
                        <TableCell>{result.section || '-'}</TableCell>
                        <TableCell>{result.status || 'OK'}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )

  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">
       <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
            <div className="flex justify-center pb-4">
              <Fish className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-3xl">Welcome to Match Manager</CardTitle>
            <CardDescription className="text-lg">
                View public match information here or sign in to manage your account.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <div className="w-full sm:w-auto">
                {isLoadingClubs ? (
                    <Skeleton className="h-10 w-full sm:w-64" />
                ) : (
                    <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                        <SelectTrigger className="w-full sm:w-64">
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
            <Button asChild className="w-full sm:w-auto">
                <Link href="/auth/login">Sign In</Link>
            </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="max-w-4xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Next Upcoming Match
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderUpcomingMatch()}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Last Completed Match
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderCompletedMatch()}
            {renderResultsTable()}
          </CardContent>
        </Card>
      </div>

       <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    About Match Manager
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    This platform provides a comprehensive solution for fishing clubs to manage their matches, members, and results efficiently. To get your club listed or for any inquiries, please contact the site administrator.
                </p>
            </CardContent>
       </Card>

    </div>
  );
}
