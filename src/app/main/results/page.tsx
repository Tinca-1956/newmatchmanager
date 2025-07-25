
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs, orderBy, Timestamp, doc, onSnapshot, getDoc, Query } from 'firebase/firestore';
import type { Result, Series, User, Club, Match } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface EnrichedResult extends Result {
    seriesName: string;
    matchName: string;
}

function ResultsPageComponent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const searchParams = useSearchParams();

  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');

  const [clubName, setClubName] = useState<string>('');
  const [pageTitle, setPageTitle] = useState('Results');
  
  const [isLoading, setIsLoading] = useState(true);

  // Effect to handle URL parameters on initial load
  useEffect(() => {
    const clubId = searchParams.get('clubId');
    const seriesId = searchParams.get('seriesId');
    const matchId = searchParams.get('matchId');

    if (clubId) setSelectedClubId(clubId);
    if (seriesId) setSelectedSeriesId(seriesId);
    if (matchId) setSelectedMatchId(matchId);

  }, [searchParams]);

  // Effect to get the user's primary club or all clubs for admin
  useEffect(() => {
    if (adminLoading || !user || !firestore) return;

    const fetchInitialData = async () => {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (isSiteAdmin) {
                const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                if (!selectedClubId) { // Only set if not set by URL param
                  setSelectedClubId(userData.primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
                }
            } else {
                if (!selectedClubId) {
                  setSelectedClubId(userData.primaryClubId || '');
                }
            }
        }
    };
    fetchInitialData();
  }, [user, isSiteAdmin, adminLoading, selectedClubId]);

  // Effect to fetch series and matches for the selected club
  useEffect(() => {
      if (!selectedClubId || !firestore) {
        setSeries([]);
        setMatches([]);
        return;
      }
      const clubDocRef = doc(firestore, 'clubs', selectedClubId);
      const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
        setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
      });

      const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
      const unsubscribeSeries = onSnapshot(seriesQuery, (snapshot) => {
          const seriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
          setSeries(seriesData);
      });
      
      const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
      const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
          const matchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
          setMatches(matchesData);
      });

      return () => {
          unsubscribeClub();
          unsubscribeSeries();
          unsubscribeMatches();
      }
  }, [selectedClubId]);
  
  // Effect to fetch results based on filters
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setResults([]);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);

    let resultsQuery: Query = collection(firestore, 'results');
    resultsQuery = query(resultsQuery, where('clubId', '==', selectedClubId));

    if (selectedSeriesId) {
      resultsQuery = query(resultsQuery, where('seriesId', '==', selectedSeriesId));
    }
    if (selectedMatchId) {
      resultsQuery = query(resultsQuery, where('matchId', '==', selectedMatchId));
    }

    resultsQuery = query(resultsQuery, orderBy('date', 'desc'), orderBy('position', 'asc'));

    const unsubscribe = onSnapshot(resultsQuery, async (snapshot) => {
      const resultsData = snapshot.docs.map(doc => ({ ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as Result));
      
      // Enrich results with series and match names
      const enriched = resultsData.map(result => {
        const foundSeries = series.find(s => s.id === result.seriesId);
        const foundMatch = matches.find(m => m.id === result.matchId);
        return {
            ...result,
            seriesName: foundSeries?.name || 'N/A',
            matchName: foundMatch?.name || 'N/A',
        };
      });

      setResults(enriched);
      setIsLoading(false);

      // Update Page Title
      if(selectedMatchId) {
          const matchName = matches.find(m => m.id === selectedMatchId)?.name || 'Match';
          setPageTitle(`${matchName} Results`);
      } else if (selectedSeriesId) {
          const seriesName = series.find(s => s.id === selectedSeriesId)?.name || 'Series';
          setPageTitle(`${seriesName} Results`);
      } else {
          setPageTitle(`${clubName} Results`);
      }

    }, (error) => {
      console.error("Error fetching results: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch results. Check Firestore indexes.' });
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [selectedClubId, selectedSeriesId, selectedMatchId, firestore, series, matches, clubName]);

  const renderResultList = () => {
    if (isLoading) {
      return Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
           <TableCell><Skeleton className="h-4 w-16" /></TableCell>
        </TableRow>
      ));
    }

    if (results.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center">
            No results found for the current selection.
          </TableCell>
        </TableRow>
      );
    }

    return results.map((result, index) => (
      <TableRow key={`${result.matchId}-${result.userId}-${index}`}>
        <TableCell>{format(result.date, 'PPP')}</TableCell>
        <TableCell className="font-medium">{result.seriesName}</TableCell>
        <TableCell>{result.userName}</TableCell>
        <TableCell>{result.position || '-'}</TableCell>
        <TableCell>{result.weight.toFixed(3)} kg</TableCell>
        <TableCell>
            <Badge variant={result.status === 'OK' ? 'default' : 'secondary'}>
                {result.status || 'N/A'}
            </Badge>
        </TableCell>
      </TableRow>
    ));
  };
  
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Results</h1>
        <p className="text-muted-foreground">View and export match results.</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
                <CardTitle>{pageTitle}</CardTitle>
                <CardDescription>A list of all results for the selected filters.</CardDescription>
            </div>
             <Button variant="outline" size="sm" disabled={results.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
           <div className="flex flex-wrap items-center gap-4 mb-4">
             {isSiteAdmin && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-filter" className="w-52">
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
            )}
             <div className="flex items-center gap-2">
                <Label htmlFor="series-filter" className="text-nowrap">Series</Label>
                <Select value={selectedSeriesId} onValueChange={(value) => setSelectedSeriesId(value === 'all' ? '' : value)} disabled={series.length === 0}>
                    <SelectTrigger id="series-filter" className="w-52">
                        <SelectValue placeholder="Filter by series..." />
                    </SelectTrigger>
                    <SelectContent>
                         <SelectItem value="all">All Series</SelectItem>
                        {series.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
           </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Angler</TableHead>
                <TableHead>Pos.</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderResultList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}


export default function ResultsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResultsPageComponent />
        </Suspense>
    )
}
