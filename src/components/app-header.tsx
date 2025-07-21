
'use client';

import { useState, useEffect } from 'react';
import { Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AppSidebarContent from './app-sidebar-content';
import { UserNav } from './user-nav';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppHeader() {
  const { user } = useAuth();
  const [primaryClubName, setPrimaryClubName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPrimaryClub() {
      if (user && firestore) {
        setIsLoading(true);
        try {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const primaryClubId = userData.primaryClubId;

            if (primaryClubId) {
              const clubDocRef = doc(firestore, 'clubs', primaryClubId);
              const clubDoc = await getDoc(clubDocRef);

              if (clubDoc.exists()) {
                setPrimaryClubName(clubDoc.data().name);
              } else {
                setPrimaryClubName('No primary club selected');
              }
            } else {
              setPrimaryClubName('No primary club selected');
            }
          }
        } catch (error) {
          console.error('Error fetching primary club:', error);
          setPrimaryClubName('Error loading club');
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }

    fetchPrimaryClub();
  }, [user]);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <AppSidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sidebar-foreground/70" />
            {isLoading ? (
                <Skeleton className="h-6 w-48 bg-sidebar-accent" />
            ) : (
                <span className="font-bold text-lg">{primaryClubName}</span>
            )}
        </div>
      </div>

      <UserNav />
    </header>
  );
}
