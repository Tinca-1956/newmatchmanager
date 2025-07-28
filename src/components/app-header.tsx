
'use client';

import { useState, useEffect } from 'react';
import { Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import AppSidebarContent from './app-sidebar-content';
import { UserNav } from './user-nav';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function AppHeader() {
  const { user, userProfile, loading } = useAuth();
  const [primaryClubName, setPrimaryClubName] = useState<string | null>(null);

  useEffect(() => {
    const fetchClubName = async () => {
        if (userProfile?.primaryClubId && firestore) {
            try {
                const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
                const clubDoc = await getDoc(clubDocRef);
                if (clubDoc.exists()) {
                    setPrimaryClubName(clubDoc.data().name);
                } else {
                    setPrimaryClubName('Club not found');
                }
            } catch (error) {
                console.error('Error fetching primary club name:', error);
                setPrimaryClubName('Error loading club');
            }
        } else if (userProfile) {
            setPrimaryClubName('No primary club selected');
        }
    };
    
    if (!loading) {
        fetchClubName();
    }
  }, [userProfile, loading]);

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
           <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <AppSidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-default">
                        <Shield className="h-5 w-5 text-sidebar-foreground/70" />
                        {loading ? (
                            <Skeleton className="h-6 w-48 bg-sidebar-accent" />
                        ) : (
                            <span className="font-bold text-lg">{primaryClubName}</span>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                    <p className="text-left">To change the displayed club, edit your profile</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      <UserNav />
    </header>
  );
}

    