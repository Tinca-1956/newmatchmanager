
'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { PlusCircle, UserPlus, FileText, Trophy, Scale, LogIn, Edit, UserMinus, MapPin, MoreVertical } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, query, where, getDocs, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, User, Club, MatchStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { ResultsModal } from '@/components/results-modal';
import { AnglerListModal } from '@/components/angler-list-modal';
import { DisplayAnglerListModal } from '@/components/display-angler-list-modal';
import { EditMatchModal } from '@/components/edit-match-modal';
import { useMatchActions } from '@/hooks/use-match-actions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RemoveAnglerModal } from '@/components/remove-angler-modal';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';

const getCalculatedStatus = (match: Match): MatchStatus => {
  const now = new Date();
  
  if (!(match.date instanceof Date)) {
    // If it's still a Timestamp, convert it. If it's invalid, return original status.
    if (match.date && typeof (match.date as any).toDate === 'function') {
      match.date = (match.date as Timestamp).toDate();
    } else {
      return match.status;
    }
  }

  const matchDate = new Date(match.date);

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


export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();
  const isMobile = useIsMobile();

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);

  const {
    isResultsModalOpen,
    isAnglerListModalOpen,
    isDisplayAnglerListModalOpen,
    isEditModalOpen,
    isRemoveAnglerModalOpen,
    selectedMatchForModal,
    selectedMatchIdForModal,
    handleViewResults,
    handleEditMatch,
    handleRegister,
    closeResultsModal,
    closeAnglerListModal,
    closeDisplayAnglerListModal,
    closeEditModal,
    closeRemoveAnglerModal,
    handleManagePegs,
    handleWeighIn,
    handleAddAnglers,
    handleRemoveAnglers,
    handleViewAnglerList,
  } = useMatchActions();

  // Effect to get the user's primary club or all clubs for admin
  useEffect(() => {
    if (adminLoading || !user || !firestore) return;

    const fetchInitialData = async () => {
        setIsLoading(true);
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (isSiteAdmin) {
                const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
                const clubsSnapshot = await getDocs(clubsQuery);
                const clubsData = clubsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
                setClubs(clubsData);
                setSelectedClubId(userData.primaryClubId || (clubsData.length > 0 ? clubsData[0].id : ''));
            } else {
                setSelectedClubId(userData.primaryClubId || '');
            }
        }
    };

    fetchInitialData();
  }, [user, isSiteAdmin, adminLoading]);
  
  // Effect to fetch matches for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
        setIsLoading(false);
        setMatches([]);
        return;
    }

    setIsLoading(true);

    const matchesQuery = query(
      collection(firestore, 'matches'),
      where('clubId', '==', selectedClubId),
      orderBy('date', 'desc')
    );

    const unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: (doc.data().date as Timestamp).toDate(),
      } as Match));

      setMatches(matchesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching matches: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch matches.' });
      setIsLoading(false);
    });

    return () => {
        unsubscribeMatches();
    };
  }, [selectedClubId, toast]);

  const displayedMatches = useMemo(() => {
    return matches.map(match => ({
      ...match,
      calculatedStatus: getCalculatedStatus(match),
    }));
  }, [matches]);

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
            No matches found for this club.
          </TableCell>
        </TableRow>
      );
    }

    return displayedMatches.map((match) => {
      const isUserRegistered = user ? match.registeredAnglers?.includes(user.uid) : false;
      const status = getCalculatedStatus(match);

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
          <TableCell>{format(match.date, 'dd/MM/yyyy')}</TableCell>
          <TableCell>{match.capacity}</TableCell>
          <TableCell>{match.registeredCount}</TableCell>
          <TableCell><Badge variant="outline">{status}</Badge></TableCell>
          <TableCell>
              <TooltipProvider>
                  <div className="flex items-center gap-1">
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleAddAnglers(match.id)}>
                                  <UserPlus className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Add anglers to match</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveAnglers(match)}>
                                  <UserMinus className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Remove anglers from match</p></TooltipContent>
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
                      <Tooltip>
                          <TooltipTrigger asChild>
                               <Button variant="ghost" size="icon" onClick={() => handleWeighIn(match.id)}>
                                  <Scale className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Manage Weigh-in</p></TooltipContent>
                      </Tooltip>
                       <Tooltip>
                          <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRegister(match)}
                                disabled={isUserRegistered}
                              >
                                  <LogIn className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>{isUserRegistered ? "Use your user profile to un-register" : "Register for Match"}</p></TooltipContent>
                      </Tooltip>
                       <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleEditMatch(match)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Edit Match</p></TooltipContent>
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
        <div className="text-center text-muted-foreground py-12">
          No matches found for this club.
        </div>
      );
    }
    return displayedMatches.map((match) => {
        const isUserRegistered = user ? match.registeredAnglers?.includes(user.uid) : false;
        const status = getCalculatedStatus(match);
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
                        <span className="font-medium">{format(match.date, 'eee, dd MMM yyyy')}</span>
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
                <CardFooter className="flex justify-between items-center">
                    <Button 
                        onClick={() => handleRegister(match)}
                        disabled={isUserRegistered}
                        size="sm"
                    >
                        <LogIn className="mr-2 h-4 w-4" />
                        {isUserRegistered ? 'Registered' : 'Register'}
                    </Button>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAddAnglers(match.id)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                <span>Add Anglers</span>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleRemoveAnglers(match)}>
                                <UserMinus className="mr-2 h-4 w-4" />
                                <span>Remove Anglers</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewAnglerList(match)}>
                                <FileText className="mr-2 h-4 w-4" />
                                <span>View Angler List</span>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleViewResults(match)}>
                                <Trophy className="mr-2 h-4 w-4" />
                                <span>View Results</span>
                            </DropdownMenuItem>
                             <DropdownMenuItem onClick={() => handleWeighIn(match.id)}>
                                <Scale className="mr-2 h-4 w-4" />
                                <span>Manage Weigh-in</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditMatch(match)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit Match</span>
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
            <p className="text-muted-foreground">Manage your club's matches here.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
              {isSiteAdmin && (
                  <div className="flex items-center gap-2">
                      <Label htmlFor="club-filter" className="text-nowrap">Club</Label>
                      <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
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
              <Button disabled={!selectedClubId}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Match
              </Button>
          </div>
        </div>
        
        {isMobile ? (
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 {renderMatchCards()}
            </div>
        ) : (
             <Card>
                <CardHeader>
                    <CardTitle>Upcoming & Recent Matches</CardTitle>
                    <CardDescription>A list of all matches for your club.</CardDescription>
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

      {selectedMatchForModal && (
        <>
          <ResultsModal 
            isOpen={isResultsModalOpen}
            onClose={closeResultsModal}
            match={selectedMatchForModal}
          />
          <DisplayAnglerListModal
            isOpen={isDisplayAnglerListModalOpen}
            onClose={closeDisplayAnglerListModal}
            match={selectedMatchForModal}
          />
          <EditMatchModal
            isOpen={isEditModalOpen}
            onClose={closeEditModal}
            match={selectedMatchForModal}
          />
           <RemoveAnglerModal
            isOpen={isRemoveAnglerModalOpen}
            onClose={closeRemoveAnglerModal}
            match={selectedMatchForModal}
          />
        </>
      )}

      {selectedMatchIdForModal && (
        <AnglerListModal
          isOpen={isAnglerListModalOpen}
          onClose={closeAnglerListModal}
          matchId={selectedMatchIdForModal}
        />
      )}
    </>
  );
}

