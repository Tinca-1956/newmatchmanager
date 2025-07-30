
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
import type { Club } from '@/lib/types';
import Image from 'next/image';

export default function AppHeader() {
  const { user, userProfile, loading } = useAuth();
  const [primaryClub, setPrimaryClub] = useState<Club | null>(null);
  const [isClubLoading, setIsClubLoading] = useState(true);

  useEffect(() => {
    const fetchClub = async () => {
        if (userProfile?.primaryClubId && firestore) {
            setIsClubLoading(true);
            try {
                const clubDocRef = doc(firestore, 'clubs', userProfile.primaryClubId);
                const clubDoc = await getDoc(clubDocRef);
                if (clubDoc.exists()) {
                    setPrimaryClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
                } else {
                    setPrimaryClub(null);
                }
            } catch (error) {
                console.error('Error fetching primary club:', error);
                setPrimaryClub(null);
            } finally {
              setIsClubLoading(false);
            }
        } else if (userProfile) {
            setPrimaryClub(null);
            setIsClubLoading(false);
        }
    };
    
    if (!loading) {
        fetchClub();
    }
  }, [userProfile, loading]);

  const renderClubInfo = () => {
    if (loading || isClubLoading) {
      return (
        <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full bg-sidebar-accent" />
            <Skeleton className="h-6 w-48 bg-sidebar-accent" />
        </div>
      )
    }

    if (primaryClub && primaryClub.imageUrl) {
        return (
            <div className="flex items-center gap-2 cursor-default">
                <Image src={primaryClub.imageUrl} alt={`${primaryClub.name} logo`} width={32} height={32} className="rounded-full" />
                <span className="font-bold text-lg">{primaryClub.name}</span>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2 cursor-default">
            <span className="font-bold text-lg">{primaryClub?.name || 'No Primary Club'}</span>
        </div>
    )
  }

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
                    {renderClubInfo()}
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start">
                    <p className="text-left">To change the displayed club, edit your profile.</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
      </div>

      <UserNav />
    </header>
  );
}
