
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from '@/lib/types';

export default function DashboardPage() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<User | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as User);
      }
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userProfile?.firstName || 'Angler'}. Here&apos;s what&apos;s happening in
          your club.
        </p>
      </div>

      {/* Page content has been cleared as requested */}
    </div>
  );
}
