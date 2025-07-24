
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import type { Series, Match, Result, Club, User } from '@/lib/types';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AnglerSeriesResult {
  anglerId: string;
  anglerName: string;
  totalPoints: number;
  matchResults: {
    [matchId: string]: {
      peg?: string;
      weight: number;
      points: number | null;
    };
  };
}

const formatWeightKg = (weight: number | undefined | null): string => {
  if (weight === undefined || weight === null) return '-';
  return weight.toFixed(3);
};

export default function SeriesPointsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const seriesId = params.seriesId as string;

  const [series, setSeries] = useState<Series | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [anglerResults, setAnglerResults] = useState<AnglerSeriesResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!seriesId || !firestore) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Series Details
        const seriesDocRef = doc(firestore, 'series', seriesId);
        const seriesDoc = await getDoc(seriesDocRef);
        if (!seriesDoc.exists()) {
          toast({ variant: 'destructive', title: 'Error', description: 'Series not found.' });
          router.push('/series');
          return;
        }
        const seriesData = { id: seriesDoc.id, ...seriesDoc.data() } as Series;
        setSeries(seriesData);
        
        // Fetch Club Details
        const clubDocRef = doc(firestore, 'clubs', seriesData.clubId);
        const clubDoc = await getDoc(clubDocRef);
        if (clubDoc.exists()) {
          setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
        }

        // Fetch Matches in the Series
        const matchesQuery = query(
          collection(firestore, 'matches'), 
          where('seriesId', '==', seriesId),
          orderBy('date', 'asc')
        );
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate(),
        } as Match));
        setMatches(matchesData);

        if (matchesData.length === 0) {
            setAnglerResults([]);
            setIsLoading(false);
            return;
        }

        // Fetch All Results for all matches in the series
        const matchIds = matchesData.map(m => m.id);
        const resultsQuery = query(collection(firestore, 'results'), where('matchId', 'in', matchIds));
        const resultsSnapshot = await getDocs(resultsQuery);
        const allResults = resultsSnapshot.docs.map(doc => doc.data() as Result);
        
        // Process results
        const processedResults = new Map<string, AnglerSeriesResult>();

        allResults.forEach(result => {
            if (!processedResults.has(result.userId)) {
                processedResults.set(result.userId, {
                    anglerId: result.userId,
                    anglerName: result.userName,
                    totalPoints: 0,
                    matchResults: {},
                });
            }

            const anglerData = processedResults.get(result.userId)!;
            anglerData.matchResults[result.matchId] = {
                peg: result.peg,
                weight: result.weight,
                points: result.points,
            };
        });

        // Calculate total points and sort
        const finalResults: AnglerSeriesResult[] = Array.from(processedResults.values());
        finalResults.forEach(angler => {
            angler.totalPoints = Object.values(angler.matchResults).reduce((acc, curr) => acc + (curr.points || 0), 0);
        });
        
        finalResults.sort((a, b) => a.totalPoints - b.totalPoints);
        
        setAnglerResults(finalResults);

      } catch (error) {
        console.error("Error fetching series points data:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load series points data.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [seriesId, router, toast]);
  
  const renderTableHeader = () => {
    if (isLoading) return <Skeleton className="h-12 w-full" />;
    
    return (
        <TableRow>
            <TableHead className="sticky left-0 bg-background z-10 border-r">Angler</TableHead>
            {matches.map(match => (
                <TableHead key={match.id} className="text-center min-w-48">
                    <p>{match.name}</p>
                    <p className="text-xs font-normal text-muted-foreground">{format(match.date, 'dd MMM')}</p>
                </TableHead>
            ))}
            <TableHead className="text-center sticky right-0 bg-background z-10 border-l">Total Points</TableHead>
        </TableRow>
    );
  };
  
  const renderSubHeader = () => {
     if (isLoading || matches.length === 0) return null;
      return (
        <TableRow className="bg-muted/50">
            <TableHead className="sticky left-0 bg-muted/50 z-10 border-r"></TableHead>
            {matches.map(match => (
                <TableHead key={match.id} className="p-0">
                    <div className="flex">
                        <div className="w-1/3 text-center font-semibold p-2 border-r">Peg</div>
                        <div className="w-1/3 text-center font-semibold p-2 border-r">Weight</div>
                        <div className="w-1/3 text-center font-semibold p-2">Points</div>
                    </div>
                </TableHead>
            ))}
             <TableHead className="sticky right-0 bg-muted/50 z-10 border-l"></TableHead>
        </TableRow>
      )
  };
  
  const renderTableBody = () => {
    if (isLoading) {
        return Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell className="sticky left-0 bg-background z-10 border-r"><Skeleton className="h-5 w-32" /></TableCell>
                {matches.map(match => (
                    <TableCell key={match.id} className="p-0">
                         <div className="flex">
                            <div className="w-1/3 p-2 border-r text-center"><Skeleton className="h-5 w-8 mx-auto" /></div>
                            <div className="w-1/3 p-2 border-r text-center"><Skeleton className="h-5 w-16 mx-auto" /></div>
                            <div className="w-1/3 p-2 text-center"><Skeleton className="h-5 w-8 mx-auto" /></div>
                        </div>
                    </TableCell>
                ))}
                <TableCell className="sticky right-0 bg-background z-10 border-l text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
            </TableRow>
        ));
    }

    if (anglerResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={matches.length + 2} className="h-24 text-center">
            No results found for this series yet.
          </TableCell>
        </TableRow>
      );
    }
    
    return anglerResults.map(angler => (
        <TableRow key={angler.anglerId}>
            <TableCell className="font-medium sticky left-0 bg-background z-10 border-r">{angler.anglerName}</TableCell>
            {matches.map(match => {
                const result = angler.matchResults[match.id];
                return (
                    <TableCell key={match.id} className="p-0">
                       <div className="flex">
                            <div className="w-1/3 p-2 border-r text-center">{result?.peg || '-'}</div>
                            <div className="w-1/3 p-2 border-r text-center">{formatWeightKg(result?.weight)}</div>
                            <div className="w-1/3 p-2 text-center">{result?.points ?? '-'}</div>
                        </div>
                    </TableCell>
                );
            })}
            <TableCell className="font-semibold text-center sticky right-0 bg-background z-10 border-l">{angler.totalPoints}</TableCell>
        </TableRow>
    ));
  }


  return (
    <div className="flex flex-col gap-6">
       <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/series">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-5 w-48" />
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold tracking-tight">
                Series Points: {series?.name}
              </h1>
              <p className="text-muted-foreground">
                {club?.name}
              </p>
            </>
          )}
        </div>
      </div>
       <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader>
                {renderTableHeader()}
                {renderSubHeader()}
              </TableHeader>
              <TableBody>
                {renderTableBody()}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
