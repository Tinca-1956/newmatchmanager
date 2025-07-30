
'use client';

import { useState, useEffect } from 'react';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { auth, firestore } from '@/lib/firebase-client';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { User, LogOut } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import type { User as UserProfileType } from '@/lib/types';


export function UserNav() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/auth/login');
  };

  if (loading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (!user) {
    return null;
  }
  
  const displayName = userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : user.displayName || 'User';
  const displayEmail = user.email || 'No email';
  const displayRole = userProfile?.role ? `(${userProfile.role})` : '';


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
            variant="ghost" 
            className="relative h-8 w-8 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-transparent"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-transparent text-sidebar-foreground">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
             {loading ? (
                <>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                </>
            ) : (
                <>
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {displayEmail} {displayRole}
                    </p>
                </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/main/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
