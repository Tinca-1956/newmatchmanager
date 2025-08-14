
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
import { doc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Match, StandardText } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from './ui/skeleton';

interface MatchDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  canEdit: boolean;
}

export function MatchDescriptionModal({ isOpen, onClose, match, canEdit }: MatchDescriptionModalProps) {
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [standardTexts, setStandardTexts] = useState<StandardText[]>([]);
  const [isLoadingTexts, setIsLoadingTexts] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (match) {
      setDescription(match.description || '');
    }
  }, [match]);

  useEffect(() => {
    if (isOpen && canEdit && match?.clubId && firestore) {
      setIsLoadingTexts(true);
      const textsQuery = query(
        collection(firestore, 'Standard_Texts'),
        where('clubId', '==', match.clubId)
      );
      const unsubscribe = onSnapshot(textsQuery, (snapshot) => {
        const textsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StandardText));
        setStandardTexts(textsData);
        setIsLoadingTexts(false);
      }, (error) => {
        console.error("Error fetching standard texts:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch standard texts.' });
        setIsLoadingTexts(false);
      });
      return () => unsubscribe();
    }
  }, [isOpen, match, canEdit, toast]);

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

  const handleInsertText = (textId: string) => {
    if (!textId) return;
    const selectedText = standardTexts.find(t => t.id === textId);
    if (selectedText) {
      setDescription(prev => {
        // Add a clean separation if there's existing text.
        const separator = prev ? '\n\n---\n\n' : '';
        return `${prev}${separator}${selectedText.content}`;
      });
    }
  };
  
  if (!match) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Match Description</DialogTitle>
          <DialogDescription>
            Details for {match.name}. {canEdit ? "You can edit the description or insert a standard text." : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {canEdit && (
            <div className="space-y-2">
              <Label htmlFor="standard-text-select">Insert Standard Text</Label>
              {isLoadingTexts ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select onValueChange={handleInsertText} value="">
                  <SelectTrigger id="standard-text-select">
                    <SelectValue placeholder="Select a text to insert..." />
                  </SelectTrigger>
                  <SelectContent>
                    {standardTexts.length > 0 ? (
                      standardTexts.map(text => (
                        <SelectItem key={text.id} value={text.id}>{text.summary}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No standard texts found</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
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
