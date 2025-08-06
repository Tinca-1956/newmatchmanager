
'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Fish } from 'lucide-react';
import PublicHeader from '@/components/public-header';

// Dynamically import the client component with SSR turned off
const DashboardClient = dynamic(() => import('@/app/public/dashboard-client'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

function DashboardSkeleton() {
  return (
    <>
      <PublicHeader />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="flex justify-end mb-6">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-[500px] w-full rounded-lg" />
          </div>
        </div>
      </main>
    </>
  );
}

export default function PublicDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}
