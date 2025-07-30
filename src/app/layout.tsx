
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Match Manager',
  description: 'Manage your fishing matches with ease.',
  icons: {
    icon: '/favicon.jpg', // Standard favicon
    apple: '/apple-touch-icon.png', // For Apple devices
  },
  openGraph: {
    title: 'Match Manager',
    description: 'Manage your fishing matches with ease.',
    images: [
      {
        url: '/og-image.jpg', // Recommended size: 1200x630
        width: 1200,
        height: 630,
        alt: 'Match Manager Logo',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
