
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Match } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

interface ViewOnlyMatchDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

export function ViewOnlyMatchDescriptionModal({ isOpen, onClose, match }: ViewOnlyMatchDescriptionModalProps) {
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (match) {
      setDescription(match.description || '');
    }
  }, [match]);
  
  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Description</DialogTitle>
          <DialogDescription>
            Details for {match.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <ScrollArea className="h-48 rounded-md border p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {description || 'No description has been provided for this match.'}
                </p>
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
