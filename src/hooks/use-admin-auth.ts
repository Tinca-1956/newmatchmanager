
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
    if (authLoading) {
      return;
    }
    
    if (!user) {
        setUserRole(null);
        setClaimsLoading(false);
        return;
    }

    setClaimsLoading(true);
    // Force a token refresh to ensure the latest custom claims are loaded.
    // This is crucial for newly signed-in admins.
    user.getIdTokenResult(true).then(idTokenResult => {
        const claims = idTokenResult.claims;
        const role = claims.role as UserRole | undefined;
        setUserRole(role || null);
        setClaimsLoading(false);
    }).catch(error => {
        console.error("Error fetching user claims:", error);
        setUserRole(null);
        setClaimsLoading(false);
    });

  }, [user, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || claimsLoading };
};
