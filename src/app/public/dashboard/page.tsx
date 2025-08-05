'use client';

import { useState, useEffect, useMemo } from 'react';
import { firestore } from '@/lib/firebase-client';
import { collection, query, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Trophy, Fish } from 'lucide-react';
import type { PublicMatch as Match, PublicResult as Result } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

// Redefined here to avoid dependency issues on a purely public component.
interface PublicMatch {
  id: string;
  clubId: string;
  clubName: string;
  seriesId: string;
  seriesName: string;
  name: string;
  location: string;
  date: Timestamp;
  status: string;
  results: PublicResult[];
}

interface PublicResult {
  userId: string;
  userName: string;
  peg: string;
  section: string;
  weight: number;
  status: string;
  position: number | null;
  sectionRank: number | null;
}


const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}


export default function PublicDashboardPage() {
  const [allMatches, setAllMatches] = useState<PublicMatch[]>([]);
  const [seriesList, setSeriesList] = useState<{ id: string, name: string }[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!firestore) {
      setIsLoading(false);
      return;
    }

    const matchesQuery = query(
        collection(firestore, 'publicMatches'),
        orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
        const matchesData = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        } as PublicMatch));
        
        setAllMatches(matchesData);

        // Create unique list of series from all matches
        const uniqueSeries = new Map<string, string>();
        matchesData.forEach(m => {
            if (!uniqueSeries.has(m.seriesId)) {
                uniqueSeries.set(m.seriesId, m.seriesName);
            }
        });
        const seriesData = Array.from(uniqueSeries, ([id, name]) => ({ id, name }));
        setSeriesList(seriesData);

        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching public matches:", error);
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const lastCompletedMatch = useMemo(() => {
    if (selectedSeriesId === 'all') {
        return allMatches.length > 0 ? allMatches[0] : null;
    }
    return allMatches.find(m => m.seriesId === selectedSeriesId) || null;
  }, [allMatches, selectedSeriesId]);

  const renderResults = () => {
    if (isLoading) {
        return Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
            </TableRow>
        ));
    }

    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
      return (
        <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Trophy className="h-8 w-8" />
                    <p>No results found for this selection.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }

    const sortedResults = lastCompletedMatch.results.sort((a, b) => (a.position || 999) - (b.position || 999));

    return sortedResults.map((result: PublicResult) => (
      <TableRow key={result.userId}>
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
    ));
  };


  return (
    <main className="bg-muted/40 min-h-screen p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
             <div className="flex items-center gap-4 mb-6">
                <Fish className="h-10 w-10 text-primary" />
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">Latest match results from across our clubs.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                             <CardTitle>Last Completed Match</CardTitle>
                            {isLoading ? (
                                <Skeleton className="h-5 w-48 mt-2" />
                            ) : (
                                <CardDescription>
                                    {lastCompletedMatch ? `${lastCompletedMatch.clubName} - ${lastCompletedMatch.name}` : 'No completed matches found'}
                                </CardDescription>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                            <Label htmlFor="series-filter">Filter by Series</Label>
                            <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={isLoading || seriesList.length === 0}>
                                <SelectTrigger id="series-filter" className="w-full sm:w-[200px]">
                                    <SelectValue placeholder="Select a series..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Series</SelectItem>
                                    {seriesList.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
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
                            {renderResults()}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <footer className="text-center p-4 text-sm text-muted-foreground mt-8">
                Copyright EMANCIUM 2025 - All rights reserved
            </footer>
        </div>
    </main>
  );
}