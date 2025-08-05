
'use client';

import { useState, useMemo } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, Trophy, CalendarDays, ExternalLink } from 'lucide-react';
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
        setSelectedSeriesId("all"); // Reset series filter when club changes
    };

    const mostRecentMatch = useMemo(() => {
        if (completedMatches.length === 0) return null;
        
        const filteredBySeries = selectedSeriesId === 'all' 
            ? completedMatches
            : completedMatches.filter(m => m.seriesId === selectedSeriesId);
        
        if (filteredBySeries.length === 0) return null;

        return filteredBySeries.sort((a, b) => b.date.seconds - a.date.seconds)[0];
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
        return upcomingMatches.slice(0, 5).map(match => (
            <TableRow key={match.id}>
                <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{format(match.date.toDate(), 'eee, dd MMM')}</span>
                        <span className="text-xs text-muted-foreground">{match.drawTime} Draw</span>
                    </div>
                </TableCell>
                <TableCell>
                     <div>
                        <p className="font-semibold">{match.name}</p>
                        <p className="text-sm text-muted-foreground">{match.seriesName}</p>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <span>{match.location}</span>
                        {match.googleMapsLink && (
                            <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4 text-primary hover:text-primary/80" />
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

        if (!mostRecentMatch) {
            return (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Trophy className="h-8 w-8" />
                            <p>No completed matches found.</p>
                        </div>
                    </TableCell>
                </TableRow>
            );
        }

        return mostRecentMatch.results.slice(0, 10).map((result) => {
             const isPaidPlace = result.position !== null && (mostRecentMatch.paidPlaces || 0) > 0 && result.position <= (mostRecentMatch.paidPlaces || 0);
            return (
                <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
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

    const recentResultsTitle = mostRecentMatch ? `${mostRecentMatch.seriesName} - ${mostRecentMatch.name}` : "Last Completed Match";

    return (
        <div className="min-h-screen bg-muted/40">
             <header className="fixed top-0 left-0 right-0 z-10 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6">
                <h1 className="text-xl font-bold">Public Dashboard</h1>
                <div className="flex items-center gap-2">
                    <Button asChild variant="outline">
                        <Link href="/public/learn-more">Learn More</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/auth/login">Sign In</Link>
                    </Button>
                </div>
            </header>

            <main className="p-4 sm:p-6 pt-20">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Match Information</h2>
                        <p className="text-muted-foreground">View upcoming schedules and recent results from our clubs.</p>
                    </div>
                     <div className="flex flex-col gap-1.5 w-full sm:w-auto">
                        <Label htmlFor="club-filter">Filter by Club</Label>
                        <Select value={selectedClubId} onValueChange={handleClubChange} disabled={isLoading || clubs.length === 0}>
                            <SelectTrigger id="club-filter" className="w-full sm:w-[200px]">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoading ? (
                                    <SelectItem value="loading" disabled>Loading clubs...</SelectItem>
                                ) : (
                                    clubs.map((club) => (
                                        <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Upcoming Matches</CardTitle>
                             <CardDescription>The next 5 matches scheduled for the selected club.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Match</TableHead>
                                        <TableHead>Venue</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>{renderUpcomingMatches()}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{mostRecentMatch ? 'Last Completed Match' : 'Recent Results'}</CardTitle>
                             {isLoading ? (
                                <Skeleton className="h-5 w-48" />
                            ) : (
                                <CardDescription>{recentResultsTitle}</CardDescription>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="series-filter">Filter by Series</Label>
                                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={isLoading || uniqueSeries.length === 0}>
                                    <SelectTrigger id="series-filter">
                                        <SelectValue placeholder="Select series..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Series</SelectItem>
                                        {uniqueSeries.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Pos</TableHead>
                                        <TableHead>Angler</TableHead>
                                        <TableHead>Weight</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>{renderRecentResults()}</TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
