
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
  CreditCard,
} from 'lucide-react';
import { SheetClose } from './ui/sheet';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';

const navItems = [
  { href: '/main/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['Site Admin', 'Club Admin', 'Angler'] },
  { href: '/main/clubs', icon: Shield, label: 'Clubs', roles: ['Site Admin'] },
  { href: '/main/clubs-club-admin', icon: Shield, label: 'My Club', roles: ['Club Admin'] },
  { href: '/main/members', icon: Users, label: 'Members', roles: ['Site Admin'] },
  { href: '/main/members-club-admin', icon: Users, label: 'Club Members', roles: ['Club Admin'] },
  { href: '/main/series', icon: Trophy, label: 'Series', roles: ['Site Admin', 'Club Admin'] },
  { href: '/main/matches', icon: Swords, label: 'Matches', roles: ['Site Admin', 'Club Admin'] },
  { href: '/main/register', icon: LogIn, label: 'Register for Match', roles: ['Angler'] },
  { href: '/main/weigh-in-site-admins', icon: Scale, label: 'Weigh-in', roles: ['Site Admin'] },
  { href: '/main/weigh-in-club-admin', icon: Scale, label: 'Weigh-in', roles: ['Club Admin'] },
  { href: '/main/results', icon: Medal, label: 'Results', roles: ['Site Admin', 'Club Admin', 'Angler'] },
  { href: '/main/gallery', icon: ImageIcon, label: 'Image Gallery', roles: ['Site Admin', 'Club Admin', 'Angler'] },
  { href: '/main/standard-texts', icon: FileTextIcon, label: 'Standard Texts', roles: ['Site Admin', 'Club Admin'] },
  { href: '/main/subscriptions', icon: CreditCard, label: 'Subscription', roles: ['Site Admin', 'Club Admin'] },
  { href: '/main/profile', icon: UserIcon, label: 'Profile', roles: ['Site Admin', 'Club Admin', 'Angler'] },
  { href: '/main/help', icon: HelpCircle, label: 'Help Admin', roles: ['Site Admin'] },
  { href: '/main/help-user', icon: HelpCircle, label: 'Help', roles: ['Club Admin', 'Angler'] },
  { href: '/main/contact', icon: MessageSquare, label: 'Contact Admin', roles: ['Angler'] },
  { href: '/main/about', icon: Info, label: 'About', roles: ['Site Admin', 'Club Admin', 'Angler'] },
  { href: '/main/users/deleted', icon: Trash2, label: 'Deleted Users', roles: ['Site Admin'] },
  { href: '/main/test-access', icon: TestTube, label: 'Test Access', roles: ['Site Admin'] },
  { href: '/main/emulator', icon: FlaskConical, label: 'Emulator', roles: ['Site Admin', 'Club Admin'], emulatorOnly: true },
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

  const filteredNavItems = navItems.filter((item) => {
      if (!userProfile) return false;
      if (item.emulatorOnly && !isEmulatorMode) return false;
      return item.roles.includes(userProfile.role);
  });
  
  const linkClasses = (href: string) => `flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
        (pathname === href || (pathname.startsWith(href) && href !== '/main/dashboard'))
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-primary hover:text-sidebar-foreground/70'
    }`;

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {filteredNavItems.map((item) => {
        const linkContent = (
          <Link
            href={item.href}
            className={linkClasses(item.href)}
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
