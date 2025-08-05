
'use client';

import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicData } from '@/hooks/use-public-data';
import { format } from 'date-fns';
import { MapPin, Trophy, Fish } from 'lucide-react';
import type { PublicMatch, PublicUpcomingMatch } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PublicDashboardPage() {
  const {
    clubs,
    selectedClubId,
    setSelectedClubId,
    isLoading,
    upcomingMatches,
    completedMatches,
    uniqueSeries,
    selectedSeriesId,
    setSelectedSeriesId,
  } = usePublicData();

  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    setSelectedSeriesId('all'); // Reset series filter when club changes
  };

  const lastCompletedMatch = useMemo(() => {
    if (completedMatches.length === 0) return null;
    
    const filteredBySeries = selectedSeriesId === 'all' 
      ? completedMatches
      : completedMatches.filter(m => m.seriesId === selectedSeriesId);
    
    // Already sorted by date descending in the hook
    return filteredBySeries.length > 0 ? filteredBySeries[0] : null;

  }, [completedMatches, selectedSeriesId]);

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
          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled for this club.
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map((match: PublicUpcomingMatch) => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span>{format(match.date.toDate(), 'dd/MM/yyyy')}</span>
                <span className="text-xs text-muted-foreground">{match.seriesName}</span>
            </div>
        </TableCell>
        <TableCell className="font-medium">{match.name}</TableCell>
        <TableCell>
             <div className="flex items-center gap-2">
                <span>{match.location}</span>
                {(match as any).googleMapsLink && (
                  <Link href={(match as any).googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
                )}
            </div>
        </TableCell>
      </TableRow>
    ));
  };

  const renderRecentResults = () => {
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

    if (!lastCompletedMatch) {
      return (
        <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Trophy className="h-8 w-8" />
                    <p>No completed match results found.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }
    
    const paidPlaces = (lastCompletedMatch as any).paidPlaces || 0;
    const sortedResults = lastCompletedMatch.results.sort((a,b) => (a.position || 999) - (b.position || 999));

    return sortedResults.map((result: any) => {
        const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
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
                <TableCell className="font-medium">{result.userName}</TableCell>
                <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
                <TableCell>
                    <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
                </TableCell>
            </TableRow>
        );
    });
  };

  const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'Last completed match';

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 sticky top-0 z-10">
            <div className="flex items-center gap-2">
                <Fish className="h-6 w-6 text-primary" />
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Public Dashboard</h1>
            </div>
            <Button asChild>
                <Link href="/auth/login">Sign In</Link>
            </Button>
        </header>

        <div className="flex-grow flex flex-col">
            <main className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-8">
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="club-filter">Club</Label>
                        {isLoading ? (
                            <Skeleton className="h-10 w-48" />
                        ) : (
                            <Select value={selectedClubId} onValueChange={handleClubChange} disabled={clubs.length === 0}>
                                <SelectTrigger id="club-filter" className="w-[180px]">
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
                </div>

                {/* Main Content Grid */}
                <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
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
                                        <TableHead>Venue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {renderUpcomingMatches()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Last Completed Match</CardTitle>
                            <div className="flex flex-wrap items-end gap-4 justify-between">
                                <CardDescription>{isLoading ? <Skeleton className="h-5 w-48" /> : (lastCompletedMatch ? recentResultsTitle : "No completed matches found")}</CardDescription>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="series-filter">Filter by Series</Label>
                                    {isLoading ? <Skeleton className="h-10 w-48"/> : (
                                        <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={uniqueSeries.length === 0}>
                                            <SelectTrigger id="series-filter" className="w-[180px]">
                                                <SelectValue placeholder="Select a series..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Series</SelectItem>
                                                {uniqueSeries.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                            </div>
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
                    </Card>
                </div>
            </div>
            </main>
        </div>
        <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
            Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
