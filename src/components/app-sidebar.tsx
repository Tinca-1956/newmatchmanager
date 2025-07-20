
'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
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

export default function AppSidebar() {
  const pathname = usePathname();
  const userRole = mockUser.role;
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="desktop" className="bg-sidebar text-sidebar-foreground">
      <SidebarContent>
        <SidebarHeader className="p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={handleLinkClick}
          >
            <Fish className="h-8 w-8 text-sidebar-primary" />
            <h1 className="text-xl font-semibold text-sidebar-primary-foreground">
              Match Manager
            </h1>
          </Link>
        </SidebarHeader>
        <SidebarMenu>
          {navItems.map((item) => {
            if (item.adminOnly && userRole !== 'Site Admin') {
              return null;
            }
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} onClick={handleLinkClick}>
                  <SidebarMenuButton isActive={isActive} className="w-full">
                    <item.icon className="h-5 w-5" />
                    <span className="truncate">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
