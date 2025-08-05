
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Trophy, Clock, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePublicData } from '@/hooks/use-public-data';
import type { PublicMatch, PublicUpcomingMatch } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

const formatAnglerName = (fullName: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(' ');
    if (parts.length < 2) return fullName;
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    return `${firstName.charAt(0)}. ${lastName}`;
}

const UpcomingMatches = ({ matches, isLoading }: { matches: PublicUpcomingMatch[], isLoading: boolean }) => (
    <Card>
        <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>Open to all members. Register from the main app.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date & Series</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Venue & Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                         Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            </TableRow>
                        ))
                    ) : matches.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                No upcoming matches scheduled.
                            </TableCell>
                        </TableRow>
                    ) : (
                        matches.map(match => (
                            <TableRow key={match.id}>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span>{format(new Date(match.date.seconds * 1000), 'dd/MM/yyyy')}</span>
                                        <span className="text-xs text-muted-foreground">{match.seriesName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{match.name}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <span>{match.location}</span>
                                        <Badge variant="outline">{match.status}</Badge>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const RecentResults = ({ match, isLoading }: { match: PublicMatch | null, isLoading: boolean }) => {
    const resultsTitle = match ? `${match.seriesName} - ${match.name}` : 'Last completed match';

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                {isLoading ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>{match ? resultsTitle : "No completed matches found"}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex-grow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">Pos</TableHead>
                            <TableHead>Angler</TableHead>
                            <TableHead>Weight</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                </TableRow>
                            ))
                        ) : !match ? (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <Trophy className="h-8 w-8" />
                                        <p>No recent results found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            match.results.slice(0, 10).map(result => (
                                <TableRow key={result.userId}>
                                    <TableCell>
                                        <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                                            {result.position || '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{formatAnglerName(result.userName)}</TableCell>
                                    <TableCell className="text-muted-foreground">{result.weight.toFixed(3)}kg</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
             {match && (
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
    );
};

export default function PublicDashboardPage() {
    const { clubs, selectedClubId, setSelectedClubId, isLoading, upcomingMatches, lastCompletedMatch } = usePublicData();

    return (
        <main className="flex min-h-screen w-full flex-col bg-muted/40">
            <div className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
                <h1 className="text-2xl font-bold">Match Manager</h1>
                <div className="ml-auto flex items-center gap-4">
                     <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by club..." />
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
                    <Button asChild>
                        <Link href="/auth/login">Login</Link>
                    </Button>
                </div>
            </div>

            <div className="flex-1 p-4 lg:p-6">
                 <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <UpcomingMatches matches={upcomingMatches} isLoading={isLoading} />
                    </div>
                    <div className="lg:col-span-1">
                        <RecentResults match={lastCompletedMatch} isLoading={isLoading} />
                    </div>
                </div>
            </div>
            <footer className="text-center p-4 text-sm text-muted-foreground border-t">
                Copyright EMANCIUM 2025 - All rights reserved
            </footer>
        </main>
    );
}