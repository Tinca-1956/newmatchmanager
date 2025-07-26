
'use client';

// This is a minimal layout for the focused mobile results page.
// It does not include the main sidebar or header.
export default function MobileResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen w-full bg-background">
      {children}
    </main>
  );
}
