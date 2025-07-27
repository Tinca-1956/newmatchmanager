
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Match } from '@/lib/types';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';


export const useMatchActions = () => {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
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
  
  const handleManagePegs = (matchId: string) => {
     toast({
        title: 'Action Not Implemented',
        description: `Angler List for match ${matchId} is not yet available.`,
    });
  };

   const handleWeighIn = (matchId: string) => {
     router.push(`/main/matches/${matchId}/weigh-in`);
  };

  const handleRegister = async (match: Match) => {
     if (!user || !firestore) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to register.' });
        return;
     }

     if (match.registeredCount >= match.capacity) {
        toast({ variant: 'destructive', title: 'Match Full', description: 'This match has reached its capacity.' });
        return;
     }

     if (match.registeredAnglers?.includes(user.uid)) {
        toast({ title: 'Already Registered', description: 'You are already registered for this match.' });
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
    closeResultsModal,
    closeAnglerListModal,
    closeDisplayAnglerListModal,
    closeEditModal,
    closeRemoveAnglerModal,
  };
};
