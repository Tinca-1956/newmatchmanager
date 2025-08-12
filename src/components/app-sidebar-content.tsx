
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
  Beaker,
  TestTube,
  PlusCircle,
  Trash2,
  Scale,
  HelpCircle,
  LogIn,
  Image as ImageIcon,
  MessageSquare,
  FileText as FileTextIcon,
} from 'lucide-react';
import { SheetClose } from './ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/main/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/main/clubs', icon: Shield, label: 'Clubs - Site Admin', siteAdminOnly: true },
  { href: '/main/clubs-club-admin', icon: Shield, label: 'Clubs - Club Admin', adminOnly: true },
  { href: '/main/members', icon: Users, label: 'Members - Site Admin', siteAdminOnly: true },
  { href: '/main/members-club-admin', icon: Users, label: 'Members - Club Admin', adminOnly: true, siteAdminOnly: true },
  { href: '/main/series', icon: Trophy, label: 'Series - Club Admin', adminOnly: true },
  { href: '/main/matches', icon: Swords, label: 'Matches - Site Admin', siteAdminOnly: true },
  { href: '/main/matches-club-admin', icon: Swords, label: 'Matches - Club Admin', adminOnly: true },
  { href: '/main/register', icon: LogIn, label: 'Register' },
  { href: '/main/weigh-in-site-admins', icon: Scale, label: 'Weigh in - Site Admin', siteAdminOnly: true },
  { href: '/main/weigh-in-club-admin', icon: Scale, label: 'Weigh in - Club Admin', adminOnly: true },
  { href: '/main/results-site-admin', icon: Medal, label: 'Results - Site Admin', siteAdminOnly: true },
  { href: '/main/results', icon: Medal, label: 'Results' },
  { href: '/main/gallery', icon: ImageIcon, label: 'Image Gallery' },
  { href: '/main/standard-texts', icon: FileTextIcon, label: 'Standard Text - Club Admin', adminOnly: true },
  { href: '/main/profile', icon: UserIcon, label: 'Profile' },
  { href: '/main/help', icon: HelpCircle, label: 'Help - Site Admin', siteAdminOnly: true },
  { href: '/main/help-user', icon: HelpCircle, label: 'Help' },
  { href: '/main/contact', icon: MessageSquare, label: 'Contact' },
  { href: '/main/about', icon: Info, label: 'About' },
  { href: '/main/users/deleted', icon: Trash2, label: 'Deleted Users - Site Admin', siteAdminOnly: true },
  { href: '/main/test-access', icon: TestTube, label: 'Test Access - Site Admin', siteAdminOnly: true },
  { href: '/main/series-angler', icon: Trophy, label: 'Series - Angler', anglerOnly: true },
  { href: '/main/matches-angler', icon: Swords, label: 'Matches - Angler', anglerOnly: true },
  { href: '/main/emulator', icon: FlaskConical, label: 'Emulator', adminOnly: true, emulatorOnly: true },
];

interface AppSidebarContentProps {
  isMobile: boolean;
}

function NavMenu({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEmulatorMode, setIsEmulatorMode] = useState(false);

  // Effect for checking emulator mode
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      setIsEmulatorMode(true);
    }
    if (userProfile) {
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

  const sortedNavItems = navItems.filter((item: any) => {
      if (!userProfile) return false; // Don't show any items if profile is not loaded

      const isSiteAdmin = userProfile.role === 'Site Admin';
      const isClubAdmin = userProfile.role === 'Club Admin';
      const isAngler = userProfile.role === 'Angler';
      
      // All users see the Register link
      if (item.href === '/main/register') {
          return true;
      }
      
      if (item.emulatorOnly && !isEmulatorMode) {
          return false;
      }
      
      if (item.siteAdminOnly && !isSiteAdmin) {
          return false;
      }
      
      if (item.clubAdminOnly && !isClubAdmin) {
        return false;
      }

      if (item.adminOnly && !isSiteAdmin && !isClubAdmin) {
          return false;
      }

      if (item.anglerOnly && !isAngler) {
        return false;
      }
      
      return true;
  }).sort((a, b) => {
      const adminOrder = ['/main/admin/seed', '/main/users/deleted', '/main/emulator', '/main/test-access'];
      const aIndex = adminOrder.indexOf(a.href);
      const bIndex = adminOrder.indexOf(b.href);
      
      if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
      }
      if (aIndex !== -1) return 1; // Put admin items at the bottom
      if (bIndex !== -1) return -1;
      return 0;
  });

  const linkClasses = (isActive: boolean) => `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
        isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-primary hover:text-sidebar-foreground/70'
    }`;

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {sortedNavItems.map((item) => {
        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/main/dashboard'  && item.href !== '/main/clubs');

        const linkContent = (
          <Link
            href={item.href}
            className={linkClasses(isActive)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.label}</span>
          </Link>
        );

        if (onLinkClick) {
          return (
            <SheetClose asChild key={item.href + item.label}>
              {linkContent}
            </SheetClose>
          );
        }

        return <div key={item.href + item.label}>{linkContent}</div>;
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
