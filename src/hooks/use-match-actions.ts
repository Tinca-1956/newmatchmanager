

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Match, Result as ResultType, PublicMatch, PublicResult } from '@/lib/types';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, updateDoc, arrayUnion, increment, collection, query, where, getDocs, setDoc } from 'firebase/firestore';


export const useMatchActions = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isAnglerListModalOpen, setIsAnglerListModalOpen] = useState(false);
  const [isDisplayAnglerListModalOpen, setIsDisplayAnglerListModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRemoveAnglerModalOpen, setIsRemoveAnglerModalOpen] = useState(false);

  const [selectedMatchForModal, setSelectedMatchForModal] = useState<Match | null>(null);
  const [selectedMatchIdForModal, setSelectedMatchIdForModal] = useState<string | null>(null);


  const handleViewResults = (match: Match) => {
    setSelectedMatchForModal(match);
    setIsResultsModalOpen(true);
  };

  const handleEditMatch = (match: Match) => {
    setSelectedMatchForModal(match);
    setIsEditModalOpen(true);
  };
  
  const handleAddAnglers = (matchId: string) => {
     setSelectedMatchIdForModal(matchId);
     setIsAnglerListModalOpen(true);
  };

  const handleRemoveAnglers = (match: Match) => {
    setSelectedMatchForModal(match);
    setIsRemoveAnglerModalOpen(true);
  }

  const handleViewAnglerList = (match: Match) => {
    setSelectedMatchForModal(match);
    setIsDisplayAnglerListModalOpen(true);
  };

  const handleManageImages = (matchId: string) => {
    router.push(`/main/matches/${matchId}/images`);
  };
  
  const handleManagePegs = (matchId: string) => {
     toast({
        title: 'Action Not Implemented',
        description: `Angler List for match ${matchId} is not yet available.`,
    });
  };

   const handleWeighIn = (matchId: string) => {
     router.push(`/main/matches/${matchId}/weigh-in`);
  };

  const handlePublish = async (match: Match) => {
    if (!firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'Database connection not available.' });
        return;
    }

    toast({ title: 'Publishing...', description: 'Preparing public results data.' });

    try {
        // 1. Fetch club name
        const clubDocRef = doc(firestore, 'clubs', match.clubId);
        const clubDoc = await getDoc(clubDocRef);
        const clubName = clubDoc.exists() ? clubDoc.data().name : 'Unknown Club';

        // 2. Fetch all associated results
        const resultsQuery = query(collection(firestore, 'results'), where('matchId', '==', match.id));
        const resultsSnapshot = await getDocs(resultsQuery);
        const resultsData = resultsSnapshot.docs.map(doc => doc.data() as ResultType);

        if (resultsData.length === 0) {
            toast({ variant: 'destructive', title: 'No Results', description: 'Cannot publish a match with no results.' });
            return;
        }

        // 3. Calculate ranks
        const rankedResults = calculateRanks(resultsData);

        // 4. Sanitize data for public consumption
        const publicResults: PublicResult[] = rankedResults.map(r => ({
            userId: r.userId,
            userName: r.userName,
            peg: r.peg || '',
            section: r.section || '',
            weight: r.weight,
            status: r.status || 'OK',
            position: r.position,
            sectionRank: r.sectionRank || null,
        }));
        
        const publicMatchData: PublicMatch = {
            id: match.id,
            clubId: match.clubId,
            clubName: clubName,
            seriesId: match.seriesId,
            seriesName: match.seriesName,
            name: match.name,
            location: match.location,
            date: match.date, // Keep as Timestamp or Date object
            status: match.status,
            paidPlaces: match.paidPlaces,
            results: publicResults,
            mediaUrls: match.mediaUrls || [],
        };

        // 5. Write to the `publicMatches` collection, using the match ID as the document ID
        const publicMatchDocRef = doc(firestore, 'publicMatches', match.id);
        await setDoc(publicMatchDocRef, publicMatchData);

        toast({ title: 'Success!', description: `Match results for "${match.name}" have been published.` });

    } catch (error) {
        console.error("Error publishing match:", error);
        toast({ variant: 'destructive', title: 'Publish Failed', description: 'Could not publish match results.' });
    }
  };

  const handleRegister = async (match: Match) => {
     if (!user || !userProfile || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to register.' });
        return;
     }

     if (match.registeredCount >= match.capacity) {
        toast({ variant: 'destructive', title: 'Match Full', description: 'This match has reached its capacity.' });
        return;
     }

     try {
        const matchDocRef = doc(firestore, 'matches', match.id);
        await updateDoc(matchDocRef, {
            registeredAnglers: arrayUnion(user.uid),
            registeredCount: increment(1)
        });
        toast({ title: 'Success!', description: `You have been registered for ${match.name}.` });
     } catch (error) {
        console.error("Error registering for match: ", error);
        toast({ variant: 'destructive', title: 'Registration Failed', description: 'Could not register you for the match.' });
     }
  };
  
    const calculateRanks = (results: ResultType[]): (ResultType & { sectionRank?: number | null })[] => {
        // This function calculates both overall and section ranks.
        // It assumes the `position` (overall rank) is already on the result objects.
        const resultsWithRanks = results.map(r => ({ ...r, sectionRank: null as number | null }));

        const resultsBySection: { [key: string]: typeof resultsWithRanks } = {};
        resultsWithRanks.forEach(result => {
            const section = result.section || 'default';
            if (!resultsBySection[section]) resultsBySection[section] = [];
            resultsBySection[section].push(result);
        });

        for (const sectionKey in resultsBySection) {
            const sectionResults = resultsBySection[sectionKey];
            const sortedSection = sectionResults
                .filter(r => r.status === 'OK' && r.weight > 0)
                .sort((a, b) => b.weight - a.weight);

            const lastRank = sortedSection.length;
            const dnwRank = lastRank + 1;

            sectionResults.forEach(result => {
                const indexInMainList = resultsWithRanks.findIndex(r => r.userId === result.userId);
                if (indexInMainList === -1) return;

                if (result.status === 'OK' && result.weight > 0) {
                    const rank = sortedSection.findIndex(r => r.userId === result.userId);
                    resultsWithRanks[indexInMainList].sectionRank = rank !== -1 ? rank + 1 : null;
                } else if (['DNW', 'DNF', 'DSQ'].includes(result.status || '')) {
                    resultsWithRanks[indexInMainList].sectionRank = dnwRank;
                }
            });
        }
        return resultsWithRanks;
    };


  const closeResultsModal = () => {
    setIsResultsModalOpen(false);
    setSelectedMatchForModal(null);
  };
  
  const closeAnglerListModal = () => {
    setIsAnglerListModalOpen(false);
    setSelectedMatchIdForModal(null);
  };
  
  const closeDisplayAnglerListModal = () => {
    setIsDisplayAnglerListModalOpen(false);
    setSelectedMatchForModal(null);
  };
  
  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedMatchForModal(null);
  }

  const closeRemoveAnglerModal = () => {
    setIsRemoveAnglerModalOpen(false);
    setSelectedMatchForModal(null);
  }

  return {
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
    handleAddAnglers,
    handleRemoveAnglers,
    handleViewAnglerList,
    handleManagePegs,
    handleWeighIn,
    handleManageImages,
    handlePublish,
    closeResultsModal,
    closeAnglerListModal,
    closeDisplayAnglerListModal,
    closeEditModal,
    closeRemoveAnglerModal,
  };
};
