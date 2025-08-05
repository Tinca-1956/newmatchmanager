
'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { usePublicData } from '@/hooks/use-public-data';
import { format } from 'date-fns';
import { Trophy, Fish, ArrowRight } from 'lucide-react';
import Link from 'next/link';

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

    const lastCompletedMatch = useMemo(() => {
        if (!selectedClubId) return null;

        const filtered = completedMatches.filter(m => 
            m.clubId === selectedClubId && 
            (selectedSeriesId === 'all' || m.seriesId === selectedSeriesId)
        );

        return filtered.length > 0 ? filtered[0] : null;
    }, [completedMatches, selectedClubId, selectedSeriesId]);

    const renderUpcomingMatches = () => {
        if (isLoading) {
        return Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
        ));
        }

        if (upcomingMatches.length === 0) {
        return (
            <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No upcoming matches scheduled for this club.
            </TableCell>
            </TableRow>
        );
        }

        return upcomingMatches.map(match => (
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
                    <div>
                        <span>{match.location}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right">
                <Button asChild variant="ghost" size="icon">
                    <Link href="/auth/login">
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
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

        if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Trophy className="h-8 w-8" />
                            <p>No recent results found.</p>
                        </div>
                    </TableCell>
                </TableRow>
            );
        }
        
        const sortedResults = [...lastCompletedMatch.results].sort((a,b) => (a.position || 999) - (b.position || 999));

        return sortedResults.map(result => {
            return (
                <TableRow key={result.userId}>
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
    
    const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'No completed matches'

  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2">
                 <Fish className="h-6 w-6" />
                <h1 className="text-xl font-bold tracking-tight">Public Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
                 <Button asChild variant="outline">
                    <Link href="/public/learn-more">
                        Learn More
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/auth/login">
                        Sign In
                    </Link>
                </Button>
            </div>
        </header>

        <main className="flex-1 space-y-8 p-4 md:p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                 <h2 className="text-2xl font-bold tracking-tight">Club Information</h2>
                <div className="flex items-center gap-2">
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading || clubs.length === 0}>
                        <SelectTrigger className="w-full md:w-[280px]">
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

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Upcoming Matches</CardTitle>
                        <CardDescription>The next few matches scheduled for this club.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date &amp; Series</TableHead>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Venue</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
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
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                             <div>
                                <CardTitle>Last Completed Match</CardTitle>
                                {isLoading ? (
                                    <Skeleton className="h-5 w-48 mt-1" />
                                ) : (
                                    <CardDescription>{recentResultsTitle}</CardDescription>
                                )}
                            </div>
                            <div className="w-full sm:w-auto">
                                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={isLoading || uniqueSeries.length === 0}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter by series..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Series</SelectItem>
                                        {uniqueSeries.map((series) => (
                                            <SelectItem key={series.id} value={series.id}>
                                                {series.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                     {lastCompletedMatch && (
                        <CardFooter>
                            <Button asChild variant="outline" className="w-full">
                                <Link href="/auth/login">
                                    Login for More Details
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            </div>
        </main>
         <footer className="text-center p-4 text-sm text-muted-foreground border-t">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
