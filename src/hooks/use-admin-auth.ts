
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
    
    setLoading(true);
    // Force a refresh of the user's ID token to get the latest custom claims.
    user.getIdTokenResult(true).then((idTokenResult) => {
        const claims = idTokenResult.claims;
        const roleFromClaims = claims.role as UserRole | undefined;
        setUserRole(roleFromClaims || null);
        setLoading(false);
    }).catch(error => {
        console.error("Error fetching user token with claims:", error);
        setUserRole(null);
        setLoading(false);
    });

  }, [user, authLoading]);
  
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading || loading };
};
