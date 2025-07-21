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

interface UserProfile {
    firstName: string;
    lastName: string;
    role: string;
}

export function UserNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);

  useEffect(() => {
    async function fetchUserProfile() {
      if (user && firestore) {
        setIsFetchingProfile(true);
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setProfile({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                role: data.role || 'Angler'
            });
          } else {
             // Fallback for user doc not created yet, get from auth displayName
            const nameParts = (user.displayName || '').split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            setProfile({
                firstName,
                lastName,
                role: 'Angler'
            })
          }
        } catch (error) {
          console.error("Error fetching user profile: ", error);
          setProfile({ firstName: 'User', lastName: '', role: 'Angler'}); // Fallback profile
        } finally {
          setIsFetchingProfile(false);
        }
      } else {
        setIsFetchingProfile(false);
      }
    }

    if (!loading) {
      fetchUserProfile();
    }
  }, [user, loading]);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push('/login');
  };

  if (loading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  if (!user) {
    return null;
  }

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
             {isFetchingProfile ? (
                <>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                </>
            ) : (
                <>
                    <p className="text-sm font-medium leading-none">{`${profile?.firstName} ${profile?.lastName}`}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {user.email} {profile?.role && `(${profile.role})`}
                    </p>
                </>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
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
