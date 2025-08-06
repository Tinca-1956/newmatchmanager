
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardClient = dynamic(() => import('@/app/public/dashboard-client'), {
  ssr: false,
});

function DashboardSkeleton() {
    return (
        <div className="flex flex-col min-h-screen">
            <header className="flex h-14 items-center gap-4 border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
                <div className="flex items-center gap-2 cursor-default">
                    <Skeleton className="h-8 w-8 rounded-full bg-sidebar-accent" />
                    <Skeleton className="h-6 w-48 bg-sidebar-accent" />
                </div>
                <div className="ml-auto">
                    <Skeleton className="h-8 w-24" />
                </div>
            </header>
            <main className="flex-1 p-4 lg:p-6 bg-muted/40">
                <div className="flex flex-col gap-8">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">MATCH MANAGER - PUBLIC DASHBOARD</h1>
                            <p className="text-muted-foreground">Welcome to the public dashboard. Select a club to view details.</p>
                        </div>
                         <Skeleton className="h-10 w-48" />
                    </div>
                     <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-4">
                        <div className="lg:col-span-2">
                            <Skeleton className="h-96 w-full" />
                        </div>
                        <div>
                             <Skeleton className="h-96 w-full" />
                        </div>
                        <div>
                           <Skeleton className="h-96 w-full" />
                        </div>
                    </div>
                </div>
            </main>
             <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
                Copyright EMANCIUM 2025 - All rights reserved
            </footer>
        </div>
    );
}

export default function PublicDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}
