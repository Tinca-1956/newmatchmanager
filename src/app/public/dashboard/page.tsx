
'use client';

import { useState, useMemo } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import { Timestamp } from 'firebase/firestore';
import { MapPin, Trophy } from 'lucide-react';
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

    const filteredCompletedMatches = useMemo(() => {
        if (!selectedSeriesId || selectedSeriesId === 'all') {
            return completedMatches;
        }
        return completedMatches.filter(m => m.seriesId === selectedSeriesId);
    }, [completedMatches, selectedSeriesId]);
    
    const lastCompletedMatch = useMemo(() => {
        return filteredCompletedMatches.length > 0 ? filteredCompletedMatches[0] : null;
    }, [filteredCompletedMatches]);


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
                    <TableCell colSpan={3} className="h-24 text-center">
                        No upcoming matches scheduled for this club.
                    </TableCell>
                </TableRow>
            );
        }

        return upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell>
                     <div className="font-medium">{match.name}</div>
                     <div className="text-sm text-muted-foreground">{match.seriesName}</div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <span>{match.location}</span>
                        {match.googleMapsLink && (
                            <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-4 w-4 text-primary" />
                            </Link>
                        )}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    {format(new Date((match.date as Timestamp).seconds * 1000), 'PPP')}
                </TableCell>
            </TableRow>
        ));
    };
    
    const renderLastCompletedMatch = () => {
        if (isLoading) {
            return (
                 <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            )
        }
        
        if (!lastCompletedMatch) {
            return (
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                           <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Trophy className="h-8 w-8" />
                                <p>No completed matches found.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            )
        }

        const paidPlaces = 0; // Public matches don't contain this field, default to 0
        const sortedResults = lastCompletedMatch.results.sort((a, b) => (a.position || 999) - (b.position || 999));

        return (
            <TableBody>
                {sortedResults.map(result => {
                    const isPaidPlace = result.position !== null && paidPlaces > 0 && result.position <= paidPlaces;
                    return (
                        <TableRow key={result.userId} className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}>
                             <TableCell>
                                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                                    {result.position || '-'}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">{result.userName}</TableCell>
                            <TableCell>{result.weight.toFixed(3)}kg</TableCell>
                            <TableCell>
                                <Badge variant={result.status === 'OK' ? 'outline' : 'secondary'}>{result.status}</Badge>
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
        )
    }

    return (
        <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Match Manager</h1>
                <p className="text-lg text-muted-foreground">Public Dashboard</p>
            </div>
            
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1.5">
                    <Label htmlFor="club-filter">Viewing Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-filter" className="w-full sm:w-[280px]">
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Matches</CardTitle>
                            <CardDescription>The next 5 scheduled matches for the selected club.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Match</TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {renderUpcomingMatches()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                         <CardHeader>
                            <CardTitle>Last Completed Match</CardTitle>
                             {isLoading ? (
                                <Skeleton className="h-5 w-48" />
                            ) : (
                                <CardDescription>{lastCompletedMatch?.name || 'No recent match'}</CardDescription>
                            )}
                            
                            <div className="flex flex-col gap-1.5 pt-2">
                                <Label htmlFor="series-filter">Filter by Series</Label>
                                <Select value={selectedSeriesId} onValueChange={setSelectedSeriesId} disabled={uniqueSeries.length === 0}>
                                    <SelectTrigger id="series-filter" className="w-full">
                                        <SelectValue placeholder="All Series..." />
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
                               {renderLastCompletedMatch()}
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
