import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AppSidebarContent from './app-sidebar-content';
import { UserNav } from './user-nav';

export default function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-sidebar text-sidebar-foreground px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden bg-transparent border-primary-foreground/20 hover:bg-primary-foreground/10 text-primary-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <AppSidebarContent isMobile={true} />
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        {/* Can add a search form here if needed */}
      </div>
      <UserNav />
    </header>
  );
}
