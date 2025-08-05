
'use client';

import { useAuth } from './use-auth';
import type { UserRole } from '@/lib/types';

interface AdminAuth {
    isSiteAdmin: boolean;
    isClubAdmin: boolean;
    loading: boolean;
    userRole: UserRole | null;
}

export const useAdminAuth = (): AdminAuth => {
  const { userProfile, loading: authLoading } = useAuth();
  
  // The hook is no longer loading if the top-level auth hook is no longer loading.
  // This simplifies the logic and ensures we have a definitive state.
  const loading = authLoading;

  const userRole = userProfile?.role || null;
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading };
};
