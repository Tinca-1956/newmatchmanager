
'use client';

import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Notification, Blog } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user || !firestore) {
      setNotifications([]);
      setHasUnread(false);
      return;
    }

    const notificationsQuery = query(
      collection(firestore, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(notificationsQuery, async (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      
      // Get all unique blog post IDs from the notifications
      const postIds = [...new Set(notifsData.map(n => n.entityId))];
      
      if (postIds.length === 0) {
        setNotifications([]);
        setHasUnread(false);
        return;
      }
      
      // Fetch the actual blog posts to ensure they still exist
      const postsQuery = query(collection(firestore, 'blogs'), where('__name__', 'in', postIds));
      const postsSnapshot = await getDocs(postsQuery);
      const existingPostIds = new Set(postsSnapshot.docs.map(doc => doc.id));
      
      // Filter out notifications for deleted posts
      const validNotifications = notifsData.filter(n => existingPostIds.has(n.entityId));

      // Sort on the client side by date
      validNotifications.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
      });

      // Limit to the latest 20 valid notifications
      const limitedNotifications = validNotifications.slice(0, 20);
      setNotifications(limitedNotifications);
      
      const unread = limitedNotifications.some(n => !n.isRead);
      setHasUnread(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = (notification: Notification) => {
    // The logic to mark as read is handled on the target page itself.
    if (notification && notification.link) {
      router.push(notification.link);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-sidebar-accent">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-center text-muted-foreground">You have no notifications.</p>
          ) : (
            notifications.map(notif => (
              <DropdownMenuItem
                key={notif.id}
                onSelect={() => handleNotificationClick(notif)}
                className={`flex flex-col items-start gap-1 p-2 cursor-pointer ${!notif.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <p className="text-sm font-medium whitespace-normal">{notif.message}</p>
                <p className="text-xs text-muted-foreground">
                  {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true }) : ''}
                </p>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
