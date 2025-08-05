'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Fish } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-16 items-center justify-between border-b bg-black text-white px-6">
        <div className="flex items-center gap-2">
          <Fish className="h-6 w-6" />
          <span className="font-bold">MATCH MANAGER - PUBLIC DASHBOARD</span>
        </div>
        <div className="flex items-center gap-4">
           <Button asChild variant="link" className="text-white">
                <Link href="/public/learn-more">Learn More</Link>
            </Button>
            <Button asChild variant="secondary" className="bg-white text-black hover:bg-gray-200">
                <Link href="/auth/login">Sign In</Link>
            </Button>
        </div>
      </header>
      <main className="flex-grow">
        {children}
      </main>
      <footer className="text-center p-4 text-sm text-white bg-black border-t">
        Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </div>
  );
}
