
'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { PlusCircle, UserPlus, FileText, Trophy, Scale, LogIn, Edit } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, onSnapshot, doc, query, where, getDocs, getDoc, orderBy, Timestamp } from 'firebase/firestore';
import type { Match, User, Club } from '@/lib/types';
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

export default function MatchesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSiteAdmin, loading: adminLoading } = useAdminAuth();

  const [matches, setMatches] = useState<Match[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(true);

  const {
    isResultsModalOpen,
    isAnglerListModalOpen,
    isDisplayAnglerListModalOpen,
    isEditModalOpen,
    selectedMatchForModal,
    selectedMatchIdForModal,
    handleViewResults,
    handleEditMatch,
    handleRegister,
    closeResultsModal,
    closeAnglerListModal,
    closeDisplayAnglerListModal,
    closeEditModal,
    handleManagePegs,
    handleWeighIn,
    handleAddAnglers,
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

    if (matches.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={8} className="h-24 text-center">
            No matches found for this club.
          </TableCell>
        </TableRow>
      );
    }

    return matches.map((match) => {
      const isUserRegistered = user ? match.registeredAnglers?.includes(user.uid) : false;

      return (
        <TableRow key={match.id}>
          <TableCell className="font-medium">{match.seriesName}</TableCell>
          <TableCell>{match.name}</TableCell>
          <TableCell>{match.location}</TableCell>
          <TableCell>{format(match.date, 'E, dd MMM yyyy')}</TableCell>
          <TableCell>{match.capacity}</TableCell>
          <TableCell>{match.registeredCount}</TableCell>
          <TableCell><Badge variant="outline">{match.status}</Badge></TableCell>
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
  
  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Matches</h1>
            <p className="text-muted-foreground">Manage your club's matches here.</p>
          </div>
          <div className="flex items-center gap-4">
              {isSiteAdmin && (
                  <div className="flex items-center gap-2">
                      <Label htmlFor="club-filter" className="text-nowrap">Clubs</Label>
                      <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={clubs.length === 0}>
                          <SelectTrigger id="club-filter" className="w-52">
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
        
        <Card>
          <CardHeader>
            <CardTitle>Upcoming & Recent Matches</CardTitle>
            <CardDescription>A list of all matches for your club. Click a row to see registered anglers.</CardDescription>
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
