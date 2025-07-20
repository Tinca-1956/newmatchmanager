'use client';

import { useState, useEffect } from 'react';
import AppSidebarContent from './app-sidebar-content';

export default function AppSidebar() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      {isClient && <AppSidebarContent isMobile={false} />}
    </div>
  );
}
