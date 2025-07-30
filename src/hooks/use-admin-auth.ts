
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
    // This is the most reliable source of truth immediately after login.
    setUserRole(userProfile.role);
    setClaimsLoading(false);
    
    // We can still try to refresh the token in the background to sync claims,
    // but we no longer wait for it, preventing the UI from being blocked.
    user.getIdTokenResult(true).then(idTokenResult => {
        const claims = idTokenResult.claims;
        const roleFromClaims = claims.role as UserRole | undefined;
        if (roleFromClaims && roleFromClaims !== userProfile.role) {
            console.warn("User role mismatch between claims and Firestore. Using claims role.");
            setUserRole(roleFromClaims);
        }
    }).catch(error => {
        console.error("Could not refresh token for claims in background:", error);
    });

  }, [user, userProfile, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || claimsLoading };
};
