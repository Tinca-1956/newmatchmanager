
import PublicHeader from '@/components/public-header';
import PublicFooter from '@/components/public-footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-grow bg-muted/40">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
