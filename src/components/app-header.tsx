import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserNav } from './user-nav';
import { Menu } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-primary px-4 text-primary-foreground sm:justify-end">
      <div className="sm:hidden">
        <SidebarTrigger>
          <Menu className="h-6 w-6" />
        </SidebarTrigger>
      </div>
      <div className="flex items-center gap-4">
        <UserNav />
      </div>
    </header>
  );
}
