
'use client';

import { useState } from 'react';
import type { Match } from '@/lib/types';

// A simplified hook for actions available to an Angler on the matches page.
export const useAnglerMatchActions = () => {
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [selectedMatchForModal, setSelectedMatchForModal] = useState<Match | null>(null);

  const handleViewDescription = (match: Match) => {
    setSelectedMatchForModal(match);
    setIsDescriptionModalOpen(true);
  };

  const closeDescriptionModal = () => {
    setIsDescriptionModalOpen(false);
    setSelectedMatchForModal(null);
  };

  return {
    isDescriptionModalOpen,
    selectedMatchForModal,
    handleViewDescription,
    closeDescriptionModal,
  };
};
