
'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ArrowRight, Trophy, Image as ImageIcon, Fish } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Link from 'next/link';

function DashboardSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
            <header className="flex h-16 items-center justify-between border-b bg-black text-white px-4 md:px-6">
                <div className="flex items-center gap-2">
                    <Fish className="h-6 w-6" />
                    <h1 className="text-lg font-semibold">MATCH MANAGER - PUBLIC DASHBOARD</h1>
                </div>
                 <Skeleton className="h-10 w-28" />
            </header>
            <main className="flex-1 p-4 md:p-8 space-y-8">
                <div className="flex justify-end">
                    <div className="w-64">
                         <Skeleton className="h-4 w-24 mb-2" />
                         <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                             <Skeleton className="h-7 w-40" />
                            <Skeleton className="h-4 w-52" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}

function formatAnglerName(fullName: string) {
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
        lastCompletedMatch 
    } = usePublicData();

    if (isLoading) {
        return <DashboardSkeleton />;
    }
    
    const recentResults = lastCompletedMatch?.results
        .sort((a,b) => (a.position || 999) - (b.position || 999)) || [];

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
            <header className="flex h-16 shrink-0 items-center justify-between border-b bg-black text-white px-4 md:px-6">
                 <div className="flex items-center gap-2">
                    <Fish className="h-6 w-6" />
                    <h1 className="text-lg font-semibold tracking-wider">MATCH MANAGER - PUBLIC DASHBOARD</h1>
                </div>
                <Button asChild>
                    <Link href="/auth/login">
                        Sign In
                    </Link>
                </Button>
            </header>
            <main className="flex-1 p-4 md:p-8 space-y-8">
                <div className="flex justify-end">
                    <div className="w-64">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Filter by Club</label>
                        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a club..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-clubs">All Clubs</SelectItem>
                                {clubs.map(club => (
                                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Upcoming Matches</CardTitle>
                            <CardDescription>The next few matches across all clubs.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Match</TableHead>
                                        <TableHead>Club</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {upcomingMatches.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                                No upcoming matches scheduled.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        upcomingMatches.slice(0, 5).map(match => (
                                            <TableRow key={match.id}>
                                                <TableCell>{format(match.date.toDate(), 'eee, dd MMM')}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{match.name}</div>
                                                    <div className="text-sm text-muted-foreground">{match.seriesName}</div>
                                                </TableCell>
                                                <TableCell>{clubs.find(c => c.id === match.clubId)?.name || 'Unknown'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Recent Results</CardTitle>
                            <CardDescription>
                                {lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : "No completed matches found."}
                            </CardDescription>
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
                                    {recentResults.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <Trophy className="h-8 w-8" />
                                                    <p>No recent results found.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        recentResults.map(result => (
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
                                        ))
                                    )}
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
        </div>
    );
}
