
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Match, Series, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"


interface CheckAnglersModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: Series | null;
}

interface DiscrepancyReport {
  anglerId: string;
  anglerName: string;
  missingFrom: { matchId: string; matchName: string }[];
}

export function CheckAnglersModal({ isOpen, onClose, series }: CheckAnglersModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<DiscrepancyReport[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && series && firestore) {
      const runCheck = async () => {
        setIsLoading(true);
        setReport([]);

        try {
          // 1. Fetch all matches in the series
          const matchesQuery = query(collection(firestore, 'matches'), where('seriesId', '==', series.id));
          const matchesSnapshot = await getDocs(matchesQuery);
          const matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));

          if (matches.length === 0) {
            setIsLoading(false);
            return;
          }

          // 2. Create a superset of all unique anglers across all matches
          const allAnglerIds = new Set<string>();
          matches.forEach(match => {
            match.registeredAnglers.forEach(anglerId => allAnglerIds.add(anglerId));
          });

          if (allAnglerIds.size === 0) {
            setIsLoading(false);
            return;
          }

          // 3. Fetch user data for all unique anglers
          const usersQuery = query(collection(firestore, 'users'), where('__name__', 'in', Array.from(allAnglerIds)));
          const usersSnapshot = await getDocs(usersQuery);
          const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, doc.data() as User]));

          // 4. Identify discrepancies
          const newReport: DiscrepancyReport[] = [];
          
          allAnglerIds.forEach(anglerId => {
            const missingFrom: { matchId: string; matchName: string }[] = [];
            matches.forEach(match => {
              if (!match.registeredAnglers.includes(anglerId)) {
                missingFrom.push({ matchId: match.id, matchName: match.name });
              }
            });

            if (missingFrom.length > 0) {
              const angler = usersMap.get(anglerId);
              if (angler) {
                newReport.push({
                  anglerId,
                  anglerName: `${angler.firstName} ${angler.lastName}`,
                  missingFrom,
                });
              }
            }
          });

          setReport(newReport);

        } catch (error) {
          console.error("Error checking anglers:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not perform angler check.' });
        } finally {
          setIsLoading(false);
        }
      };

      runCheck();
    }
  }, [isOpen, series, toast]);

  if (!series) return null;

  const renderReport = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 pt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    
    if (report.length === 0) {
      return (
        <Alert variant="default" className="mt-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-green-800 dark:text-green-300">All Good!</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
                All anglers registered in this series are consistently registered across all matches.
            </AlertDescription>
        </Alert>
      )
    }

    return (
        <Accordion type="single" collapsible className="w-full">
            {report.map(item => (
                <AccordionItem value={item.anglerId} key={item.anglerId}>
                    <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-2">
                             <AlertCircle className="h-5 w-5 text-amber-500" />
                            <span className="font-semibold">{item.anglerName}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <p className="px-4 pb-2 text-sm text-muted-foreground">Is missing from the following {item.missingFrom.length} match(es):</p>
                         <ul className="list-disc pl-10 text-sm text-foreground/80">
                           {item.missingFrom.map(match => (
                               <li key={match.matchId}>{match.matchName}</li>
                           ))}
                       </ul>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-auto max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Angler Consistency Check</DialogTitle>
          <DialogDescription>
            Checking for anglers who are not registered in all matches for the <span className="font-semibold">{series.name}</span> series.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden pt-4">
             <ScrollArea className="h-full pr-6">
               {renderReport()}
            </ScrollArea>
        </div>

        <DialogFooter className="pt-4">
            <Button variant="outline" onClick={onClose}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
