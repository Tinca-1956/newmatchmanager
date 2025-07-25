
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
import { collection, query, where, getDocs, orderBy, Timestamp, doc, onSnapshot } from 'firebase/firestore';
import type { Result, Series, User, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';

interface EnrichedResult extends Result {
    seriesName: string;
}

export default function ResultsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [series, setSeries] = useState<Series[]>([]);
  
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [clubName, setClubName] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);

  // Effect to get the user's primary club or all clubs for admin
  useEffect(() => {
    if (adminLoading || !user || !firestore) return;

    const fetchInitialData = async () => {
        setIsLoading(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (isSiteAdmin) {
                const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                setSelectedClubId(userData.primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
            } else {
                setSelectedClubId(userData.primaryClubId || '');
            }
        }
    };

    fetchInitialData();
  }, [user, isSiteAdmin, adminLoading]);

  // Effect to fetch series for the selected club
  useEffect(() => {
      if (!selectedClubId || !firestore) {
        setSeries([]);
        return;
      }
      const seriesQuery = query(collection(firestore, 'series'), where('clubId', '==', selectedClubId));
      const unsubscribe = onSnapshot(seriesQuery, (snapshot) => {
          const seriesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Series));
          setSeries(seriesData);
      });
      return () => unsubscribe();
  }, [selectedClubId]);
  

  // Effect to fetch results for the selected club and series
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setIsLoading(false);
        setResults([]);
        return;
    }

    setIsLoading(true);

    const clubDocRef = doc(firestore, 'clubs', selectedClubId);
    const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
      setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
    });

    let resultsQuery = query(
      collection(firestore, 'results'),
      where('clubId', '==', selectedClubId),
      orderBy('date', 'desc')
    );
    
    if (selectedSeriesId) {
        resultsQuery = query(resultsQuery, where('seriesId', '==', selectedSeriesId));
    }

    const unsubscribeResults = onSnapshot(resultsQuery, async (snapshot) => {
      const resultsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Result));
      
      const enrichedResults = await Promise.all(resultsData.map(async (result) => {
          const foundSeries = series.find(s => s.id === result.seriesId);
          return {
              ...result,
              seriesName: foundSeries?.name || 'N/A',
          };
      }));

      setResults(enrichedResults);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching results: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch results.' });
      setIsLoading(false);
    });

    return () => {
        unsubscribeClub();
        unsubscribeResults();
    };
  }, [selectedClubId, selectedSeriesId, toast, series]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Results</h1>
          <p className="text-muted-foreground">View and export match results.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
                <CardTitle>{clubName} Results</CardTitle>
                <CardDescription>A list of all results for the selected club.</CardDescription>
            </div>
             <Button variant="outline" size="sm" disabled={results.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
           <div className="flex items-center gap-4 mb-4">
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
