
'use client';

import React, { useState, useEffect, useContext, createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/lib/types';


interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      setProfileLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setAuthLoading(false);
      if (!user) {
        // If user logs out, clear profile and stop profile loading
        setUserProfile(null);
        setProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && firestore) {
      setProfileLoading(true);
      const userDocRef = doc(firestore, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserProfile({ id: doc.id, ...doc.data() } as User);
        } else {
          // User is authenticated but profile doesn't exist yet
          // (e.g., first login before club selection)
          setUserProfile(null);
        }
        setProfileLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setUserProfile(null);
        setProfileLoading(false);
      });
      
      return () => unsubscribe();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading: authLoading || profileLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export const useRequireAuth = (redirectUrl = '/login') => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
        if(!pathname.startsWith('/auth')) {
            router.push(redirectUrl);
        }
    }
  }, [user, loading, router, redirectUrl, pathname]);

  return { user, loading };
};

    