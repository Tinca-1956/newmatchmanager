
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
  const { user, loading: authLoading } = useAuth();
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
        setUserRole(roleFromClaims || null);
      } catch (error) {
        console.error("Error fetching user token with claims:", error);
        setUserRole(null);
      } finally {
        setClaimsLoading(false);
      }
    };
    
    fetchClaims();

  }, [user, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || claimsLoading };
};
