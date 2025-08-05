import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Fish } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight">
                Public Dashboard
            </h1>
        </div>
        <div className="flex items-center gap-2">
           <Button asChild variant="ghost">
                <Link href="/public/learn-more">
                    Learn More
                </Link>
            </Button>
          <Button asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
      </main>
      <footer className="text-center p-4 text-sm text-muted-foreground border-t">
        Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </div>
  );
}
