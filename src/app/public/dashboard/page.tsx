
'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardClient = dynamic(() => import('@/app/public/dashboard-client'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

function DashboardSkeleton() {
    return (
    <div className="flex flex-col gap-8">
      <div>
        <Skeleton className="h-9 w-1/2" />
        <Skeleton className="h-5 w-3/4 mt-2" />
      </div>

       <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-4 mb-2">
                <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-5 w-12" />
                    <Skeleton className="h-10 w-48" />
                </div>
            </div>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Upcoming Matches</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            </CardContent>
        </Card>

         <Card className="flex flex-col lg:col-span-1">
            <CardHeader>
                <CardTitle>Recent Results</CardTitle>
                 <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="flex-grow">
                 <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PublicDashboardPage() {
  return <DashboardClient />;
}
