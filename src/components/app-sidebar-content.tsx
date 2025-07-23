'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Shield,
  Users,
  CircleUserRound,
  Trophy,
  Swords,
  Medal,
  UserCog,
  Info,
  Fish,
  User as UserIcon,
  FlaskConical,
  Trash2,
} from 'lucide-react';
import { SheetClose } from './ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/profile', icon: UserIcon, label: 'Profile' },
  { href: '/clubs', icon: Shield, label: 'Clubs' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/marshals', icon: CircleUserRound, label: 'Marshals' },
  { href: '/series', icon: Trophy, label: 'Series' },
  { href: '/matches', icon: Swords, label: 'Matches' },
  { href: '/results', icon: Medal, label: 'Results' },
  { href: '/users', icon: UserCog, label: 'Users', adminOnly: true },
  { href: '/users/deleted', icon: Trash2, label: 'Deleted Users', adminOnly: true },
  { href: '/emulator', icon: FlaskConical, label: 'Emulator', adminOnly: true, emulatorOnly: true },
  { href: '/about', icon: Info, label: 'About' },
];

interface AppSidebarContentProps {
  isMobile: boolean;
}

function NavMenu({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmulatorMode, setIsEmulatorMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      setIsEmulatorMode(true);
    }

    if (!user || !firestore) {
      setIsLoading(false);
      return;
    }
    const userDocRef = doc(firestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setCurrentUserProfile({ id: doc.id, ...doc.data() } as User);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, [user]);

  if (isLoading) {
    return (
       <div className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  const sortedNavItems = navItems.filter(item => {
      if (item.adminOnly && currentUserProfile?.role !== 'Site Admin') {
          return false;
      }
      if (item.emulatorOnly && !isEmulatorMode) {
          return false;
      }
      return true;
  }).sort((a,b) => {
      // Special sort to place "Deleted Users" right after "Users"
      if (a.href === '/users/deleted' && b.href === '/users') return 1;
      if (a.href === '/users' && b.href === '/users/deleted') return -1;
      return 0;
  })

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {sortedNavItems.map((item) => {
        const isActive =
          (item.href !== '/' && pathname.startsWith(item.href)) || pathname === item.href;

        const linkContent = (
          <Link
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-primary hover:text-sidebar-foreground/70'
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );

        if (onLinkClick) {
          return (
            <SheetClose asChild key={item.href}>
              {linkContent}
            </SheetClose>
          );
        }

        return <div key={item.href}>{linkContent}</div>;
      })}
    </nav>
  );
}

export default function AppSidebarContent({ isMobile }: AppSidebarContentProps) {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  return (
    <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Fish className="h-6 w-6" />
          <span className="">Match Manager</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavMenu onLinkClick={isMobile ? () => {} : undefined} />
      </div>
    </div>
  );
}
