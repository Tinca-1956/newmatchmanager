
'use client';

import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trophy, CalendarDays, BarChart3, Users } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}

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
        if (completedMatches.length === 0) return null;

        if (selectedSeriesId) {
            return completedMatches.find(m => m.seriesId === selectedSeriesId) || null;
        }
        
        return completedMatches[0];
    }, [completedMatches, selectedSeriesId]);

    const renderUpcomingMatches = () => {
        if (isLoading) {
            return Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell colSpan={3}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
            ));
        }
        if (upcomingMatches.length === 0) {
            return (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        No upcoming matches for this club.
                    </TableCell>
                </TableRow>
            );
        }
        return upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell>
                    <p className="font-medium">{match.name}</p>
                    <p className="text-xs text-muted-foreground">{match.seriesName}</p>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        {match.location}
                        {match.googleMapsLink && (
                            <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                            </Link>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-right">{format(new Date(match.date.seconds * 1000), 'dd/MM/yyyy')}</TableCell>
            </TableRow>
        ));
    };

    const renderRecentResults = () => {
        if (isLoading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
            ));
        }

        if (!lastCompletedMatch) {
            return (
                <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Trophy className="h-8 w-8" />
                            <p>No completed matches found for this selection.</p>
                        </div>
                    </TableCell>
                </TableRow>
            );
        }

        const paidPlaces = 3; // Placeholder, as this isn't in public data yet

        return lastCompletedMatch.results
            .sort((a, b) => (a.position || 999) - (b.position || 999))
            .map(result => {
                const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
                return (
                    <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
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
                );
            });
    };

    return (
        <main className="flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome! View public match information here.
                    </p>
                </div>
                <div className="flex flex-col gap-1.5 w-full md:w-auto">
                    <Label htmlFor="club-select">Select Club</Label>
                     {isLoading ? <Skeleton className="h-10 w-full md:w-48" /> : (
                        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger id="club-select" className="w-full md:w-48">
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                     )}
                </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 pt-6">
                {/* Upcoming Matches Card */}
                <Card className="xl:col-span-3">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><CalendarDays /> Upcoming Matches</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Match</TableHead>
                                    <TableHead>Venue</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>{renderUpcomingMatches()}</TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Recent Results Card */}
                <Card className="xl:col-span-2 flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy /> Last Completed Match</CardTitle>
                        {isLoading ? <Skeleton className="h-5 w-48" /> : (
                            <CardDescription>{lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'No completed matches found'}</CardDescription>
                        )}
                        <div className="pt-2">
                             <Label htmlFor="series-filter" className="text-xs">Filter by Series</Label>
                            {isLoading ? <Skeleton className="h-10 w-full" /> : (
                                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId}>
                                    <SelectTrigger id="series-filter">
                                        <SelectValue placeholder="All Recent Series" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Recent Series</SelectItem>
                                        {uniqueSeries.map(series => (
                                            <SelectItem key={series.id} value={series.id}>{series.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
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
                            <TableBody>{renderRecentResults()}</TableBody>
                        </Table>
                    </CardContent>
                    {lastCompletedMatch && (
                        <CardFooter>
                           <p className="text-xs text-muted-foreground">Results from {format(new Date(lastCompletedMatch.date.seconds * 1000), 'PPP')}</p>
                        </CardFooter>
                    )}
                </Card>
            </div>
            <footer className="text-center p-4 mt-6 text-sm text-muted-foreground border-t">
                Copyright EMANCIUM 2025 - All rights reserved
            </footer>
        </main>
    );
}
