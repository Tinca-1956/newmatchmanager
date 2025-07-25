
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Match } from '@/lib/types';
import { useToast } from './use-toast';

export const useMatchActions = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<Match | null>(null);

  const handleViewResults = (match: Match) => {
    if (match.status === 'Completed') {
      setSelectedMatchForModal(match);
      setIsModalOpen(true);
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
     toast({
        title: 'Action Not Implemented',
        description: `View/Manage Anglers for match ${matchId} is not yet available.`,
    });
  };
  
  const handleManagePegs = (matchId: string) => {
     toast({
        title: 'Action Not Implemented',
        description: `Manage Pegs for match ${matchId} is not yet available.`,
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

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedMatchForModal(null);
  };

  return {
    isModalOpen,
    selectedMatchForModal,
    handleViewResults,
    handleEditMatch,
    handleRegister,
    handleViewAnglers,
    handleManagePegs,
    handleWeighIn,
    closeModal,
  };
};
