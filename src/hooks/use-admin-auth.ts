
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import type { UserRole } from '@/lib/types';

interface AdminAuth {
    isSiteAdmin: boolean;
    isClubAdmin: boolean;
    loading: boolean;
    userRole: UserRole | null;
}

export const useAdminAuth = (): AdminAuth => {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    // This effect now prioritizes the userProfile for role information,
    // making the hook much more resilient to token claim propagation delays.
    if (authLoading) {
      return;
    }
    
    if (!user || !userProfile) {
        setUserRole(null);
        setClaimsLoading(false);
        return;
    }

    setClaimsLoading(true);
    // Directly use the role from the user's Firestore document.
    // This is the most reliable source of truth immediately after login or on profile updates.
    setUserRole(userProfile.role);
    setClaimsLoading(false);
    
    // We can still try to refresh the token in the background to sync claims,
    // but we no longer wait for it, preventing the UI from being blocked.
    // This ensures that even if claims are slow to update, the UI reflects the correct role from the DB.
    user.getIdTokenResult(true).then(idTokenResult => {
        const claims = idTokenResult.claims;
        const roleFromClaims = claims.role as UserRole | undefined;
        // If claims exist and are different, log it, but trust the DB for immediate UI.
        if (roleFromClaims && roleFromClaims !== userProfile.role) {
            console.warn(`User role mismatch. Firestore says "${userProfile.role}", claims say "${roleFromClaims}". Using Firestore role for UI.`);
        }
    }).catch(error => {
        console.error("Could not refresh token for claims in background:", error);
    });

  }, [user, userProfile, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || claimsLoading };
};
