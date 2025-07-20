'use client';

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
} from 'lucide-react';
import { mockUser } from '@/lib/mock-data';
import { SheetClose } from './ui/sheet';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clubs', icon: Shield, label: 'Clubs' },
  { href: '/members', icon: Users, label: 'Members' },
  { href: '/marshals', icon: CircleUserRound, label: 'Marshals' },
  { href: '/series', icon: Trophy, label: 'Series' },
  { href: '/matches', icon: Swords, label: 'Matches' },
  { href: '/results', icon: Medal, label: 'Results' },
  { href: '/users', icon: UserCog, label: 'Users', adminOnly: true },
  { href: '/about', icon: Info, label: 'About' },
];

interface AppSidebarContentProps {
  isMobile: boolean;
}

function NavMenu({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname();
  const userRole = mockUser.role;

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => {
        if (item.adminOnly && userRole !== 'Site Admin') {
          return null;
        }
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));

        const linkContent = (
          <Link
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
              isActive
                ? 'bg-muted text-primary'
                : 'text-muted-foreground hover:text-primary'
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
  return (
    <div className="flex h-full max-h-screen flex-col gap-2 bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Fish className="h-6 w-6" />
          <span className="">Match Manager</span>
        </Link>
      </div>
      <div className="flex-1">
        <NavMenu onLinkClick={isMobile ? () => {} : undefined} />
      </div>
    </div>
  );
}
