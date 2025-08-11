
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase-client';
import { doc, updateDoc } from 'firebase/firestore';
import type { Match } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';

interface MatchDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  canEdit: boolean;
}

export function MatchDescriptionModal({ isOpen, onClose, match, canEdit }: MatchDescriptionModalProps) {
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (match) {
      setDescription(match.description || '');
    }
  }, [match]);

  const handleSave = async () => {
    if (!match || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Match data is not available.' });
      return;
    }

    setIsSaving(true);
    try {
      const matchDocRef = doc(firestore, 'matches', match.id);
      await updateDoc(matchDocRef, {
        description: description,
      });
      toast({ title: 'Success', description: 'Match description has been updated.' });
      onClose();
    } catch (error) {
      console.error('Error updating description:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update the description.' });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Description</DialogTitle>
          <DialogDescription>
            Details for {match.name}. {canEdit ? "You can edit the description below." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {canEdit ? (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[150px]"
                placeholder="Enter any notes, rules, or extra details about the match..."
              />
            </div>
          ) : (
            <ScrollArea className="h-48 rounded-md border p-4">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {description || 'No description has been provided for this match.'}
                </p>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Description'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
