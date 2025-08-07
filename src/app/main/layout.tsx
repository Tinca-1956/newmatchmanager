
'use client';

import AppHeader from '@/components/app-header';
import AppSidebar from '@/components/app-sidebar';
import { useRequireAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useRequireAuth('/auth/login');

  if (loading) {
    return (
       <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
             <Skeleton className="h-12 w-12 rounded-full" />
             <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
             </div>
          </div>
       </div>
    );
  }
  
  if (!user) {
    return null;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[198px_1fr] lg:grid-cols-[252px_1fr]">
      <AppSidebar />
      <div className="flex flex-col h-screen">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/40 overflow-y-auto">
          {children}
        </main>
        <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
      </div>
    </div>
  );
}
