
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

export const useAdminAuth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setLoading(false);
      setIsSiteAdmin(false);
      return;
    }

    if (!firestore) {
      setLoading(false);
      setIsSiteAdmin(false);
      console.error("Firestore not initialized for admin check");
      return;
    }

    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists() && doc.data().role === 'Site Admin') {
        setIsSiteAdmin(true);
      } else {
        setIsSiteAdmin(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error checking admin status:", error);
      setIsSiteAdmin(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  return { isSiteAdmin, loading };
};
