
'use client';

import { useState, useEffect } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Trophy as TrophyIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { PublicResult } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';


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
    lastCompletedMatch,
  } = usePublicData();
  
  const [sortedResults, setSortedResults] = useState<PublicResult[]>([]);

  useEffect(() => {
    if (lastCompletedMatch?.results) {
        const sorted = [...lastCompletedMatch.results].sort((a, b) => (a.position || 999) - (b.position || 999));
        setSortedResults(sorted);
    } else {
        setSortedResults([]);
    }
  }, [lastCompletedMatch]);


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
            No upcoming matches found for the selected club.
          </TableCell>
        </TableRow>
      );
    }

    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="flex flex-col">
                <span>{format((match.date as Timestamp).toDate(), 'dd/MM/yyyy')}</span>
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
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button asChild variant="ghost" size="icon">
                            <Link href="/auth/login">
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Login to register</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
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

    if (sortedResults.length === 0) {
      return (
        <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <TrophyIcon className="h-8 w-8" />
                    <p>No recent results found.</p>
                </div>
            </TableCell>
        </TableRow>
      );
    }
    
    const paidPlaces = 0; // Public view doesn't show payouts

    return sortedResults.map(result => {
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
  
  const recentResultsTitle = lastCompletedMatch?.seriesName && lastCompletedMatch?.name 
    ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` 
    : 'Last completed match'

  return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-2">
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
                                <TableHead><span className="sr-only">Actions</span></TableHead>
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
                    <CardTitle>Recent Results</CardTitle>
                    {isLoading ? (
                        <Skeleton className="h-5 w-48" />
                    ) : (
                        <CardDescription>{sortedResults.length > 0 ? recentResultsTitle : "No completed matches"}</CardDescription>
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
    </div>
  );
}
