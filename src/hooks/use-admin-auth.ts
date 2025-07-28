
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserRole } from '@/lib/types';

interface AdminAuth {
    isSiteAdmin: boolean;
    isClubAdmin: boolean;
    loading: boolean;
    userRole: UserRole | null;
}

export const useAdminAuth = (): AdminAuth => {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      setUserRole(null);
      return;
    }

    if (!firestore) {
      setLoading(false);
      setUserRole(null);
      console.error("Firestore not initialized for admin check");
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserRole(doc.data().role as UserRole);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error checking admin status:", error);
      setUserRole(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || loading };
};
