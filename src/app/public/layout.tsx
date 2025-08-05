
import { Fish } from 'lucide-react';
import Link from 'next/link';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-14 items-center justify-between border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
        <Link href="/public/dashboard" className="flex items-center gap-2 font-semibold">
            <Fish className="h-6 w-6" />
            <span className="">Match Manager</span>
        </Link>
        {/* Placeholder for future actions like a login button */}
      </header>
      <main className="flex-1 bg-muted/40 p-4 lg:p-6">
        {children}
      </main>
      <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
