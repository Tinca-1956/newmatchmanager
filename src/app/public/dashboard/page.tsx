
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePublicData } from '@/hooks/use-public-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, LogIn, Trophy, Image as ImageIcon, ArrowRight } from 'lucide-react';
import NextImage from 'next/image';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function PublicDashboardPageContent() {
  const {
    clubs,
    selectedClubId,
    setSelectedClubId,
    isLoading,
    upcomingMatches,
    lastCompletedMatch,
  } = usePublicData();
  
  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId === 'all-clubs' ? '' : clubId);
  };

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return (
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
              <TableCell><Skeleton className="h-4 w-full" /></TableCell>
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
              No upcoming matches found {selectedClubId ? 'for this club' : ''}.
            </TableCell>
          </TableRow>
        </TableBody>
      );
    }

    return (
      <TableBody>
        {upcomingMatches.map(match => (
          <TableRow key={match.id}>
            <TableCell>
                <div className="flex flex-col">
                    <span>{format(match.date.toDate(), 'dd/MM/yyyy')}</span>
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
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" asChild>
                              <Link href="/auth/login">
                                  <ArrowRight className="h-4 w-4" />
                              </Link>
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Sign in to register</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
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

    if (!lastCompletedMatch || lastCompletedMatch.results.length === 0) {
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
    
    // Sort results by position before rendering
    const sortedResults = [...lastCompletedMatch.results].sort((a, b) => (a.position || 999) - (b.position || 999));

    return (
        <TableBody>
            {sortedResults.map(result => (
                <TableRow key={result.userId}>
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
            ))}
        </TableBody>
    );
  };

  const recentResultsTitle = lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'Last completed match'

  const renderImageGallery = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-full min-h-[400px]" />
    }
    
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                 <p className="text-xs text-muted-foreground">The club administrator can upload photos from the matches page.</p>
            </div>
        )
    }

    return (
      <Carousel
        opts={{
            align: "start",
            loop: true,
        }}
         className="w-full"
      >
        <CarouselContent className="-ml-1">
          {lastCompletedMatch.mediaUrls.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-video w-full">
                <NextImage
                  src={url}
                  alt={`Recent match image ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  style={{ objectFit: 'contain' }}
                  className="rounded-md"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  }

  return (
    <>
       <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
         <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
            <h1 className="text-2xl font-bold tracking-tight">Public Dashboard</h1>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                  <Link href="/public/learn-more">Learn More</Link>
              </Button>
              <Button asChild>
                  <Link href="/auth/login">Sign In</Link>
              </Button>
            </div>
          </div>
       </header>
      
      <main className="container mx-auto px-4 md:px-6 py-24">
        <div className="space-y-8">
            <div className="flex flex-col gap-1.5 w-[240px]">
                <Label htmlFor="club-filter">Filter by Club</Label>
                <Select 
                  value={selectedClubId || 'all-clubs'}
                  onValueChange={handleClubChange}
                  disabled={isLoading}
                >
                    <SelectTrigger id="club-filter">
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
          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
            {/* Upcoming Matches */}
            <Card className="flex flex-col">
              <CardHeader>
                  <CardTitle>Upcoming Matches</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Date &amp; Series</TableHead>
                              <TableHead>Match</TableHead>
                              <TableHead>Venue</TableHead>
                              <TableHead><span className="sr-only">Actions</span></TableHead>
                          </TableRow>
                      </TableHeader>
                       {renderUpcomingMatches()}
                  </Table>
              </CardContent>
            </Card>

            {/* Recent Results */}
             <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Recent Results</CardTitle>
                    {isLoading ? (
                        <Skeleton className="h-5 w-48" />
                    ) : (
                        <CardDescription>{!lastCompletedMatch ? "No completed matches found" : recentResultsTitle}</CardDescription>
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
                        {renderRecentResults()}
                    </Table>
                </CardContent>
            </Card>
          </div>
          
          {/* Image Gallery */}
          <Card className="w-full">
            <CardHeader>
                <CardTitle>Match Gallery</CardTitle>
                 {isLoading ? (
                    <Skeleton className="h-5 w-48" />
                ) : (
                    <CardDescription>
                        {lastCompletedMatch && lastCompletedMatch.mediaUrls && lastCompletedMatch.mediaUrls.length > 0 
                            ? `Photos from ${lastCompletedMatch.name}`
                            : 'No recent photos'
                        }
                    </CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex items-center justify-center">
                 {renderImageGallery()}
            </CardContent>
          </Card>

        </div>
      </main>
    </>
  );
}


export default function PublicDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PublicDashboardPageContent />
        </Suspense>
    )
}
