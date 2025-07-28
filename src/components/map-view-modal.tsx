
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { Match } from '@/lib/types';

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


interface MapViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
}

export function MapViewModal({ isOpen, onClose, match }: MapViewModalProps) {

  // This is a hack to resize the map when the modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen || !match || !match.locationCoords) return null;

  const position: LatLngExpression = [match.locationCoords.lat, match.locationCoords.lng];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Location for: {match.name}</DialogTitle>
          <DialogDescription>
            {match.location}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow rounded-md overflow-hidden">
            <MapContainer
                center={position}
                zoom={14}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position}>
                    <Popup>
                        {match.name} at {match.location}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>

        <DialogFooter className="pt-4">
            <Button onClick={onClose}>
                Close
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
