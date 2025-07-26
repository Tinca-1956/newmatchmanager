
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Match } from '@/lib/types';
import { useToast } from './use-toast';

export const useMatchActions = () => {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [isAnglerListModalOpen, setIsAnglerListModalOpen] = useState(false);

  const [selectedMatchForModal, setSelectedMatchForModal] = useState<Match | null>(null);
  const [selectedMatchIdForModal, setSelectedMatchIdForModal] = useState<string | null>(null);


  const handleViewResults = (match: Match) => {
    if (match.status === 'Completed') {
      setSelectedMatchForModal(match);
      setIsResultsModalOpen(true);
    } else {
      toast({
        variant: 'default',
        title: 'Results Not Available',
        description: 'Results are only available for completed matches.',
      });
    }
  };

  const handleEditMatch = (matchId: string) => {
    toast({
        title: 'Action Not Implemented',
        description: `Edit functionality for match ${matchId} is not yet available.`,
    });
  };
  
  const handleViewAnglers = (matchId: string) => {
     setSelectedMatchIdForModal(matchId);
     setIsAnglerListModalOpen(true);
  };
  
  const handleManagePegs = (matchId: string) => {
     toast({
        title: 'Action Not Implemented',
        description: `Angler List for match ${matchId} is not yet available.`,
    });
  };

   const handleWeighIn = (matchId: string) => {
     toast({
        title: 'Action Not Implemented',
        description: `Weigh-in for match ${matchId} is not yet available.`,
    });
  };

  const handleRegister = (matchId: string) => {
     toast({
        title: 'Action Not Implemented',
        description: `Registration for match ${matchId} is not yet available.`,
    });
  };

  const closeResultsModal = () => {
    setIsResultsModalOpen(false);
    setSelectedMatchForModal(null);
  };
  
  const closeAnglerListModal = () => {
    setIsAnglerListModalOpen(false);
    setSelectedMatchIdForModal(null);
  }

  return {
    isResultsModalOpen,
    isAnglerListModalOpen,
    selectedMatchForModal,
    selectedMatchIdForModal,
    handleViewResults,
    handleEditMatch,
    handleRegister,
    handleViewAnglers,
    handleManagePegs,
    handleWeighIn,
    closeResultsModal,
    closeAnglerListModal,
  };
};
