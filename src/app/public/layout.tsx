import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Fish, LogIn, Info } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
       <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
         <AuthProvider>
            <div className="flex flex-col min-h-screen">
                <header className="flex h-14 items-center justify-between px-4 lg:px-6 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
                    <Link href="/public/dashboard" className="flex items-center gap-2 font-semibold text-lg">
                        <Fish className="h-6 w-6" />
                        <span>MATCH MANAGER</span>
                         <span className="font-light text-base pl-2">- PUBLIC DASHBOARD</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Button asChild variant="link" className="text-white">
                            <Link href="/public/learn-more">
                                <Info className="mr-2 h-4 w-4" />
                                Learn More
                            </Link>
                        </Button>
                        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                           <Link href="/auth/login">
                             <LogIn className="mr-2 h-4 w-4" />
                             Sign In / Register
                           </Link>
                        </Button>
                    </div>
                </header>
                <main className="flex-grow">
                    {children}
                </main>
                 <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
                    Copyright EMANCIUM 2025 - All rights reserved
                </footer>
            </div>
            <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
