import PublicFooter from '@/components/public-footer';
import PublicHeader from '@/components/public-header';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicHeader />
      <main className="flex-1 bg-muted/40">
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
