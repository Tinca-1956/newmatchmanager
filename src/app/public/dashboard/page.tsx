
'use client';

import { usePublicData } from '@/hooks/use-public-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, LogIn, Trophy, User as UserIcon, Calendar, Info, Image as ImageIcon } from 'lucide-react';
import NextImage from 'next/image';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"

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
  
  const handleClubChange = (clubId: string) => {
    if (clubId === 'all') {
      setSelectedClubId('');
    } else {
      setSelectedClubId(clubId);
    }
  };

  const renderUpcomingMatches = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
        </TableRow>
      ));
    }
    if (!upcomingMatches.length) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
            No upcoming matches scheduled.
          </TableCell>
        </TableRow>
      );
    }
    return upcomingMatches.map(match => (
      <TableRow key={match.id}>
        <TableCell>
            <div className="font-medium">{format((match.date as Timestamp).toDate(), 'dd MMM yyyy')}</div>
            <div className="text-sm text-muted-foreground">{match.seriesName}</div>
        </TableCell>
        <TableCell>{match.name}</TableCell>
        <TableCell>{match.location}</TableCell>
        <TableCell className="text-right">
             <Button variant="ghost" size="icon" asChild>
                <Link href="/auth/login">
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </Button>
        </TableCell>
      </TableRow>
    ));
  };
  
  const renderLastCompletedMatch = () => {
      if (isLoading) {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Pos</TableHead>
                        <TableHead>Angler</TableHead>
                        <TableHead>Weight</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        );
      }

      if (!lastCompletedMatch) {
          return (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-4">
                <Trophy className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No completed matches found.</p>
                <p className="text-xs text-muted-foreground">Check back later for results.</p>
            </div>
          )
      }
      
      const sortedResults = [...lastCompletedMatch.results].sort((a,b) => (a.position || 999) - (b.position || 999));

      return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Angler</TableHead>
                    <TableHead>Weight</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedResults.slice(0, 10).map(result => (
                    <TableRow key={result.userId}>
                        <TableCell>
                             <div className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                                {result.position || '-'}
                            </div>
                        </TableCell>
                        <TableCell>{formatAnglerName(result.userName)}</TableCell>
                        <TableCell>{result.weight.toFixed(3)}kg</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
      )
  }

  const renderImageGallery = () => {
    if (isLoading) {
        return <Skeleton className="w-full h-full min-h-[300px]" />
    }
    if (!lastCompletedMatch || !lastCompletedMatch.mediaUrls || lastCompletedMatch.mediaUrls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-4 border border-dashed rounded-lg bg-muted/50">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">No photos from the last match.</p>
                 <p className="text-xs text-muted-foreground">Club admins can upload photos from the matches page.</p>
            </div>
        )
    }
    return (
      <Carousel
        opts={{
            align: "start",
            loop: true,
        }}
         className="w-full max-w-4xl mx-auto"
      >
        <CarouselContent className="-ml-1 h-80">
          {lastCompletedMatch.mediaUrls.map((url, index) => (
            <CarouselItem key={index} className="pl-1">
              <div className="relative aspect-video w-full h-full">
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
      <header className="fixed top-0 left-0 right-0 z-10 bg-card/80 backdrop-blur-sm border-b">
        <div className="container mx-auto h-16 flex items-center justify-between px-4 md:px-6">
            <h1 className="text-xl font-bold tracking-tight">Public Dashboard</h1>
            <div className="flex items-center gap-2">
                 <Button variant="outline" asChild>
                    <Link href="/public/learn-more">
                        <Info className="mr-2 h-4 w-4" />
                        Learn More
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/auth/login">
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In
                    </Link>
                </Button>
            </div>
        </div>
      </header>

      <main className="container mx-auto pt-20 pb-10 px-4 md:px-6">
        <div className="space-y-8">
            <div className="p-4 border rounded-lg bg-card">
              <Select onValueChange={handleClubChange} value={selectedClubId}>
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue placeholder="Select a club to view..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clubs</SelectItem>
                  {clubs.map(club => (
                    <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Upcoming Matches</CardTitle>
                        <CardDescription>The next few matches on the calendar.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {renderUpcomingMatches()}
                    </CardContent>
                </Card>
                
                 <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Last Completed Match</CardTitle>
                        {isLoading ? <Skeleton className="h-5 w-48" /> : (
                            <CardDescription>
                                {lastCompletedMatch ? `${lastCompletedMatch.seriesName} - ${lastCompletedMatch.name}` : 'No recent matches found'}
                            </CardDescription>
                        )}
                    </CardHeader>
                    <CardContent className="flex-grow">
                        {renderLastCompletedMatch()}
                    </CardContent>
                    <CardFooter>
                        <p className="text-xs text-muted-foreground">Showing top 10 results. Log in for full details.</p>
                    </CardFooter>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Match Gallery</CardTitle>
                    <CardDescription>Photos from the most recently completed match.</CardDescription>
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
