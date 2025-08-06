
'use client';

import { Fish } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { UserNav } from '@/components/user-nav';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-14 items-center justify-between border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
        <div className="flex items-center gap-2">
          <Fish className="h-6 w-6" />
          <h1 className="font-bold text-lg">MATCH MANAGER</h1>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
             <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse" />
          ) : user ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/main/dashboard">Dashboard</Link>
              </Button>
              <UserNav />
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link href="/main/about">Learn More</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </header>
      <main className="flex-1 p-4 lg:p-6 bg-muted/40">
        {children}
      </main>
      <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
