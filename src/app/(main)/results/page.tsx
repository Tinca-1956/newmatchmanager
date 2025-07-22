
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
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, doc, getDoc, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Club, User, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface MatchResultSummary {
  matchId: string;
  matchName: string;
  seriesName: string;
  date: Date;
  venue: string;
  winnerName: string;
  winnerWeight: number; // in oz
}

function weightLbsOz(totalOz: number) {
    if (typeof totalOz !== 'number' || isNaN(totalOz)) return '0lbs 0oz';
    const lbs = Math.floor(totalOz / 16);
    const oz = totalOz % 16;
    return `${lbs}lbs ${oz}oz`;
}

export default function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [results, setResults] = useState<MatchResultSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all clubs for the dropdown
  useEffect(() => {
    if (!firestore) return;
    const clubsCollection = collection(firestore, 'clubs');
    const unsubscribe = onSnapshot(clubsCollection, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
    });
    return () => unsubscribe();
  }, []);

  // Set default selected club once user data is available
  useEffect(() => {
    if (user && !authLoading && !selectedClubId) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(doc => {
        if (doc.exists()) {
          const userData = doc.data() as User;
          if (userData.primaryClubId) {
            setSelectedClubId(userData.primaryClubId);
          } else if (clubs.length > 0) {
            setSelectedClubId(clubs[0].id);
          }
        }
      });
    }
     if (!user && !authLoading && clubs.length > 0) {
        setSelectedClubId(clubs[0].id);
    }
  }, [user, authLoading, clubs, selectedClubId]);

  // Fetch results for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setResults([]);
        if(selectedClubId) setIsLoading(false);
        return;
    }

    setIsLoading(true);
    
    const resultsQuery = query(
        collection(firestore, 'results'),
        where('clubId', '==', selectedClubId),
        where('position', '==', 1) // Only fetch the winners
    );

    const unsubscribe = onSnapshot(resultsQuery, async (snapshot) => {
        if (snapshot.empty) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const winnerResults = snapshot.docs.map(doc => doc.data() as Result);
        
        const matchIds = [...new Set(winnerResults.map(r => r.matchId))];
        
        const matchDetailsMap = new Map();
        if(matchIds.length > 0) {
            const matchesQuery = query(collection(firestore, 'matches'), where('__name__', 'in', matchIds));
            const matchesSnapshot = await getDocs(matchesQuery);
            matchesSnapshot.forEach(doc => {
                matchDetailsMap.set(doc.id, doc.data());
            });
        }

        const summarizedResults: MatchResultSummary[] = winnerResults.map(result => {
            const match = matchDetailsMap.get(result.matchId);
            return {
                matchId: result.matchId,
                matchName: match?.name || 'Unknown Match',
                seriesName: match?.seriesName || 'Unknown Series',
                venue: match?.location || 'Unknown Venue',
                date: (result.date as any).toDate(),
                winnerName: result.userName,
                winnerWeight: result.weight,
            };
        }).sort((a,b) => b.date.getTime() - a.date.getTime()); // Sort by most recent date

        setResults(summarizedResults);
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching results: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch match results.'
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, toast]);

  const renderResultsList = () => {
    if (isLoading) {
      return Array.from({ length: 4 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          </TableRow>
      ));
    }

    if (results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="h-24 text-center">
            No results found for this club.
          </TableCell>
        </TableRow>
      );
    }
    
    return results.map((result) => (
       <TableRow key={result.matchId}>
          <TableCell>{format(result.date, 'PPP')}</TableCell>
          <TableCell className="font-medium">{result.seriesName}</TableCell>
          <TableCell>{result.matchName}</TableCell>
          <TableCell>{result.winnerName}</TableCell>
          <TableCell>{weightLbsOz(result.winnerWeight)}</TableCell>
        </TableRow>
    ))
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results</h1>
          <p className="text-muted-foreground">View match results here.</p>
        </div>
        <div className="w-64">
             <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                <SelectTrigger>
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
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Completed Match Results</CardTitle>
          <CardDescription>
            A summary of results for the selected club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Winning Weight</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderResultsList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
