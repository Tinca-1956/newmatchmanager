
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import type { Club } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function RegisterPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const [clubName, setClubName] = useState<string>('');
  const [isClubLoading, setIsClubLoading] = useState(true);

  useEffect(() => {
    const fetchClubName = async () => {
      if (userProfile?.primaryClubId && firestore) {
        try {
          const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
          const clubDoc = await getDoc(clubDocRef);
          if (clubDoc.exists()) {
            setClubName((clubDoc.data() as Club).name);
          } else {
            setClubName('Club not found');
          }
        } catch (error) {
          console.error("Error fetching club name:", error);
          setClubName('Error fetching club');
        } finally {
          setIsClubLoading(false);
        }
      } else if (userProfile) {
        setIsClubLoading(false);
      }
    };
    
    if (!authLoading) {
      fetchClubName();
    }
  }, [userProfile, authLoading]);

  const isLoading = authLoading || isClubLoading;
  const canRegister = userProfile?.memberStatus === 'Member';

  const renderUserDetails = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
           <div className="space-y-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      );
    }
    
    if (!userProfile) {
        return <p>User profile not found.</p>;
    }

    return (
       <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={userProfile.firstName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={userProfile.lastName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Primary Club</Label>
            <Input value={clubName || 'N/A'} disabled />
          </div>
          <div className="space-y-2">
            <Label>Membership Status</Label>
            <Input value={userProfile.memberStatus} disabled />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={userProfile.role} disabled />
          </div>
        </div>
    );
  };
  
  const renderEligibilityAlert = () => {
    if (isLoading) {
      return <Skeleton className="h-24 w-full" />;
    }
    
    if (canRegister) {
        return (
            <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle className="text-green-800 dark:text-green-300">You are eligible to register!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400">
                    Your membership status is 'Member', so you can register for any upcoming matches in your primary club that are not full.
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Registration Not Available</AlertTitle>
            <AlertDescription>
                You cannot register for matches because your membership status is currently '{userProfile?.memberStatus}'. It must be 'Member'. Please contact your club administrator if you believe this is an error.
            </AlertDescription>
        </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Register for a Match</h1>
            <p className="text-muted-foreground">Check your status and view available matches.</p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Your Details</CardTitle>
                <CardDescription>This information determines your eligibility to register for matches in your primary club.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
               {renderUserDetails()}
               {renderEligibilityAlert()}
            </CardContent>
        </Card>
    </div>
  );
}
