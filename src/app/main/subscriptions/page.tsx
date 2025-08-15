
'use client';

import { useState, useEffect }from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscriptionsPage() {
  const { userProfile } = useAuth();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userProfile?.primaryClubId && firestore) {
      const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
      getDoc(clubDocRef).then(docSnap => {
        if (docSnap.exists()) {
          setClub(docSnap.data() as Club);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [userProfile]);
  
  const clubName = club?.name || '<PRIMARY CLUB>';
  const expiryDate = club?.subscriptionExpiryDate ? format((club.subscriptionExpiryDate as Timestamp).toDate(), 'PPP') : '<EXPIRY DATE>';
  const subject = `RENEWED SUBSCRIPTION FOR ${clubName}`;
  const body = `Dear Match Manager,

Please renew our annual subscription for ${clubName}.

I understand that upon receipt of this email you will issue me with an invoice from PAY PAL.
I understand that the subscription may take 24 hours to be renewed after payment has been made.
I also understand that if this invoice remains unpaid by ${clubName} by ${expiryDate} neither club administrators or members will be able to access the app.

Warmest regards`;

  const mailtoLink = `mailto:stuart@emancium.com.au?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
  
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="max-w-2xl mx-auto p-8 space-y-8">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-8 w-80" />
                <Skeleton className="h-6 w-96" />
                <Skeleton className="h-12 w-48" />
            </div>
        </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
                Subscriptions
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
                Annual subscription fee is U$50 per club.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
                Your email client will now open. Please review the details before sending.
            </p>
            <Button asChild size="lg">
                <a href={mailtoLink}>Send me an invoice</a>
            </Button>
        </div>
    </div>
  );
}
