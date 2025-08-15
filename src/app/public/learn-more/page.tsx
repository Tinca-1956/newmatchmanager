'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LearnMorePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
                Learn More About Match Manager
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
                The ultimate tool for managing your fishing club's matches, members, and results with ease.
            </p>
            <div className="space-y-4">
                <Button asChild size="lg">
                    <Link href="mailto:stuart@emancium.com.au?subject=MATCH MANAGER - ADD NEW CLUB ENQUIRY&body=Dear Stuart,%0A%0AI am interested in learning more about MATCH MANAGER for my club.%0A%0AHere are my club details:%0A%0AClub/association name%09%09:%09FILL IN DETAILS HERE%0ANumber of members%09%09%09:%09FILL IN MEMBER NUMBER HERE%0ANumber of matches per year%09:%09FILL IN MATCH NUMBER HERE%0ACountry%09%09%09%09%09:%09FILL IN COUNTRY HERE%0AState/County/Province%09%09%09:%09FILL IN COUNTY HERE%0A%0AWarmest regards%0A%0AYOUR FULL NAME HERE">Get your club added to MATCH MANAGER</Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
                    <Link href="/main/subscriptions">Renew my club subscription</Link>
                </Button>
            </div>
        </div>
    </div>
  );
}
