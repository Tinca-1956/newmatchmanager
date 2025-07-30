
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
    const fetchClaims = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        setUserRole(null);
        setClaimsLoading(false);
        return;
      }
      
      setClaimsLoading(true);
      try {
        // Force a refresh of the user's ID token to get the latest custom claims.
        const idTokenResult = await user.getIdTokenResult(true);
        const claims = idTokenResult.claims;
        const roleFromClaims = claims.role as UserRole | undefined;

        // Use the role from claims if available, otherwise fall back to the Firestore profile role.
        // This makes the UI more resilient if claims are slow to update.
        if (roleFromClaims) {
            setUserRole(roleFromClaims);
        } else if (userProfile?.role) {
            setUserRole(userProfile.role);
        } else {
            setUserRole(null);
        }

      } catch (error) {
        console.error("Error fetching user token with claims:", error);
         // Fallback to profile role on error
        setUserRole(userProfile?.role || null);
      } finally {
        setClaimsLoading(false);
      }
    };
    
    fetchClaims();

  }, [user, userProfile, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || claimsLoading };
};
