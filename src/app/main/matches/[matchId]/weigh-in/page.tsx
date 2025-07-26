'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, List, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch, Timestamp, getDocs, updateDoc } from 'firebase/firestore';
import type { Match, User, Result, WeighInStatus, UserRole } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface AnglerResultData {
  userId: string;
  userName: string;
  peg: string;
  section: string;
  weight: number;
  status: WeighInStatus;
  position: number | null;
  resultDocId?: string; // Firestore document ID of the result
}

export default function WeighInPage() {
  const router = useRouter();
  const params = useParams();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [results, setResults] = useState<AnglerResultData[]>([]);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [isSaving, setIsSaving] = useState<string | null>(null); // Store userId of saving angler

  // Fetch user profile to check role
  useEffect(() => {
    if (!authUser || !firestore) return;

    const userDocRef = doc(firestore, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const profile = doc.data() as User;
        setUserProfile(profile);
        const editableRoles: UserRole[] = ['Marshal', 'Club Admin', 'Site Admin'];
        setCanEdit(editableRoles.includes(profile.role));
      }
    });
    return () => unsubscribe();
  }, [authUser]);

  // Main data fetching and subscription effect
  useEffect(() => {
    if (!matchId || !firestore) return;

    const fetchMatchDetails = async () => {
      const matchDocRef = doc(firestore, 'matches', matchId);
      const matchDoc = await getDoc(matchDocRef);
      if (matchDoc.exists()) {
        const matchData = matchDoc.data();
        setMatch({ 
            id: matchDoc.id,
            ...matchData,
            date: (matchData.date as Timestamp).toDate(),
        } as Match);
      } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
        router.back();
      }
    };
    fetchMatchDetails();

    // Subscribe to results for this match
    const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', matchId));
    const unsubscribe = onSnapshot(resultsQuery, async (snapshot) => {
      setIsLoading(true);
      try {
        const resultsData = snapshot.docs.map(doc => ({
            resultDocId: doc.id,
            ...doc.data()
        } as AnglerResultData));
        
        // Ensure we have a result entry for every registered angler
        const matchDocRef = doc(firestore, 'matches', matchId);
        const matchDoc = await getDoc(matchDocRef);
        if (!matchDoc.exists()) {
             setIsLoading(false);
             return;
        }
        const currentMatch = matchDoc.data() as Match;
        
        if (!currentMatch?.registeredAnglers?.length) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        const userDocsQuery = query(collection(firestore, 'users'), where('__name__', 'in', currentMatch.registeredAnglers));
        const usersSnapshot = await getDocs(userDocsQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        const combinedResults: AnglerResultData[] = usersData.map(user => {
            const existingResult = resultsData.find(r => r.userId === user.id);
            return {
                userId: user.id,
                userName: `${user.firstName} ${user.lastName}`,
                peg: existingResult?.peg || 'N/A',
                section: existingResult?.section || 'N/A',
                weight: existingResult?.weight || 0,
                status: existingResult?.status || 'NYW',
                position: existingResult?.position || null,
                resultDocId: existingResult?.resultDocId,
            };
        });
        
        // Recalculate ranks and update state
        const rankedResults = calculateRanks(combinedResults);
        setResults(rankedResults);

      } catch (error) {
        console.error("Error processing results:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load weigh-in data.' });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [matchId, router, toast]);
  
  const calculateRanks = (currentResults: AnglerResultData[]): AnglerResultData[] => {
    const sortedByWeight = [...currentResults]
      .filter(r => r.status === 'OK' && r.weight > 0)
      .sort((a, b) => b.weight - a.weight);

    const positionMap = new Map<string, number>();
    sortedByWeight.forEach((result, index) => {
      positionMap.set(result.userId, index + 1);
    });
    
    const lastRank = sortedByWeight.length;
    const didNotWeighRank = lastRank + 1;

    return currentResults.map(r => {
        let position: number | null = null;
        if (r.status === 'OK' && r.weight > 0) {
            position = positionMap.get(r.userId) || null;
        } else if (['DNW', 'DNF', 'DSQ'].includes(r.status)) {
            position = didNotWeighRank;
        }

        return {
            ...r,
            position,
        };
    });
};
  
  const handleFieldChange = (userId: string, field: keyof AnglerResultData, value: string | number) => {
    setResults(prev => 
        prev.map(r => r.userId === userId ? {...r, [field]: value} : r)
    );
  };
  
  const handleSaveResult = async (userId: string) => {
    if (!firestore || !match) return;
    setIsSaving(userId);

    const anglerResult = results.find(r => r.userId === userId);
    if (!anglerResult) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find angler data to save.' });
      setIsSaving(null);
      return;
    }

    try {
        const batch = writeBatch(firestore);
        const matchDocRef = doc(firestore, 'matches', match.id);

        // Recalculate ranks for all anglers based on the latest change
        const updatedResultsWithRanks = calculateRanks(results);

        // Find the specific result to save from the newly ranked list
        const resultToSaveFromRanked = updatedResultsWithRanks.find(r => r.userId === userId);
        if (!resultToSaveFromRanked) {
             throw new Error("Could not find result in ranked list.");
        }

        const resultToSave = {
            matchId: match.id,
            seriesId: match.seriesId,
            clubId: match.clubId,
            date: match.date,
            userId: resultToSaveFromRanked.userId,
            userName: resultToSaveFromRanked.userName,
            peg: resultToSaveFromRanked.peg,
            section: resultToSaveFromRanked.section,
            weight: Number(resultToSaveFromRanked.weight) || 0,
            status: resultToSaveFromRanked.status,
            position: resultToSaveFromRanked.position,
        };
        
        const resultDocRef = resultToSaveFromRanked.resultDocId 
            ? doc(firestore, 'results', resultToSaveFromRanked.resultDocId)
            : doc(collection(firestore, 'results'));
        
        batch.set(resultDocRef, resultToSave, { merge: true });
        
        // Then, update all other results with their new positions
        updatedResultsWithRanks.forEach(res => {
            // No need to update the one we are already saving
            if (res.userId === userId) return;

            const docRefToUpdate = res.resultDocId 
                ? doc(firestore, 'results', res.resultDocId)
                : doc(collection(firestore, 'results')); // Should not happen for existing results, but safe
            
            // This ensures a result document is created if it doesn't exist,
            // and updated with the new rank if it does.
            batch.set(docRefToUpdate, { 
                matchId: match.id,
                seriesId: match.seriesId,
                clubId: match.clubId,
                date: match.date,
                userId: res.userId,
                userName: res.userName,
                peg: res.peg,
                section: res.section,
                weight: Number(res.weight) || 0,
                status: res.status,
                position: res.position,
             }, { merge: true });
        });

        // Set the parent match status to 'Completed'
        batch.update(matchDocRef, { status: 'Completed' });
        
        await batch.commit();

        toast({ title: 'Success', description: `${anglerResult.userName}'s result has been saved and match marked as completed.` });
    } catch (error) {
        console.error("Error saving result:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the result.' });
    } finally {
        setIsSaving(null);
    }
  };
  
  const renderHeader = () => {
    if (isLoading || !match) {
        return (
            <div className="flex justify-between items-center mb-8">
                 <Skeleton className="h-10 w-24" />
                <div className="text-center">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-6 w-48" />
                </div>
                 <Skeleton className="h-10 w-32" />
            </div>
        )
    }
    return (
        <div className="flex justify-between items-center mb-8">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Matches
            </Button>
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Weigh-in: {match.name}</h1>
                <p className="text-muted-foreground">{match.seriesName} - {format(match.date, 'PPP')}</p>
            </div>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        {viewMode === 'card' ? <LayoutGrid className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
                        Display: {viewMode === 'card' ? 'Cards' : 'List'}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setViewMode('card')}>
                         <LayoutGrid className="mr-2 h-4 w-4" />
                        Card View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setViewMode('list')}>
                         <List className="mr-2 h-4 w-4" />
                        List View
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
  }

  const renderCardView = () => {
    if (isLoading) {
       return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><div className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
        ))}
      </div>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {results.map((angler) => (
                <Card key={angler.userId}>
                    <CardHeader>
                        <CardTitle>{angler.userName}</CardTitle>
                        {angler.position && <CardDescription>Overall Rank: {angler.position}</CardDescription>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <div className="space-y-2 flex-1">
                                <Label htmlFor={`peg-${angler.userId}`}>Peg</Label>
                                <Input id={`peg-${angler.userId}`} value={angler.peg} onChange={e => handleFieldChange(angler.userId, 'peg', e.target.value)} disabled={!canEdit} />
                            </div>
                             <div className="space-y-2 flex-1">
                                <Label htmlFor={`section-${angler.userId}`}>Section</Label>
                                <Input id={`section-${angler.userId}`} value={angler.section} onChange={e => handleFieldChange(angler.userId, 'section', e.target.value)} disabled={!canEdit} />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor={`weight-${angler.userId}`}>Weight (Kg)</Label>
                             <Input id={`weight-${angler.userId}`} type="number" step="0.001" value={angler.weight} onChange={e => handleFieldChange(angler.userId, 'weight', e.target.value)} disabled={!canEdit} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`status-${angler.userId}`}>Status</Label>
                            <Select value={angler.status} onValueChange={(value) => handleFieldChange(angler.userId, 'status', value)} disabled={!canEdit}>
                                <SelectTrigger id={`status-${angler.userId}`}>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NYW">NYW</SelectItem>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="DNW">DNW</SelectItem>
                                    <SelectItem value="DNF">DNF</SelectItem>
                                    <SelectItem value="DSQ">DSQ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" onClick={() => handleSaveResult(angler.userId)} disabled={isSaving === angler.userId || !canEdit}>
                            {isSaving === angler.userId ? 'Saving...' : 'Save'}
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
  }

  const renderListView = () => {
    if (isLoading) {
      return Array.from({length: 5}).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
          <TableCell><Skeleton className="h-10 w-20" /></TableCell>
          <TableCell><Skeleton className="h-10 w-20" /></TableCell>
          <TableCell><Skeleton className="h-10 w-24" /></TableCell>
          <TableCell><Skeleton className="h-10 w-32" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-10 w-20" /></TableCell>
        </TableRow>
      ))
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Angler</TableHead>
                    <TableHead className="w-[120px]">Peg</TableHead>
                    <TableHead className="w-[120px]">Section</TableHead>
                    <TableHead className="w-[150px]">Weight (Kg)</TableHead>
                    <TableHead className="w-[180px]">Status</TableHead>
                    <TableHead>Rank</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {results.map(angler => (
                    <TableRow key={angler.userId}>
                        <TableCell className="font-medium">{angler.userName}</TableCell>
                        <TableCell>
                            <Input value={angler.peg} onChange={e => handleFieldChange(angler.userId, 'peg', e.target.value)} disabled={!canEdit} className="h-9"/>
                        </TableCell>
                         <TableCell>
                            <Input value={angler.section} onChange={e => handleFieldChange(angler.userId, 'section', e.target.value)} disabled={!canEdit} className="h-9"/>
                        </TableCell>
                        <TableCell>
                            <Input type="number" step="0.001" value={angler.weight} onChange={e => handleFieldChange(angler.userId, 'weight', e.target.value)} disabled={!canEdit} className="h-9"/>
                        </TableCell>
                        <TableCell>
                             <Select value={angler.status} onValueChange={(value) => handleFieldChange(angler.userId, 'status', value)} disabled={!canEdit}>
                                <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NYW">NYW</SelectItem>
                                    <SelectItem value="OK">OK</SelectItem>
                                    <SelectItem value="DNW">DNW</SelectItem>
                                    <SelectItem value="DNF">DNF</SelectItem>
                                    <SelectItem value="DSQ">DSQ</SelectItem>
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell>{angler.position || '-'}</TableCell>
                        <TableCell>
                            <Button size="sm" onClick={() => handleSaveResult(angler.userId)} disabled={isSaving === angler.userId || !canEdit}>
                               {isSaving === angler.userId ? 'Saving...' : 'Save'}
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
  }

  return (
    <div className="flex flex-col gap-8">
        {renderHeader()}
        {viewMode === 'card' ? renderCardView() : renderListView()}
    </div>
  );
}
