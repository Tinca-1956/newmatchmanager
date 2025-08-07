
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
import { PlusCircle, UserPlus, FileText, Trophy, Scale, LogIn, Edit, UserMinus, MapPin, MoreVertical, Image as ImageIcon, Globe } from 'lucide-react';
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
import { collection, onSnapshot, doc, query, where, getDocs, getDoc, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { CreateMatchModal } from '@/components/create-match-modal';

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

function MatchesClubAdminPageContent() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, isClubAdmin, userRole, loading: adminLoading } = useAdminAuth();
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchIdFilter = searchParams.get('matchId');
  const seriesIdFilter = searchParams.get('seriesId');

  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
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
    handleManageImages,
    handlePublish,
  } = useMatchActions();

  // Effect to set the initial club for fetching matches
  useEffect(() => {
    if (adminLoading) return;

    if (userProfile?.primaryClubId) {
        setSelectedClubId(userProfile.primaryClubId);
    }
  }, [adminLoading, userProfile]);


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
    return matches.map(match => {
      const newStatus = getCalculatedStatus(match);
      if (newStatus !== match.status && firestore) {
        updateDoc(doc(firestore, 'matches', match.id), { status: newStatus }).catch(e => console.error("Failed to auto-update status:", e));
      }
      return {
        ...match,
        calculatedStatus: newStatus,
      };
    });
  }, [matches]);

  const canEdit = isSiteAdmin || isClubAdmin;
  const canWeighIn = canEdit || userRole === 'Marshal';

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
                      {canEdit && (
                        <>
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
                                   <Button variant="ghost" size="icon" onClick={() => handleManageImages(match.id)}>
                                      <ImageIcon className="h-4 w-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Manage Images</p></TooltipContent>
                          </Tooltip>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleEditMatch(match)}>
                                      <Edit className="h-4 w-4" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Match</p></TooltipContent>
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
                              <Button variant="ghost" size="icon" onClick={() => handlePublish(match)}>
                                  <Globe className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Publish Results</p></TooltipContent>
                      </Tooltip>
                        </>
                      )}
                      
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleViewResults(match)}>
                                  <Trophy className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>View Results</p></TooltipContent>
                      </Tooltip>
                      {status !== 'Completed' && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="inline-block"> {/* Wrapper for tooltip on disabled */}
                                    <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleRegister(match)}
                                    disabled={isUserRegistered}
                                    >
                                        <LogIn className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent><p>{isUserRegistered ? "Go to your profile page to un-register" : "Register for Match"}</p></TooltipContent>
                        </Tooltip>
                      )}
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
                <CardFooter className="flex justify-between items-center">
                    {status !== 'Completed' ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-block"> {/* Wrapper for tooltip on disabled */}
                                <Button 
                                    onClick={() => handleRegister(match)}
                                    disabled={isUserRegistered}
                                    size="sm"
                                >
                                    <LogIn className="mr-2 h-4 w-4" />
                                    {isUserRegistered ? 'Registered' : 'Register'}
                                </Button>
                            </div>
                          </TooltipTrigger>
                           <TooltipContent><p>{isUserRegistered ? "Go to your profile page to un-register" : "Register for Match"}</p></TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                        <Button size="sm" disabled>Registration Closed</Button>
                    )}

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canEdit && (
                                <>
                                    <DropdownMenuItem onClick={() => handleAddAnglers(match.id)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        <span>Add Anglers</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRemoveAnglers(match)}>
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        <span>Remove Anglers</span>
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleManageImages(match.id)}>
                                        <ImageIcon className="mr-2 h-4 w-4" />
                                        <span>Manage Images</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEditMatch(match)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit Match</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleViewAnglerList(match)}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        <span>View Angler List</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePublish(match)}>
                                        <Globe className="mr-2 h-4 w-4" />
                                        <span>Publish Results</span>
                                    </DropdownMenuItem>
                                </>
                            )}
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
            <h1 className="text-3xl font-bold tracking-tight">Matches - Club Admin</h1>
            <p className="text-muted-foreground">Manage your club's matches here.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
              {canEdit && (
                <Button onClick={() => setIsCreateModalOpen(true)} disabled={!selectedClubId}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Match
                </Button>
              )}
          </div>
        </div>
        
        {isMobile ? (
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

      <CreateMatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        clubId={selectedClubId}
      />

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

export default function MatchesClubAdminPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MatchesClubAdminPageContent />
        </Suspense>
    )
}
