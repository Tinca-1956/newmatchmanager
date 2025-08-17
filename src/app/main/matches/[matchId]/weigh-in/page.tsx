
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ArrowLeft, List, LayoutGrid, SortAsc } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, collection, query, where, onSnapshot, writeBatch, Timestamp, getDocs, addDoc, setDoc } from 'firebase/firestore';
import type { Match, User, Result, WeighInStatus, UserRole } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';

interface AnglerResultData {
  userId: string;
  userName: string;
  peg: string;
  section: string;
  weight: number | string; // Allow string for input editing
  status: WeighInStatus;
  position: number | null;
  resultDocId?: string; // Firestore document ID of the result
  sectionRank?: number | null;
  payout?: number | string;
}

// Helper function to fetch documents in chunks
async function getDocsInChunks<T extends { id: string }>(ids: string[], collectionName: string): Promise<Map<string, T>> {
    if (!ids.length) return new Map();
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) {
        chunks.push(ids.slice(i, i + 30));
    }

    const resultsMap = new Map<string, T>();
    for (const chunk of chunks) {
        if (chunk.length === 0) continue;
        const q = query(collection(firestore, collectionName), where('__name__', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(doc => resultsMap.set(doc.id, { id: doc.id, ...doc.data() } as T));
    }
    return resultsMap;
}

// Function to create missing result documents
async function createMissingResults(matchData: Match, allUsersMap: Map<string, User>, existingResultsMap: Map<string, Result & { id: string }>) {
    if (!firestore) return;

    const batch = writeBatch(firestore);
    let createdCount = 0;

    matchData.registeredAnglers.forEach(anglerId => {
        if (!existingResultsMap.has(anglerId)) {
            const user = allUsersMap.get(anglerId);
            if (user) {
                const newResultRef = doc(collection(firestore, 'results'));
                const newResultData: Omit<Result, 'id'> = {
                    matchId: matchData.id,
                    seriesId: matchData.seriesId,
                    clubId: matchData.clubId,
                    date: matchData.date,
                    userId: user.id,
                    userName: `${user.firstName} ${user.lastName}`,
                    peg: '',
                    section: '',
                    weight: 0,
                    status: 'NYW',
                    position: null,
                    payout: 0,
                };
                batch.set(newResultRef, newResultData);
                createdCount++;
            }
        }
    });

    if (createdCount > 0) {
        await batch.commit();
        console.log(`Created ${createdCount} missing result document(s).`);
    }
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
  const [sortBy, setSortBy] = useState<'Peg' | 'Overall' | 'Section' | 'None'>('None');
  const [isSaving, setIsSaving] = useState<string | null>(null); // Store userId of saving angler

  // Fetch user profile to check role
  useEffect(() => {
    if (!authUser || !firestore) return;

    const userDocRef = doc(firestore, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const profile = doc.data() as User;
        setUserProfile(profile);
      }
    });
    return () => unsubscribe();
  }, [authUser]);

  // Determine if the user can edit based on role and match status
  useEffect(() => {
    if (!userProfile || !match) {
      setCanEdit(false);
      return;
    }

    const isAdmin = userProfile.role === 'Site Admin' || userProfile.role === 'Club Admin';
    
    if (isAdmin) {
      setCanEdit(true);
    } else {
      setCanEdit(false);
    }
  }, [userProfile, match]);


  // Main data fetching and subscription effect
  useEffect(() => {
    if (!matchId || !firestore) return;

    const matchDocRef = doc(firestore, 'matches', matchId);
    
    // Subscribe to both the match and its results simultaneously
    const unsubscribeMatch = onSnapshot(matchDocRef, async (matchDoc) => {
        if (!matchDoc.exists()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Match not found.' });
            router.back();
            return;
        }

        setIsLoading(true);
        const matchData = { id: matchDoc.id, ...matchDoc.data() } as Match;
        setMatch({ ...matchData, date: (matchData.date as Timestamp).toDate() });

        const registeredAnglerIds = matchData.registeredAnglers || [];
        if (registeredAnglerIds.length === 0) {
            setResults([]);
            setIsLoading(false);
            return;
        }

        try {
            // 1. Fetch all registered anglers' user data
            const usersMap = await getDocsInChunks<User>(registeredAnglerIds, 'users');

            // 2. Fetch all existing results for this match
            const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', matchId));
            const resultsSnapshot = await getDocs(resultsQuery);
            const existingResultsMap = new Map(resultsSnapshot.docs.map(d => [d.data().userId, { id: d.id, ...d.data() } as Result & { id: string }]));

            // 3. Create missing result documents if necessary
            await createMissingResults(matchData, usersMap, existingResultsMap);
            
            // 4. Set up a real-time listener for the results collection to get live updates
            const unsubscribeResults = onSnapshot(resultsQuery, (liveResultsSnapshot) => {
                const liveExistingResultsMap = new Map(liveResultsSnapshot.docs.map(d => [d.data().userId, { id: d.id, ...d.data() } as Result & { id: string }]));
                
                // 5. Combine the data based on the registered anglers list
                const combinedData: AnglerResultData[] = registeredAnglerIds.map(anglerId => {
                    const user = usersMap.get(anglerId);
                    const result = liveExistingResultsMap.get(anglerId);
                    
                    if (!user) {
                        return null;
                    }

                    return {
                        userId: anglerId,
                        userName: `${user.firstName} ${user.lastName}`,
                        peg: result?.peg || '',
                        section: result?.section || '',
                        weight: result?.weight ?? 0,
                        status: result?.status || 'NYW',
                        position: result?.position || null,
                        resultDocId: result?.id,
                        payout: result?.payout ?? 0,
                    };
                }).filter((item): item is AnglerResultData => item !== null);

                // 6. Recalculate ranks and update state
                const rankedResults = calculateRanks(combinedData);
                setResults(rankedResults);
                setIsLoading(false); // Only set loading to false after the first successful data fetch
            });
            
            return () => unsubscribeResults(); // This will be handled by the parent unsubscribe cleanup

        } catch (error) {
            console.error("Error fetching weigh-in data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load weigh-in data.' });
            setIsLoading(false);
        }
    });

    return () => {
        unsubscribeMatch();
    };
}, [matchId, router, toast]);
  
  const calculateRanks = (currentResults: AnglerResultData[]): AnglerResultData[] => {
    // Overall Ranks
    const sortedByWeight = [...currentResults]
      .filter(r => r.status === 'OK' && (typeof r.weight === 'number' && r.weight > 0))
      .sort((a, b) => (b.weight as number) - (a.weight as number));

    const positionMap = new Map<string, number>();
    sortedByWeight.forEach((result, index) => {
      positionMap.set(result.userId, index + 1);
    });
    
    const lastRank = sortedByWeight.length;
    const didNotWeighRank = lastRank + 1;

    let resultsWithRanks = currentResults.map(r => {
        let position: number | null = null;
        if (r.status === 'OK' && (typeof r.weight === 'number' && r.weight > 0)) {
            position = positionMap.get(r.userId) || null;
        } else if (['DNW', 'DNF', 'DSQ'].includes(r.status)) {
            position = didNotWeighRank;
        } else if (r.status === 'OK' && r.weight === 0) {
            position = didNotWeighRank;
        }
        return { ...r, position };
    });
    
    // Section Ranks
    const resultsBySection: { [key: string]: AnglerResultData[] } = {};
    resultsWithRanks.forEach(result => {
        const section = result.section || 'default';
        if (!resultsBySection[section]) {
            resultsBySection[section] = [];
        }
        resultsBySection[section].push(result);
    });

    for (const sectionKey in resultsBySection) {
        const sectionResults = resultsBySection[sectionKey];
        
        const sectionSortedByWeight = sectionResults
            .filter(r => r.status === 'OK' && r.weight > 0)
            .sort((a, b) => (b.weight as number) - (a.weight as number));

        const lastSectionRank = sectionSortedByWeight.length;
        const dnwSectionRank = lastSectionRank + 1;

        sectionResults.forEach(result => {
            const originalIndex = resultsWithRanks.findIndex(r => r.userId === result.userId);
            if (originalIndex !== -1) {
                let sectionRank: number | null = null;
                if (result.status === 'OK' && result.weight > 0) {
                    const rank = sectionSortedByWeight.findIndex(r => r.userId === result.userId);
                    sectionRank = rank !== -1 ? rank + 1 : null;
                } else if (['DNW', 'DNF', 'DSQ'].includes(result.status || '')) {
                    sectionRank = dnwSectionRank;
                } else if (result.status === 'OK' && result.weight === 0) {
                    sectionRank = dnwSectionRank;
                }
                 resultsWithRanks[originalIndex].sectionRank = sectionRank;
            }
        });
    }

    return resultsWithRanks;
  };
  
  const handleFieldChange = (userId: string, field: keyof AnglerResultData, value: string | number) => {
    setResults(prev =>
      prev.map(r => {
        if (r.userId === userId) {
          const updatedResult = { ...r, [field]: value };
          // If status is changed to a non-weighing status, set weight to 0
          if (field === 'status' && ['NYW', 'DNW', 'DNF', 'DSQ'].includes(value as string)) {
            updatedResult.weight = 0;
          }
          return updatedResult;
        }
        return r;
      })
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

        // Recalculate ranks for all anglers based on the latest change
        const resultsWithParsedWeights = results.map(r => ({
            ...r, 
            weight: parseFloat(r.weight as string) || 0,
            payout: parseFloat(r.payout as string) || 0,
        }));
        const updatedResultsWithRanks = calculateRanks(resultsWithParsedWeights);

        // Update all results with their new positions/ranks
        updatedResultsWithRanks.forEach(res => {
            const resultToSave: Omit<Result, 'id'> = {
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
                sectionRank: res.sectionRank,
                payout: Number(res.payout) || 0,
            };
            
            // Use existing doc ID to update the correct document
            if (res.resultDocId) {
                const docRefToUpdate = doc(firestore, 'results', res.resultDocId);
                batch.update(docRefToUpdate, resultToSave as any);
            } else {
                // This case should ideally not be hit with the new logic, but as a fallback:
                const newDocRef = doc(collection(firestore, 'results'));
                batch.set(newDocRef, resultToSave);
            }
        });
        
        await batch.commit();

        toast({ title: 'Success', description: `Results saved successfully.` });
    } catch (error) {
        console.error("Error saving result:", error);
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the result.' });
    } finally {
        setIsSaving(null);
    }
  };

  const sortedResults = useMemo(() => {
    const resultsCopy = [...results];
    if (sortBy === 'None') {
        return resultsCopy;
    }
     if (sortBy === 'Overall') {
        return resultsCopy.sort((a, b) => (a.position || 999) - (b.position || 999));
    }
    if (sortBy === 'Section') {
        return resultsCopy.sort((a, b) => {
            const sectionA = a.section || '';
            const sectionB = b.section || '';
            if (sectionA < sectionB) return -1;
            if (sectionA > sectionB) return 1;
            return (a.sectionRank || 999) - (b.sectionRank || 999);
        });
    }
    // Default to 'Peg'
    return resultsCopy.sort((a, b) => {
        const pegA = a.peg || '';
        const pegB = b.peg || '';
        return pegA.localeCompare(pegB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [results, sortBy]);
  
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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 gap-4">
            {/* Buttons Row (Top on mobile) */}
            <div className="flex justify-between items-center w-full md:w-auto order-1 md:order-none">
                <Button variant="outline" onClick={() => router.back()} className="text-xs sm:text-sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Matches
                </Button>
                <div className="md:hidden flex items-center gap-2">
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="text-xs sm:text-sm">
                                <SortAsc className="mr-2 h-4 w-4" />
                                Sort
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSortBy('None')}>None</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('Peg')}>Peg</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('Overall')}>Overall</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('Section')}>Section</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="text-xs sm:text-sm">
                                {viewMode === 'card' ? <LayoutGrid className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
                                View
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
            </div>
            
            {/* Text Content (Middle on mobile) */}
            <div className="text-center order-2 md:order-none flex-grow">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">Weigh-in</h1>
                <p className="text-lg sm:text-xl font-semibold">{match.name} at {match.location}</p>
                <p className="text-sm text-muted-foreground">{match.seriesName} - {format(match.date, 'PPP')}</p>
            </div>

            {/* Desktop Display Toggle */}
             <div className="hidden md:flex justify-end items-center order-3 md:w-auto gap-2">
                 <div className="flex flex-col gap-1.5">
                    <Label htmlFor="sort-by">Sort By</Label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger id="sort-by" className="w-[120px]">
                            <SelectValue placeholder="Sort..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Peg">Peg</SelectItem>
                            <SelectItem value="Overall">Overall</SelectItem>
                            <SelectItem value="Section">Section</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
                 <div className="flex flex-col gap-1.5">
                     <Label>Display</Label>
                     <Select value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                         <SelectTrigger className="w-[120px]">
                             <SelectValue placeholder="View..." />
                         </SelectTrigger>
                         <SelectContent>
                            <SelectItem value="card">Card View</SelectItem>
                            <SelectItem value="list">List View</SelectItem>
                         </SelectContent>
                     </Select>
                 </div>
             </div>
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
            {sortedResults.map((angler) => (
                <Card key={angler.userId}>
                    <CardHeader>
                        <CardTitle>{angler.userName}</CardTitle>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                            {angler.position && <span>Overall: {angler.position}</span>}
                            {angler.sectionRank && <span>Section: {angler.sectionRank}</span>}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor={`peg-${angler.userId}`}>Peg No.</Label>
                                <Input id={`peg-${angler.userId}`} value={angler.peg} onChange={e => handleFieldChange(angler.userId, 'peg', e.target.value)} disabled={!canEdit} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor={`section-${angler.userId}`}>Section</Label>
                                <Input id={`section-${angler.userId}`} value={angler.section} onChange={e => handleFieldChange(angler.userId, 'section', e.target.value)} disabled={!canEdit} />
                            </div>
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor={`weight-${angler.userId}`}>Weight (Kg)</Label>
                             <Input 
                                id={`weight-${angler.userId}`} 
                                type="number" 
                                step="0.001" 
                                value={angler.weight}
                                onChange={e => handleFieldChange(angler.userId, 'weight', e.target.value)} 
                                disabled={!canEdit} 
                             />
                        </div>
                        <div className="space-y-2">
                             <Label htmlFor={`payout-${angler.userId}`}>Payout</Label>
                             <Input 
                                id={`payout-${angler.userId}`} 
                                type="number" 
                                step="0.01" 
                                value={angler.payout}
                                onChange={e => handleFieldChange(angler.userId, 'payout', e.target.value)} 
                                disabled={!canEdit} 
                             />
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
    if (isLoading || !match) {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Angler</TableHead>
              <TableHead>Peg</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Weight (Kg)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Overall</TableHead>
              <TableHead>Section Rank</TableHead>
              <TableHead>Payout</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                <TableCell><Skeleton className="h-10 w-full" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }

    const paidPlaces = match?.paidPlaces || 0;

    return (
        <div className="overflow-x-auto">
            <Table className="min-w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead>Angler</TableHead>
                        <TableHead>Peg</TableHead>
                        <TableHead>Section</TableHead>
                        <TableHead>Weight (Kg)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Overall</TableHead>
                        <TableHead>Section Rank</TableHead>
                        <TableHead>Payout</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sortedResults.map(angler => {
                        const isPaidPlace = angler.position !== null && paidPlaces > 0 && angler.position <= paidPlaces;
                        return (
                            <TableRow 
                                key={angler.userId}
                                className={isPaidPlace ? 'bg-green-100 dark:bg-green-900/30' : ''}
                            >
                                <TableCell className="font-medium">{angler.userName}</TableCell>
                                <TableCell>
                                    <Input value={angler.peg} onChange={e => handleFieldChange(angler.userId, 'peg', e.target.value)} disabled={!canEdit} className="h-9 w-20"/>
                                </TableCell>
                                <TableCell>
                                    <Input value={angler.section} onChange={e => handleFieldChange(angler.userId, 'section', e.target.value)} disabled={!canEdit} className="h-9 w-20"/>
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        step="0.001" 
                                        value={angler.weight} 
                                        onChange={e => handleFieldChange(angler.userId, 'weight', e.target.value)} 
                                        disabled={!canEdit} 
                                        className="h-9 w-24"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Select value={angler.status} onValueChange={(value) => handleFieldChange(angler.userId, 'status', value)} disabled={!canEdit}>
                                        <SelectTrigger className="h-9 w-28">
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
                                <TableCell>{angler.sectionRank || '-'}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        value={angler.payout} 
                                        onChange={e => handleFieldChange(angler.userId, 'payout', e.target.value)} 
                                        disabled={!canEdit} 
                                        className="h-9 w-24"
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleSaveResult(angler.userId)} disabled={isSaving === angler.userId || !canEdit}>
                                    {isSaving === angler.userId ? 'Saving...' : 'Save'}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
        {renderHeader()}
        {viewMode === 'card' ? renderCardView() : renderListView()}
    </div>
  );
}

    