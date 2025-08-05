'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, ArrowRight, Trophy } from 'lucide-react';
import { usePublicData } from '@/hooks/use-public-data';
import type { PublicResult } from '@/lib/types';

// Helper to format names consistently
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

    const recentResults = useMemo(() => {
      if (!lastCompletedMatch?.results) return [];
      
      const sorted = [...lastCompletedMatch.results].sort((a, b) => (a.position || 999) - (b.position || 999));
      return sorted;

    }, [lastCompletedMatch]);

    const renderUpcomingMatches = () => {
        if (isLoading) {
            return (
                <TableBody>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell className="w-1/4"><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell className="w-1/2"><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell className="w-1/4"><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            );
        }

        if (upcomingMatches.length === 0) {
            return (
                 <TableBody>
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            No upcoming matches found for the selected club.
                        </TableCell>
                    </TableRow>
                </TableBody>
            );
        }

        return (
            <TableBody>
                {upcomingMatches.map((match) => (
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
                            </div>
                        </TableCell>
                         <TableCell className="text-right">
                             <Button variant="ghost" size="icon" asChild>
                                <Link href="/auth/login">
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        );
    };

    const renderRecentResults = () => {
        if (isLoading) {
            return (
                <TableBody>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            );
        }

        if (recentResults.length === 0) {
            return (
                <TableBody>
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                <Trophy className="h-8 w-8" />
                                <p>No recent results found.</p>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableBody>
            );
        }

        return (
            <TableBody>
                {recentResults.map((result: PublicResult) => (
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
                ))}
            </TableBody>
        );
    }
    
  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-sm z-10 border-b">
          <div className="container mx-auto flex items-center justify-between h-16 px-4 md:px-6">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">Public Dashboard</h1>
               <div className="flex items-center gap-2">
                  <Button variant="outline" asChild>
                    <Link href="/public/learn-more">Learn More</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
               </div>
          </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8 pt-24">
         <div className="space-y-8">
            <div>
                 <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                    <SelectTrigger className="w-full md:w-72">
                        <SelectValue placeholder="Select a club..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-clubs">All Clubs</SelectItem>
                        {clubs.map(club => (
                            <SelectItem key={club.id} value={club.id}>
                                {club.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
              {/* Upcoming Matches */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Upcoming Matches</CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Series</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Venue</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    {renderUpcomingMatches()}
                  </Table>
                </CardContent>
              </Card>

              {/* Last Completed Match */}
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle>Last Completed Match</CardTitle>
                   {isLoading ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>
                        {lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : "No completed matches found"}
                    </CardDescription>
                )}
                </CardHeader>
                <CardContent className="p-0 flex-grow">
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">Pos</TableHead>
                                <TableHead>Angler</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        {renderRecentResults()}
                    </Table>
                </CardContent>
                {lastCompletedMatch && (
                    <CardFooter className="pt-6">
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
      </main>
    </>
  );
}
