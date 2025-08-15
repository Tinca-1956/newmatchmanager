
'use client';

import { Button } from '@/components/ui/button';

export default function SubscriptionsPage() {
  const clubNamePlaceholder = '<YOUR CLUB NAME>';
  const expiryDatePlaceholder = '<YOUR CLUB EXPIRY DATE>';

  const subject = `RENEWED SUBSCRIPTION FOR ${clubNamePlaceholder}`;
  const body = `Dear Match Manager,

Please renew our annual subscription for ${clubNamePlaceholder}.

I understand that upon receipt of this email you will issue me with an invoice from PAY PAL.
I understand that the subscription may take 24 hours to be renewed after payment has been made. 
I also understand that if this invoice remains unpaid by ${expiryDatePlaceholder} neither club administrators or members will be able to access the app.

Warmest regards`;

  const mailtoLink = `mailto:stuart@emancium.com.au?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight mb-4">SUBSCRIPTIONS</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Annual subscription fee is U$50 per club.
      </p>
      <Button asChild size="lg">
        <a href={mailtoLink}>
          Send me an invoice
        </a>
      </Button>
      <p className="text-sm text-muted-foreground mt-8">
        Note: You will need to manually replace the placeholder text in the email with your club's details.
      </p>
    </div>
  );
}
