import Link from 'next/link';
import { Fish, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="flex h-14 items-center justify-between border-b bg-black px-4 text-white lg:h-[60px] lg:px-6">
          <Link href="/public/dashboard" className="flex items-center gap-2 font-semibold">
              <Fish className="h-6 w-6" />
              <span className="">MATCH MANAGER</span>
          </Link>
          <div className="flex items-center gap-4">
               <Button asChild variant="ghost" className="text-white hover:bg-gray-800 hover:text-white">
                  <Link href="/public/learn-more">
                      Learn More
                  </Link>
              </Button>
              <Button asChild variant="outline" className="bg-black text-white hover:bg-gray-800 hover:text-white border-gray-600">
                  <Link href="/auth/login">
                      Login / Register
                      <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
              </Button>
          </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
       <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
