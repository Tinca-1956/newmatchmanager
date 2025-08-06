'use client';

import { useState } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, Trophy, Calendar, Users, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function PublicDashboardClient() {
    const {
        clubs,
        selectedClubId,
        setSelectedClubId,
        isLoading,
        upcomingMatches,
        lastCompletedMatch,
    } = usePublicData();
    
    const formatWeight = (weight: number) => {
        if (!weight) return '0.000kg';
        return `${weight.toFixed(3)}kg`;
    };

    const renderUpcomingMatches = () => {
        if (isLoading) {
            return Array.from({ length: 4 }).map((_, i) => (
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
                        <Calendar className="mx-auto h-8 w-8 mb-2" />
                        No upcoming matches scheduled.
                    </TableCell>
                </TableRow>
            );
        }
        return upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell>
                    <div className="font-medium">{format(new Date(match.date.seconds * 1000), 'dd MMM yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{match.drawTime} Draw</div>
                </TableCell>
                <TableCell>
                    <div className="font-medium">{match.name}</div>
                    <div className="text-xs text-muted-foreground">{match.seriesName}</div>
                </TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{match.location}</span>
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
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
            ));
        }
        if (!lastCompletedMatch) {
             return (
                <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        <Trophy className="mx-auto h-8 w-8 mb-2" />
                        No recent results found.
                    </TableCell>
                </TableRow>
            );
        }
        return lastCompletedMatch.results
            .sort((a,b) => (a.position || 999) - (b.position || 999))
            .slice(0, 10) // Show top 10
            .map(result => (
            <TableRow key={result.userId}>
                 <TableCell>
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                        {result.position || '-'}
                    </div>
                </TableCell>
                <TableCell className="font-medium">{result.userName}</TableCell>
                <TableCell>{formatWeight(result.weight)}</TableCell>
            </TableRow>
        ));
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
             <header className="bg-gray-900 text-white p-4 shadow-md sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-xl font-bold">MATCH MANAGER</h1>
                    <Button asChild>
                        <Link href="/auth/login">
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In
                        </Link>
                    </Button>
                </div>
            </header>
             <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
                 <div className="mb-6">
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading}>
                        <SelectTrigger className="w-full sm:w-72">
                            <SelectValue placeholder="Filtering..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all-clubs">All Clubs</SelectItem>
                            {clubs.map(club => (
                                <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Upcoming Matches
                                </div>
                            </CardTitle>
                            <CardDescription>The next few matches across all clubs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
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
                    <Card className="lg:col-span-1">
                        <CardHeader>
                             <CardTitle>
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5" />
                                    Latest Results
                                </div>
                            </CardTitle>
                             {isLoading ? <Skeleton className="h-5 w-48" /> : (
                                <CardDescription>
                                    {lastCompletedMatch ? `${lastCompletedMatch.name} - ${lastCompletedMatch.seriesName}` : 'No recent matches'}
                                </CardDescription>
                             )}
                        </CardHeader>
                        <CardContent>
                             <Table>
                                 <TableHeader>
                                    <TableRow>
                                        <TableHead>Pos</TableHead>
                                        <TableHead>Angler</TableHead>
                                        <TableHead>Weight</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {renderRecentResults()}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Join a Club
                            </div>
                        </CardTitle>
                        <CardDescription>
                            Want to join in? Register an account and apply to a club to get started.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                         <Button asChild>
                            <Link href="/auth/register">
                                Register Now
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
             </main>
        </div>
    )
}
