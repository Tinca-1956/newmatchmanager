import PublicHeader from '@/components/public-header';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <PublicHeader />
      <main className="flex-grow bg-muted/40">{children}</main>
      <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </div>
  );
}
