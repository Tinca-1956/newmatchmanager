
'use client';

import { useState, useEffect, Suspense } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, Club } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { MapPin, LogIn, MoreVertical } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function PublicDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clubIdFilter = searchParams.get('clubId');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [isLoadingClubs, setIsLoadingClubs] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [lastCompletedMatch, setLastCompletedMatch] = useState<Match | null>(null);

  const [hasMounted, setHasMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch clubs
  useEffect(() => {
    if (!firestore) {
      setIsLoadingClubs(false);
      return;
    };
    const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
    const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
      const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
      setClubs(clubsData);
      if (clubIdFilter) {
          setSelectedClubId(clubIdFilter);
      } else if (clubsData.length > 0) {
        setSelectedClubId(clubsData[0].id);
      }
      setIsLoadingClubs(false);
    }, (error) => {
      console.error("Error fetching clubs:", error);
      setIsLoadingClubs(false);
    });
    return () => unsubscribe();
  }, [clubIdFilter]);

  // Fetch matches for selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setMatches([]);
      setLastCompletedMatch(null);
      return;
    }

    setIsLoadingMatches(true);
    const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
    const unsubscribe = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => {
        const data = doc.data();
        let date = data.date;
        if (date instanceof Timestamp) {
          date = date.toDate();
        }
        return {
          id: doc.id,
          ...data,
          date,
        } as Match;
      });

      const upcoming = matchesData
        .filter(m => m.status !== 'Completed' && m.status !== 'Cancelled')
        .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

      const completed = matchesData
        .filter(m => m.status === 'Completed')
        .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

      setMatches(upcoming);
      setLastCompletedMatch(completed.length > 0 ? completed[0] : null);
      setIsLoadingMatches(false);
    }, (error) => {
      console.error("Error fetching match data for this club:", error);
      setIsLoadingMatches(false);
    });
    return () => unsubscribe();
  }, [selectedClubId]);
  
  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    router.push(`/public/dashboard?clubId=${clubId}`);
  };

  const renderUpcomingMatch = (match: Match) => (
      <Card key={match.id}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{match.name}</CardTitle>
              <CardDescription>{match.seriesName}</CardDescription>
            </div>
            <Badge variant="outline">{match.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{format(match.date as Date, 'eee, dd MMM yyyy')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Location:</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{match.location}</span>
              {match.googleMapsLink && (
                <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                  <MapPin className="h-4 w-4 text-primary" />
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Registration:</span>
            <span className="font-medium">{match.registeredCount} / {match.capacity}</span>
          </div>
        </CardContent>
        <CardFooter>
            <Button asChild className="w-full">
                <Link href="/auth/login">
                    Login to Register
                    <LogIn className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </CardFooter>
      </Card>
  );

  const renderMatchList = () => {
    if (isLoadingMatches) {
        return Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
            </TableRow>
        ))
    }
     if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="h-24 text-center">
            No upcoming matches found for this club.
          </TableCell>
        </TableRow>
      );
    }
    return matches.map((match) => (
        <TableRow key={match.id}>
          <TableCell className="font-medium">{match.name}</TableCell>
          <TableCell>{match.seriesName}</TableCell>
          <TableCell>{format(match.date as Date, 'PPP')}</TableCell>
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
        </TableRow>
    ));
  }

  const renderMatchCards = () => {
      if(isLoadingMatches) {
          return Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />);
      }
      if (matches.length === 0) {
          return (
             <div className="text-center text-muted-foreground py-12 col-span-full">
                No upcoming matches found for this club.
            </div>
          )
      }
      return matches.map(renderUpcomingMatch);
  }
  
  const renderLastCompletedMatch = () => {
    if (isLoadingMatches) {
      return <Skeleton className="h-8 w-full" />;
    }
    if (lastCompletedMatch) {
      return (
         <p className="text-center text-muted-foreground">
            Last Completed Match: <span className="font-semibold text-foreground">{lastCompletedMatch.name}</span>
          </p>
      );
    }
    return (
      <p className="text-center text-muted-foreground">No completed matches found for this club.</p>
    );
  };
  
  if (!hasMounted) {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            <div className="flex justify-center">
                <Skeleton className="h-10 w-72" />
            </div>
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Match Dashboard</h1>
        <p className="text-muted-foreground">Public view of upcoming matches.</p>
      </div>

      <div className="flex justify-center">
          {isLoadingClubs ? <Skeleton className="h-10 w-72" /> : (
            <Select value={selectedClubId} onValueChange={handleClubChange}>
              <SelectTrigger className="w-[280px]">
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
          )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Next Upcoming Match</CardTitle>
          <CardDescription>
            The next scheduled match for the selected club.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? (
            <div className="grid grid-cols-1 gap-4">
              {renderMatchCards()}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Match</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renderMatchList()}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {renderLastCompletedMatch()}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicDashboardPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PublicDashboardContent />
        </Suspense>
    )
}
