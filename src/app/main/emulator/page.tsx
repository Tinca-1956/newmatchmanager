
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ExternalLink, WifiOff, Wifi } from 'lucide-react';

interface EmulatorStatus {
  name: string;
  host: string;
  port: number;
  url: string;
  status: 'active' | 'inactive';
}

const emulatorConfig: Omit<EmulatorStatus, 'status' | 'url'>[] = [
  { name: 'Authentication', host: 'localhost', port: 9099 },
  { name: 'Firestore', host: 'localhost', port: 8080 },
  { name: 'Storage', host: 'localhost', port: 9199 },
  { name: 'Functions', host: 'localhost', port: 5001 },
];

async function checkPort(host: string, port: number): Promise<boolean> {
  // This is a browser-based heuristic. It attempts to fetch a resource from the port.
  // A successful fetch or a CORS error often means something is listening.
  // A network error (TypeError: Failed to fetch) usually means nothing is listening.
  try {
    await fetch(`http://${host}:${port}`, { mode: 'no-cors' });
    return true; // Port is likely open or blocked by CORS (meaning a server is there)
  } catch (e) {
    if (e instanceof TypeError && e.message === 'Failed to fetch') {
       return false; // Port is likely closed
    }
    // For other errors (like CORS), we can assume the server is running.
    return true;
  }
}


export default function EmulatorPage() {
  const [statuses, setStatuses] = useState<EmulatorStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmulatorMode, setIsEmulatorMode] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      setIsEmulatorMode(true);
    }

    const checkStatuses = async () => {
      setIsLoading(true);
      const newStatuses = await Promise.all(
        emulatorConfig.map(async (em) => {
          const isActive = await checkPort(em.host, em.port);
          return {
            ...em,
            url: `http://${em.host}:${em.port}`,
            status: isActive ? 'active' : 'inactive',
          };
        })
      );
      setStatuses(newStatuses);
      setIsLoading(false);
    };

    checkStatuses();
     const interval = setInterval(checkStatuses, 5000); // Re-check every 5 seconds
    return () => clearInterval(interval);

  }, []);

  if (!isEmulatorMode) {
    return (
        <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Not in Emulator Mode</AlertTitle>
            <AlertDescription>
                This page is only available when running the application on localhost and connecting to local Firebase emulators.
            </AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Firebase Emulator Suite</h1>
        <p className="text-muted-foreground">
          Check the status of your local Firebase emulators.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emulator Status</CardTitle>
          <CardDescription>
            This page checks if the local emulator ports are responding. Status updates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {statuses.map(emulator => (
                <div key={emulator.name} className="flex items-center justify-between rounded-lg border p-4">
                     <div className="flex items-center gap-4">
                        {emulator.status === 'active' ? (
                            <Wifi className="h-6 w-6 text-green-500" />
                        ): (
                            <WifiOff className="h-6 w-6 text-destructive" />
                        )}
                        <div>
                            <p className="font-semibold">{emulator.name}</p>
                            <p className="text-sm text-muted-foreground">{emulator.url}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Badge variant={emulator.status === 'active' ? 'default' : 'destructive'}>
                            {isLoading ? 'Checking...' : emulator.status}
                        </Badge>
                         <a href={emulator.status === 'active' ? emulator.url : undefined} target="_blank" rel="noopener noreferrer" className={emulator.status === 'inactive' ? 'pointer-events-none opacity-50' : ''}>
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            ))}
        </CardContent>
      </Card>
       <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>How to run the emulators</AlertTitle>
            <AlertDescription>
                <p>To use the emulators, you need to have them running in a separate terminal window. Navigate to your project directory and run the following command:</p>
                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold mt-2 block">
                    firebase emulators:start
                </code>
            </AlertDescription>
        </Alert>
    </div>
  );
}
