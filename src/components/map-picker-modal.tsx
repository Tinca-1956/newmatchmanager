
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import type { LatLngExpression, Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon path issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});


interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCoords: { lat: number; lng: number } | null;
  onLocationSelect: (coords: { lat: number; lng: number }) => void;
}

const LocationMarker = ({ position, setPosition }: { position: LatLngExpression, setPosition: (pos: LatLngExpression) => void }) => {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

export function MapPickerModal({ isOpen, onClose, currentCoords, onLocationSelect }: MapPickerModalProps) {
  const [position, setPosition] = useState<LatLngExpression | null>(currentCoords);
  const mapRef = useRef<LeafletMap>(null);
   const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setPosition(currentCoords || [51.505, -0.09]); // Default to London if no coords
  }, [currentCoords]);
  
  // This is a hack to resize the map when the modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [isOpen]);


  const handleConfirm = () => {
    if (position) {
      onLocationSelect(position as { lat: number, lng: number });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pin Match Location</DialogTitle>
          <DialogDescription>
            Click on the map to place a pin at the exact location of the match draw.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow rounded-md overflow-hidden">
            {isClient && position && (
                <MapContainer
                    center={position}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                    whenCreated={mapInstance => { mapRef.current = mapInstance }}
                >
                    <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker position={position} setPosition={setPosition} />
                </MapContainer>
            )}
        </div>

        <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={onClose}>
                Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!position}>
                Confirm Location
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
