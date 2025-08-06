
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-muted/40">
      {children}
       <footer className="text-center p-4 text-sm text-sidebar-foreground bg-sidebar border-t border-sidebar-border">
          Copyright EMANCIUM 2025 - All rights reserved
        </footer>
    </div>
  );
}
