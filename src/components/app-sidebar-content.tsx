
'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Shield,
  Users,
  Trophy,
  Swords,
  Medal,
  Info,
  Fish,
  User as UserIcon,
  FlaskConical,
  Trash2,
  Beaker,
  TestTube,
  CalendarDays,
} from 'lucide-react';
import { SheetClose } from './ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { firestore } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/main/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/main/profile', icon: UserIcon, label: 'Profile' },
  { href: '/main/clubs', icon: Shield, label: 'Clubs' },
  { href: '/main/members', icon: Users, label: 'Members', adminOnly: true },
  { href: '/main/series', icon: Trophy, label: 'Series', memberOnly: true },
  { href: '/main/matches', icon: Swords, label: 'Matches', memberOnly: true },
  { href: '/main/results', icon: Medal, label: 'Results', memberOnly: true },
  { href: '/main/users/deleted', icon: Trash2, label: 'Deleted Users', adminOnly: true, siteAdminOnly: true },
  { href: '/main/admin/seed', icon: Beaker, label: 'Seed Data', adminOnly: true, siteAdminOnly: true },
  { href: '/main/test-access', icon: TestTube, label: 'Test Access', adminOnly: true, siteAdminOnly: true },
  { href: '/main/emulator', icon: FlaskConical, label: 'Emulator', adminOnly: true, emulatorOnly: true },
  { href: '/main/about', icon: Info, label: 'About' },
];

interface AppSidebarContentProps {
  isMobile: boolean;
}

function NavMenu({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEmulatorMode, setIsEmulatorMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      setIsEmulatorMode(true);
    }
    // The loading state will be managed by the parent's auth check.
    // If we have a userProfile, we can consider it loaded.
    if(userProfile) {
      setIsLoading(false);
    }

  }, [userProfile]);

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
      const isSiteAdmin = userProfile?.role === 'Site Admin';
      const isClubAdmin = userProfile?.role === 'Club Admin';
      const isMember = userProfile?.memberStatus === 'Member';
      const isAngler = userProfile?.role === 'Angler';

      if (item.emulatorOnly && !isEmulatorMode) {
          return false;
      }
      
      if (item.siteAdminOnly && !isSiteAdmin) {
          return false;
      }

      if (item.adminOnly && !isSiteAdmin && !isClubAdmin) {
          return false;
      }
      
      if (item.memberOnly && !isMember) {
          return false;
      }
      
      return true;
  }).sort((a, b) => {
      const adminOrder = ['/main/admin/edit-seed-users', '/main/users/deleted', '/main/admin/seed', '/main/emulator', '/main/test-access'];
      const aIndex = adminOrder.indexOf(a.href);
      const bIndex = adminOrder.indexOf(b.href);
      
      if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
      }
      if (aIndex !== -1) return 1; // Put admin items at the bottom
      if (bIndex !== -1) return -1;
      return 0;
  });

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {sortedNavItems.map((item) => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/main/dashboard');

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
