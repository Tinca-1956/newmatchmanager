
'use client';

import { Suspense } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isSameDay, isToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trophy, Calendar, Clock, Sun, Sunset, Users } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import NextImage from 'next/image';
import PublicHeader from '@/components/public-header';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import type { PublicMatch, PublicUpcomingMatch } from '@/lib/types';


const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
};

function PublicDashboardContent() {
    const {
        clubs,
        selectedClubId,
        setSelectedClubId,
        isLoading,
        upcomingMatches,
        lastCompletedMatch
    } = usePublicData();
    
    const recentResults = lastCompletedMatch?.results || [];
    const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'Last completed match';
    const paidPlaces = lastCompletedMatch?.paidPlaces || 0;

    const renderUpcomingMatches = () => {
        if (isLoading) {
            return Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="divide-y">
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-3/4" />
                    </CardContent>
                </Card>
            ));
        }

        if (upcomingMatches.length === 0) {
            return (
                <div className="flex flex-col items-center gap-4 text-center py-12 text-muted-foreground col-span-full">
                    <Calendar className="h-12 w-12" />
                    <p className="font-semibold">No upcoming matches scheduled.</p>
                    <p className="text-sm">Check back later or select a different club.</p>
                </div>
            );
        }

        return upcomingMatches.map(match => {
            const matchDate = (match.date as any).toDate();
            const isMatchToday = isToday(matchDate);

            return (
                <Card key={match.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                             <div>
                                <CardTitle>{match.name}</CardTitle>
                                <CardDescription>{match.seriesName}</CardDescription>
                            </div>
                            <Badge variant={isMatchToday ? "default" : "outline"} className={isMatchToday ? "bg-blue-600 text-white" : ""}>
                                {isMatchToday ? "Today" : format(matchDate, 'EEE, dd MMM')}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm flex-grow">
                        <div className="flex items-center">
                            <MapPin className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{match.location}</span>
                        </div>
                        <div className="flex items-center">
                            <Clock className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span>Draw: {match.drawTime}</span>
                        </div>
                         <div className="flex items-center">
                            <Sun className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span>Start: {match.startTime}</span>
                        </div>
                        <div className="flex items-center">
                            <Sunset className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span>End: {match.endTime}</span>
                        </div>
                    </CardContent>
                </Card>
            )
        });
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

        if (recentResults.length === 0) {
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

        return recentResults.map(result => {
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
        <div className="flex flex-col gap-8 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Public Dashboard</h1>
                    <p className="text-muted-foreground">
                        Upcoming matches and recent results from across the clubs.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                    <Label htmlFor="club-filter" className="text-nowrap">Filter by Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                        <SelectTrigger id="club-filter" className="w-[180px]">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-clubs">All Clubs</SelectItem>
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
                {/* Upcoming Matches Section */}
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-semibold tracking-tight mb-4">Upcoming Matches</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        {renderUpcomingMatches()}
                    </div>
                </div>

                {/* Recent Results Section */}
                <div className="lg:col-span-1">
                     <Card className="flex flex-col h-full">
                        <CardHeader>
                            <CardTitle>Recent Results</CardTitle>
                            {isLoading ? (
                                <Skeleton className="h-5 w-48" />
                            ) : (
                                <CardDescription>{recentResults.length > 0 ? recentResultsTitle : "No completed matches"}</CardDescription>
                            )}
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
        </div>
    );
}


export default function PublicDashboardPage() {
    return (
        <div className="bg-muted/40 min-h-screen">
            <PublicHeader />
            <main>
                <Suspense fallback={<div>Loading...</div>}>
                    <PublicDashboardContent />
                </Suspense>
            </main>
        </div>
    )
}
