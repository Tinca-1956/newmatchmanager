
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
  const { userProfile, loading: authLoading } = useAuth();
  
  const userRole = userProfile?.role || null;
  const isSiteAdmin = userRole === 'Site Admin';
  const isClubAdmin = userRole === 'Club Admin';

  return { isSiteAdmin, isClubAdmin, userRole, loading: authLoading };
};
