'use client';

import { Button } from '@/components/ui/button';

export default function SubscriptionsPage() {
  const clubName = '<PRIMARY CLUB>';
  const expiryDate = '<EXPIRY DATE>';
  const subject = `RENEWED SUBSCRIPTION FOR ${clubName}`;
  const body = `Dear Match Manager,

Please renew our annual subscription for ${clubName}.

I understand that upon receipt of this email you will issue me with an invoice from PAY PAL.
I understand that the subscription may take 24 hours to be renewed after payment has been made.
I also understand that if this invoice remains unpaid by ${clubName} by ${expiryDate} neither club administrators or members will be able to access the app.

Warmest regards`;

  const mailtoLink = `mailto:stuart@emancium.com.au?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
                Subscriptions
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
                Annual subscription fee is U$50 per club.
            </p>
            <p className="mb-8 text-sm text-muted-foreground">
                NOTE: Please replace the placeholder text in the email with your correct details before sending.
            </p>
            <Button asChild size="lg">
                <a href={mailtoLink}>Send me an invoice</a>
            </Button>
        </div>
    </div>
  );
}
