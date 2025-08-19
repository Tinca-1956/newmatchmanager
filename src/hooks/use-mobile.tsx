import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;

// This hook is designed to be hydration-safe.
// It returns `false` on the server and during the initial client render.
// It only returns the true device state after the component has mounted on the client.
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Call on mount
    checkDevice();
    
    // Add resize listener
    window.addEventListener('resize', checkDevice);
    
    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return isMobile;
}
