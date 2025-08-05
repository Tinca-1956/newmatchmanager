'use client';

import { Button } from '@/components/ui/button';
import { Fish, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-sidebar px-4 md:px-6 text-sidebar-foreground z-50">
        <Link href="/public/dashboard" className="flex items-center gap-2 font-semibold text-white">
          <Fish className="h-6 w-6" />
          <span className="hidden sm:inline-block">MATCH MANAGER</span>
        </Link>
        <div className="flex items-center gap-4">
           <Button asChild variant="outline" className="bg-transparent text-white hover:bg-white/10 hover:text-white border-white/50">
              <Link href="/auth/login">
              Login / Register
              <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
          </Button>
        </div>
      </header>
      <main className="flex-grow">{children}</main>
       <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </div>
  );
}