import AppHeader from '@/components/app-header';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex h-14 items-center justify-end gap-4 border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
        {/* Intentionally simple header for the public view */}
      </header>
      <main className="flex-1 bg-muted/40 p-4 lg:p-6">
        {children}
      </main>
      <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
      </footer>
    </div>
  );
}
