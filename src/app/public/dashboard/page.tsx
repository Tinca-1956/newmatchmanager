'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicDashboardClient } from '@/app/public/dashboard-client';

// Dynamically import the client component with SSR turned off
const DashboardClient = dynamic(() => import('@/app/public/dashboard-client').then(mod => mod.PublicDashboardClient), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

function DashboardSkeleton() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
            <header className="bg-gray-900 text-white p-4 shadow-md">
                <div className="container mx-auto">
                    <h1 className="text-xl font-bold">MATCH MANAGER</h1>
                </div>
            </header>
            <main className="flex-grow container mx-auto p-4 sm:p-6 md:p-8">
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Skeleton className="h-96 w-full" />
                    </div>
                    <div className="lg:col-span-1">
                        <Skeleton className="h-96 w-full" />
                    </div>
                </div>
            </main>
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
