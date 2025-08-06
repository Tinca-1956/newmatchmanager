
'use client';

import { Fish } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PublicHeader() {
  const pathname = usePathname();
  const isLearnMorePage = pathname === '/public/learn-more';

  return (
    <header className="flex h-16 items-center justify-between border-b bg-sidebar px-4 sm:px-6 text-sidebar-foreground sticky top-0 z-50">
      <Link href="/public/dashboard" className="flex items-center gap-2">
        <Fish className="h-6 w-6" />
        <h1 className="text-xl font-bold">MATCH MANAGER</h1>
      </Link>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" className="text-sidebar-foreground hover:bg-sidebar-accent">
          {isLearnMorePage ? (
            <Link href="/public/dashboard">Dashboard</Link>
          ) : (
            <Link href="/public/learn-more">Learn more</Link>
          )}
        </Button>
        <Button asChild variant="secondary">
          <Link href="/auth/login">Sign In</Link>
        </Button>
      </div>
    </header>
  );
}
