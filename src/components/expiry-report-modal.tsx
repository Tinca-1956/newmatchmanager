'use client';

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
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Club } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

interface ExpiryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  expiringClubs: Club[];
}

export function ExpiryReportModal({ isOpen, onClose, expiringClubs }: ExpiryReportModalProps) {

  if (!isOpen || expiringClubs.length === 0) {
    return null;
  }
  
  const formatDate = (dateValue: Date | Timestamp | undefined): string => {
    if (!dateValue) return 'N/A';
    if (dateValue instanceof Timestamp) {
      return format(dateValue.toDate(), 'PPP');
    }
    if (dateValue instanceof Date) {
      return format(dateValue, 'PPP');
    }
    // Attempt to parse if it's a string or number, though this path is less likely with the fix.
    try {
      const d = new Date(dateValue as any);
      if (!isNaN(d.getTime())) {
        return format(d, 'PPP');
      }
    } catch (e) {
       return 'Invalid Date';
    }
    return 'Invalid Date';
  }


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-amber-500" />
            Club Subscription Expiry Report
          </DialogTitle>
          <DialogDescription>
            The following clubs have subscriptions expiring within the next 30 days.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Club Name</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiringClubs.map((club) => (
                <TableRow key={club.id}>
                  <TableCell className="font-medium">{club.name}</TableCell>
                  <TableCell>{formatDate(club.subscriptionExpiryDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
