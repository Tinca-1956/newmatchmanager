
'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
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
import { PlusCircle, Edit, Trophy, HelpCircle, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, addDoc, onSnapshot, doc, updateDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Series, User, Club, Match, Result } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SeriesWithMatchCount extends Series {
    matchCount: number;
}

interface AnglerStanding {
    rank: number;
    userName: string;
    totalRank: number;
}

type ResultWithSectionRank = Result & { sectionPosition?: number };

interface AuditResult {
  [anglerName: string]: string[];
}


export default function SeriesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [seriesList, setSeriesList] = useState<SeriesWithMatchCount[]>([]);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [clubName, setClubName] = useState<string>('');
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isStandingsModalOpen, setIsStandingsModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  
  const [isStandingsLoading, setIsStandingsLoading] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedSeriesForAction, setSelectedSeriesForAction] = useState<SeriesWithMatchCount | null>(null);
  const [leagueStandings, setLeagueStandings] = useState<AnglerStanding[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult>({});


  const [newSeriesName, setNewSeriesName] = useState('');

  // Fetch current user profile
  useEffect(() => {
    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDoc) => {
        if (userDoc.exists()) {
            const userProfile = { id: userDoc.id, ...userDoc.data() } as User;
            setCurrentUserProfile(userProfile);
            // For non-admins, set the selected club to their primary club
            if (userProfile.role !== 'Site Admin' && userProfile.primaryClubId) {
                setSelectedClubId(userProfile.primaryClubId);
            }
        } else {
            setIsLoading(false);
        }
    });

    return () => unsubscribeUser();
  }, [user]);

  // Fetch all clubs if user is a site admin
  useEffect(() => {
    if (currentUserProfile?.role === 'Site Admin' && firestore) {
        const clubsQuery = query(collection(firestore, 'clubs'), orderBy('name'));
        const unsubscribeClubs = onSnapshot(clubsQuery, (snapshot) => {
            const clubsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Club));
            setAllClubs(clubsData);
            if (!selectedClubId && clubsData.length > 0) {
                setSelectedClubId(clubsData[0].id); // Default to first club
            }
        });
        return () => unsubscribeClubs();
    }
  }, [currentUserProfile, selectedClubId]);


  // Fetch series and matches for the selected club
  useEffect(() => {
    if (!selectedClubId || !firestore) {
      setSeriesList([]);
      setClubName(currentUserProfile?.role === 'Site Admin' ? 'Please select a club' : 'No Club Selected');
      if (selectedClubId) setIsLoading(false);
      return;
    }
    
    setIsLoading(true);

    const clubDocRef = doc(firestore, 'clubs', selectedClubId);
    const unsubscribeClub = onSnapshot(clubDocRef, (clubDoc) => {
      setClubName(clubDoc.exists() ? clubDoc.data().name : 'Selected Club');
    });

    const seriesQuery = query(collection(firestore, 'series'), where("clubId", "==", selectedClubId));
    
    const unsubscribeSeries = onSnapshot(seriesQuery, async (seriesSnapshot) => {
      const seriesData = seriesSnapshot.docs.map(s => ({id: s.id, ...s.data()}) as Series);

      try {
        const matchesQuery = query(collection(firestore, 'matches'), where('clubId', '==', selectedClubId));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(m => m.data() as Match);

        const seriesWithCounts = seriesData.map(series => {
          const matchCount = matchesData.filter(m => m.seriesId === series.id).length;
          return {
            ...series,
            matchCount: matchCount,
          };
        });

        setSeriesList(seriesWithCounts);
      } catch (error) {
        console.error("Error fetching matches:", error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not fetch matches for series calculation.'
        });
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
        console.error("Error fetching series: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch series.' });
        setIsLoading(false);
    });

    return () => {
        unsubscribeClub();
        unsubscribeSeries();
    };

  }, [selectedClubId, toast, currentUserProfile]);
  
  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeriesName.trim() || !selectedClubId || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Series name and a selected club are required.' });
      return;
    }
    
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'series'), {
        name: newSeriesName,
        clubId: selectedClubId
      });
      toast({ title: 'Success!', description: `Series "${newSeriesName}" created.` });
      setNewSeriesName('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating series:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not create series.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (series: Series) => {
    setSelectedSeries(series);
    setIsEditDialogOpen(true);
  };
  
  const handleOpenStandingsModal = async (series: SeriesWithMatchCount) => {
    if (!firestore) return;
    setSelectedSeriesForAction(series);
    setIsStandingsModalOpen(true);
    setIsStandingsLoading(true);

    try {
        const resultsQuery = query(collection(firestore, 'results'), where('seriesId', '==', series.id));
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsData = resultsSnapshot.docs.map(doc => doc.data() as Result);
        
        // Group results by matchId to calculate section ranks for each match
        const resultsByMatch: { [matchId: string]: Result[] } = {};
        resultsData.forEach(result => {
            if (!resultsByMatch[result.matchId]) {
                resultsByMatch[result.matchId] = [];
            }
            resultsByMatch[result.matchId].push(result);
        });
        
        const resultsWithSectionRank: ResultWithSectionRank[] = [];

        // Calculate section ranks for each match
        for (const matchId in resultsByMatch) {
            const matchResults = resultsByMatch[matchId];
            const processedResults = calculateSectionRanks(matchResults);
            resultsWithSectionRank.push(...processedResults);
        }

        const anglerTotals: { [userId: string]: { userName: string; totalRank: number } } = {};
        
        resultsWithSectionRank.forEach(result => {
            const rank = result.sectionPosition;
            if (typeof rank === 'number' && rank > 0) {
                if (!anglerTotals[result.userId]) {
                    anglerTotals[result.userId] = {
                        userName: result.userName,
                        totalRank: 0,
                    };
                }
                anglerTotals[result.userId].totalRank += rank;
            }
        });

        const standings = Object.values(anglerTotals)
            .sort((a, b) => a.totalRank - b.totalRank)
            .map((angler, index) => ({
                rank: index + 1,
                userName: angler.userName,
                totalRank: angler.totalRank,
            }));
            
        setLeagueStandings(standings);
    } catch (error) {
        console.error("Error calculating standings: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not calculate league standings.' });
    } finally {
        setIsStandingsLoading(false);
    }
  }

  const handleAuditClick = async (series: SeriesWithMatchCount) => {
    if (!firestore) return;
    setSelectedSeriesForAction(series);
    setIsAuditModalOpen(true);
    setIsAuditing(true);
    setAuditResults({});
    
    try {
        // 1. Fetch all matches for the series
        const matchesQuery = query(collection(firestore, 'matches'), where('seriesId', '==', series.id));
        const matchesSnapshot = await getDocs(matchesQuery);
        const seriesMatches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
        
        if (seriesMatches.length === 0) {
            setIsAuditing(false);
            return;
        }

        // 2. Create a unique list of all anglers who participated
        const allAnglerIds = seriesMatches.flatMap(m => m.registeredAnglers);
        const uniqueAnglerIds = [...new Set(allAnglerIds)];
        
        if(uniqueAnglerIds.length === 0) {
            setIsAuditing(false);
            return;
        }
        
        // 3. Fetch angler details
        const anglersMap = new Map<string, User>();
        const chunks = [];
        for (let i = 0; i < uniqueAnglerIds.length; i += 30) {
            chunks.push(uniqueAnglerIds.slice(i, i + 30));
        }
        for (const chunk of chunks) {
            if (chunk.length === 0) continue;
            const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', chunk));
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(doc => anglersMap.set(doc.id, {id: doc.id, ...doc.data()} as User));
        }

        // 4. Check each angler against each match
        const missingAnglers: AuditResult = {};
        for (const anglerId of uniqueAnglerIds) {
            const angler = anglersMap.get(anglerId);
            if (!angler) continue;
            
            const anglerName = `${angler.firstName} ${angler.lastName}`;
            missingAnglers[anglerName] = [];
            
            for (const match of seriesMatches) {
                if (!match.registeredAnglers.includes(anglerId)) {
                    missingAnglers[anglerName].push(match.name);
                }
            }
            
            if (missingAnglers[anglerName].length === 0) {
                delete missingAnglers[anglerName];
            }
        }
        
        setAuditResults(missingAnglers);
    } catch(error) {
        console.error("Error during series audit:", error);
        toast({ variant: 'destructive', title: 'Audit Error', description: 'Could not complete the registration check.' });
    } finally {
        setIsAuditing(false);
    }
  };

  const handleDownloadAuditPdf = () => {
    if (!selectedSeriesForAction || Object.keys(auditResults).length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Data to Export',
            description: 'There are no audit results to generate a PDF.',
        });
        return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const margin = 15;
    const pageWidth = pdf.internal.pageSize.getWidth();
    let currentY = margin;

    // Header
    pdf.setFontSize(18);
    pdf.text(`Registration Audit`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    pdf.setFontSize(14);
    pdf.text(selectedSeriesForAction.name, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Content
    pdf.setFontSize(12);
    Object.entries(auditResults).forEach(([anglerName, matches]) => {
        if (currentY > pdf.internal.pageSize.getHeight() - margin - (7 * (matches.length + 2))) {
            pdf.addPage();
            currentY = margin;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text(anglerName, margin, currentY);
        currentY += 7;
        
        pdf.setFont('helvetica', 'normal');
        pdf.text('Missing from match(es):', margin + 5, currentY);
        currentY += 7;

        matches.forEach(matchName => {
            if (currentY > pdf.internal.pageSize.getHeight() - margin) {
                pdf.addPage();
                currentY = margin;
            }
            pdf.text(`- ${matchName}`, margin + 10, currentY);
            currentY += 7;
        });
        
        currentY += 5; // Extra space between anglers
    });

    pdf.save(`audit_report_${selectedSeriesForAction.name.replace(/ /g, '_')}.pdf`);
    toast({ title: 'Success', description: 'Audit report PDF has been downloaded.' });
  };


  const calculateSectionRanks = (results: Result[]): ResultWithSectionRank[] => {
    const resultsCopy: ResultWithSectionRank[] = results.map(r => ({ ...r }));
    
    const resultsBySection: { [key: string]: ResultWithSectionRank[] } = {};
    resultsCopy.forEach(result => {
      if (result.section) {
        if (!resultsBySection[result.section]) {
          resultsBySection[result.section] = [];
        }
        resultsBySection[result.section].push(result);
      }
    });

    for (const section in resultsBySection) {
        const sectionResultsWithWeight = resultsBySection[section]
            .filter(r => r.status === 'OK' && r.weight > 0)
            .sort((a, b) => b.weight - a.weight);

        sectionResultsWithWeight.forEach((result, index) => {
            const original = resultsCopy.find(r => r.userId === result.userId);
            if (original) {
              original.sectionPosition = index + 1;
            }
        });

        const lastSectionRank = sectionResultsWithWeight.length;
        const dnwSectionRank = lastSectionRank + 1;

        resultsBySection[section].forEach(result => {
            if (['DNF', 'DNW', 'DSQ'].includes(result.status || '')) {
                const original = resultsCopy.find(r => r.userId === result.userId);
                if (original) {
                    original.sectionPosition = dnwSectionRank;
                }
            }
        });
    }

    return resultsCopy;
  }

  const handleUpdateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeries || !firestore) return;

    setIsSaving(true);
    try {
        const seriesDocRef = doc(firestore, 'series', selectedSeries.id);
        await updateDoc(seriesDocRef, {
            name: selectedSeries.name,
        });
        toast({ title: 'Success!', description: `Series "${selectedSeries.name}" updated.` });
        setIsEditDialogOpen(false);
        setSelectedSeries(null);
    } catch (error) {
        console.error('Error updating series:', error);
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update series.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const canEdit = currentUserProfile?.role === 'Site Admin' || currentUserProfile?.role === 'Club Admin';

  const renderSeriesList = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
         <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
            {canEdit && <TableCell className="text-right"><Skeleton className="h-10 w-[120px]" /></TableCell>}
          </TableRow>
      ));
    }

    if (seriesList.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={canEdit ? 3 : 2} className="h-24 text-center">
            No series found for this club. Create the first one!
          </TableCell>
        </TableRow>
      );
    }

    return seriesList.map((series) => (
       <TableRow key={series.id}>
          <TableCell className="font-medium">{series.name}</TableCell>
          <TableCell>{series.matchCount}</TableCell>
          {canEdit && (
            <TableCell className="text-right space-x-2">
              <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => handleAuditClick(series)} disabled={series.matchCount === 0}>
                            <HelpCircle className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>Check registrations for series</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => handleOpenStandingsModal(series)} disabled={series.matchCount === 0}>
                            <Trophy className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>View league standings</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={() => handleEditClick(series)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        <p>Edit series</p>
                    </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </TableCell>
          )}
        </TableRow>
    ));
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Series</h1>
          <p className="text-muted-foreground">Manage your match series here.</p>
        </div>
        <div className="flex items-center gap-4">
            {currentUserProfile?.role === 'Site Admin' && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="club-filter" className="text-nowrap">Clubs</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId} disabled={allClubs.length === 0}>
                        <SelectTrigger id="club-filter" className="w-52">
                            <SelectValue placeholder="Select a club..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allClubs.map((club) => (
                                <SelectItem key={club.id} value={club.id}>
                                    {club.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            {canEdit && (
                <Button onClick={() => setIsCreateDialogOpen(true)} disabled={!selectedClubId}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Series
                </Button>
            )}
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>{clubName} Series</CardTitle>
            <CardDescription>A list of all match series for the selected club.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Series Name</TableHead>
                <TableHead>Match Count</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {renderSeriesList()}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleCreateSeries}>
            <DialogHeader>
              <DialogTitle>Create New Series</DialogTitle>
              <DialogDescription>
                Enter a name for the new series. It will be associated with the currently selected club: <span className="font-semibold">{clubName}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="series-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="series-name"
                  value={newSeriesName}
                  onChange={(e) => setNewSeriesName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Summer League 2024"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Creating...' : 'Create Series'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {selectedSeries && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={handleUpdateSeries}>
                    <DialogHeader>
                        <DialogTitle>Edit Series</DialogTitle>
                        <DialogDescription>
                            Update details for {selectedSeries.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-series-name">Series Name</Label>
                            <Input
                                id="edit-series-name"
                                value={selectedSeries.name}
                                onChange={(e) => setSelectedSeries({ ...selectedSeries, name: e.target.value })}
                                required
                            />
                        </div>
                         <p className="text-sm text-muted-foreground pt-4">Match counts are now calculated automatically. You can no longer edit them here.</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      )}

      {selectedSeriesForAction && (
        <Dialog open={isStandingsModalOpen} onOpenChange={setIsStandingsModalOpen}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>League Standings: {selectedSeriesForAction.name}</DialogTitle>
                    <DialogDescription>
                        Overall standings based on the sum of section positions from all completed matches in this series.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Rank</TableHead>
                                <TableHead>Angler Name</TableHead>
                                <TableHead>Total Section Rank</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isStandingsLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                    </TableRow>
                                ))
                            ) : leagueStandings.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No results with rankings recorded for this series yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                leagueStandings.map((angler) => (
                                    <TableRow key={angler.userName}>
                                        <TableCell>
                                            <Badge variant="outline">{angler.rank}</Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">{angler.userName}</TableCell>
                                        <TableCell>{angler.totalRank}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsStandingsModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

      {selectedSeriesForAction && (
        <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Registration Audit: {selectedSeriesForAction.name}</DialogTitle>
                    <DialogDescription>
                        A list of anglers who are not registered for all matches in this series. They should be added manually from the Matches page.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto mt-4 p-1">
                    {isAuditing ? (
                         <div className="flex items-center justify-center p-8">
                            <Skeleton className="h-24 w-full" />
                         </div>
                    ) : Object.keys(auditResults).length === 0 ? (
                        <p className="text-center text-muted-foreground p-8">
                            All anglers who have fished at least one match in this series are correctly registered for all matches.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(auditResults).map(([anglerName, matches]) => (
                                <Card key={anglerName}>
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base">{anglerName}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-sm font-medium mb-2">Missing from:</p>
                                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                            {matches.map(matchName => <li key={matchName}>{matchName}</li>)}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
                <DialogFooter className="sm:justify-between">
                     <Button 
                        variant="secondary" 
                        onClick={handleDownloadAuditPdf} 
                        disabled={isAuditing || Object.keys(auditResults).length === 0}
                    >
                        <Download className="mr-2 h-4 w-4"/>
                        Download PDF
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsAuditModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
