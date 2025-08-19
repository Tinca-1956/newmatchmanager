
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
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
import { PlusCircle, UserPlus, FileText, Trophy, Scale, LogIn, Edit, UserMinus, MapPin, MoreVertical, Image as ImageIcon, Globe, HelpCircle, Search } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, query, where, getDocs, getDoc, orderBy, Timestamp, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import type { Match, User, Club, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { ResultsModal } from '@/components/results-modal';
import { AnglerListModal } from '@/components/angler-list-modal';
import { DisplayAnglerListModal } from '@/components/display-angler-list-modal';
import { useMatchActions } from '@/hooks/use-match-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAnglerMatchActions } from '@/hooks/use-angler-match-actions';
import { ViewOnlyMatchDescriptionModal } from '@/components/view-only-match-description-modal';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  let matchDate: Date;
  if (match.date instanceof Timestamp) {
    matchDate = match.date.toDate();
  } else if (match.date instanceof Date) {
    matchDate = match.date;
  } else {
    return match.status;
  }

  if (!match.drawTime || !match.endTime || !match.drawTime.includes(':') || !match.endTime.includes(':')) {
    return match.status;
  }
  
  const [drawHours, drawMinutes] = match.drawTime.split(':').map(Number);
  const drawDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), drawHours, drawMinutes);

  const [endHours, endMinutes] = match.endTime.split(':').map(Number);
  const endDateTime = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate(), endHours, endMinutes);
  
  const weighInProgressUntil = new Date(endDateTime.getTime() + 90 * 60 * 1000);

  if (match.status === 'Cancelled') return 'Cancelled';
  if (now > weighInProgressUntil) return 'Completed';
  if (now > endDateTime) return 'Weigh-in';
  if (now > drawDateTime) return 'In Progress';
  
  return 'Upcoming';
};

function MatchesPageContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, isClubAdmin, userRole, loading: adminLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchIdFilter = searchParams.get('matchId');
  const seriesIdFilter = searchParams.get('seriesId');
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Use the new, specific hook for Angler actions
  const {
    isDescriptionModalOpen,
    selectedMatchForModal,
    handleViewDescription,
    closeDescriptionModal,
  } = useAnglerMatchActions();
  
  // Keep the old hook for shared modals like results and angler lists
  const {
    isResultsModalOpen,
    isDisplayAnglerListModalOpen,
    selectedMatchForModal: selectedMatchForSharedModal,
    handleViewResults,
    handleViewAnglerList,
    closeResultsModal,
    closeDisplayAnglerListModal,
  } = useMatchActions();


  // Effect to set the initial club for fetching matches
  useEffect(() => {
    if (adminLoading) return;

    if (isSiteAdmin) {
      if (firestore) {
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribe = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setClubs(clubsData);
            if (clubsData.length > 0 && !selectedClubId) {
              setSelectedClubId(clubsData[0].id);
            }
        });
        return () => unsubscribe();
      }
    } else if (userProfile?.primaryClubId) {
        setSelectedClubId(userProfile.primaryClubId);
    }
  }, [isSiteAdmin, adminLoading, userProfile, selectedClubId]);


  // Main data fetching effect
  useEffect(() => {
    if (!firestore || !selectedClubId) {
      setMatches([]);
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    
    let matchesQuery;
    if (seriesIdFilter) {
        matchesQuery = query(
            collection(firestore, 'matches'),
            where('clubId', '==', selectedClubId),
            where('seriesId', '==', seriesIdFilter)
        );
    } else {
        matchesQuery = query(
            collection(firestore, 'matches'),
            where('clubId', '==', selectedClubId)
        );
    }
    
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

      matchesData.sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

      if (matchIdFilter) {
        setMatches(matchesData.filter(m => m.id === matchIdFilter));
      } else {
        setMatches(matchesData);
      }
      
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches.' });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedClubId, matchIdFilter, seriesIdFilter, toast]);


  const displayedMatches = useMemo(() => {
    return matches
      .filter(match => {
        const term = searchTerm.toLowerCase();
        return (
          match.seriesName.toLowerCase().includes(term) ||
          match.name.toLowerCase().includes(term) ||
          match.location.toLowerCase().includes(term)
        );
      })
      .map(match => {
        const newStatus = getCalculatedStatus(match);
        if (newStatus !== match.status && firestore) {
          updateDoc(doc(firestore, 'matches', match.id), { status: newStatus }).catch(e => console.error("Failed to auto-update status:", e));
        }
        return {
          ...match,
          calculatedStatus: newStatus,
        };
      });
  }, [matches, searchTerm]);
  
  const handleClubSelectionChange = (clubId: string) => {
    if (matchIdFilter || seriesIdFilter) {
        router.push('/main/matches-angler');
    }
    setSelectedClubId(clubId);
  };
  
  const canEdit = isSiteAdmin || isClubAdmin;

  const renderMatchList = () => {
    if (isLoading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-10 w-48" /></TableCell>
        </TableRow>
      ));
    }

    if (displayedMatches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-24 text-center">
            {matchIdFilter || seriesIdFilter ? "No matches found for this filter." : "No matches found for this club."}
          </TableCell>
        </TableRow>
      );
    }

    return displayedMatches.map((match) => {
      const isUserRegistered = user ? match.registeredAnglers?.includes(user.uid) : false;
      const status = match.calculatedStatus;

      return (
        <TableRow key={match.id}>
          <TableCell className="font-medium">{match.seriesName}</TableCell>
          <TableCell>{match.name}</TableCell>
          <TableCell>
            <div className="flex items-center gap-2">
              <span>{match.location}</span>
              {match.googleMapsLink && (
                  <Link href={match.googleMapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-primary hover:text-primary/80" />
                  </Link>
              )}
            </div>
          </TableCell>
          <TableCell>{format(match.date as Date, 'dd/MM/yyyy')}</TableCell>
          <TableCell>{match.capacity}</TableCell>
          <TableCell>{match.registeredCount}</TableCell>
          <TableCell><Badge variant="outline">{status}</Badge></TableCell>
          <TableCell>
              <TooltipProvider>
                  <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleViewDescription(match)}>
                                <HelpCircle className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View Description</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleViewAnglerList(match)}>
                                <FileText className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Angler List</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleViewResults(match)}>
                                  <Trophy className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View Results</p></TooltipContent>
                      </Tooltip>
                  </div>
              </TooltipProvider>
          </TableCell>
        </TableRow>
      );
    });
  };

  const renderMatchCards = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
        </Card>
      ));
    }
    if (displayedMatches.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-12 col-span-full">
           {matchIdFilter || seriesIdFilter ? "No matches found for this filter." : "No matches found for this club."}
        </div>
      );
    }
    return displayedMatches.map((match) => {
        const isUserRegistered = user ? match.registeredAnglers?.includes(user.uid) : false;
        const status = match.calculatedStatus;
        return (
            <Card key={match.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{match.name}</CardTitle>
                            <CardDescription>{match.seriesName}</CardDescription>
                        </div>
                        <Badge variant="outline">{status}</Badge>
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
                <CardFooter className="flex justify-end items-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem onClick={() => handleViewDescription(match)}>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                <span>Description</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewAnglerList(match)}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>View Angler List</span>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleViewResults(match)}>
                                <Trophy className="mr-2 h-4 w-4" />
                                <span>View Results</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </CardFooter>
            </Card>
        )
    });
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
            <p className="text-muted-foreground">View club matches here.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
               <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder="Search series, match, location..."
                      className="pl-8 sm:w-auto md:w-64"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              {isSiteAdmin && (
                  <div className="flex items-center gap-2">
                      <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                      <Select value={selectedClubId || ''} onValueChange={handleClubSelectionChange} disabled={clubs.length === 0}>
                          <SelectTrigger id="club-filter" className="w-[180px]">
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
                  </div>
              )}
          </div>
        </div>
        
        {isClient && isMobile ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {renderMatchCards()}
            </div>
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle>{matchIdFilter ? "Filtered Match" : "Upcoming & Recent Matches"}</CardTitle>
                    <CardDescription>
                        {matchIdFilter ? "Showing a specific match. Clear the filter by navigating away and back." : "A list of all matches for your club."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Series</TableHead>
                        <TableHead>Match</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderMatchList()}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
        )}
      </div>

      <ViewOnlyMatchDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={closeDescriptionModal}
        match={selectedMatchForModal}
      />
      
      {selectedMatchForSharedModal && (
        <>
            <ResultsModal 
                isOpen={isResultsModalOpen}
                onClose={closeResultsModal}
                match={selectedMatchForSharedModal}
            />
            <DisplayAnglerListModal
                isOpen={isDisplayAnglerListModalOpen}
                onClose={closeDisplayAnglerListModal}
                match={selectedMatchForSharedModal}
            />
        </>
      )}
    </>
  );
}

export default function MatchesAnglerPage() {
    return (
        <Suspense fallback={<div className="w-full h-96 flex justify-center items-center"><Skeleton className="h-24 w-1/2" /></div>}>
            <MatchesPageContent />
        </Suspense>
    )
}
