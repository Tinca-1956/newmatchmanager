'use client';

import { useState, useMemo } from 'react';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight, Trophy, Users, Globe, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export default function DashboardClient() {
    const {
        clubs,
        selectedClubId,
        setSelectedClubId,
        isLoading,
        upcomingMatches,
        lastCompletedMatch,
    } = usePublicData();
    const router = useRouter();

    const handleGoToMatch = (matchId: string) => {
        router.push(`/main/matches?matchId=${matchId}`);
    };
    
    const formatAnglerName = (fullName: string) => {
        if (!fullName) return '';
        const parts = fullName.trim().split(' ');
        if (parts.length < 2) return fullName;
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || '';
        return `${firstName.charAt(0)}. ${lastName}`;
    }

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
                        No upcoming matches scheduled for this selection.
                    </TableCell>
                </TableRow>
            );
        }

        return upcomingMatches.map(match => (
            <TableRow key={match.id}>
                <TableCell>
                    <div className="flex flex-col">
                        <span>{format(new Date(match.date.seconds * 1000), 'dd/MM/yyyy')}</span>
                        <span className="text-xs text-muted-foreground">{match.seriesName}</span>
                    </div>
                </TableCell>
                <TableCell className="font-medium">{match.name.includes("Round") ? `${match.name} at ${match.location}` : match.name}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
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
                            <p>No recent results found for this selection.</p>
                        </div>
                    </TableCell>
                </TableRow>
            );
        }

        return lastCompletedMatch.results
            .sort((a,b) => (a.position || 999) - (b.position || 999))
            .map(result => {
                return (
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
                );
            });
    };
    
    const recentResultsTitle = useMemo(() => {
        if (!lastCompletedMatch) return "No completed matches";
        const { seriesName, name } = lastCompletedMatch;
        return seriesName && name ? `${seriesName} - ${name}` : 'Last completed match';
    }, [lastCompletedMatch]);

    return (
      <div className="bg-muted/40 min-h-screen">
          {/* Header */}
          <header className="bg-sidebar text-sidebar-foreground">
              <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                      <div className="flex items-center gap-2">
                           <Globe className="h-6 w-6" />
                           <h1 className="text-xl font-bold">MATCH MANAGER - PUBLIC DASHBOARD</h1>
                      </div>
                      <Button asChild>
                          <Link href="/auth/login">
                              <Users className="mr-2 h-4 w-4" />
                              Club Login
                          </Link>
                      </Button>
                  </div>
              </div>
          </header>

          <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
               {/* Filter Section */}
              <div className="flex items-center gap-4">
                  <h2 className="text-lg font-semibold whitespace-nowrap">Filter by Club:</h2>
                   <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={isLoading || clubs.length === 0}>
                        <SelectTrigger className="w-full max-w-xs">
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


              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                  <Card className="lg:col-span-1">
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
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {renderUpcomingMatches()}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>

                   <Card className="flex flex-col lg:col-span-1">
                      <CardHeader>
                          <CardTitle>Recent Results</CardTitle>
                          {isLoading ? (
                              <Skeleton className="h-5 w-48" />
                          ) : (
                              <CardDescription>{recentResultsTitle}</CardDescription>
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
          </main>
           <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border mt-8">
                Copyright EMANCIUM 2025 - All rights reserved
            </footer>
      </div>
  );
}
