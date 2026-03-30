'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Satellite, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Dynamically import Map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((m) => m.CircleMarker),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((m) => m.Popup),
  { ssr: false }
);

interface MapWithGeofenceProps {
  latitude?: number;
  longitude?: number;
  radius?: number;
  onLocationChange?: (lat: number, lng: number, address?: string) => void;
  isInteractive?: boolean;
  address?: string;
}

export function MapWithGeofence({
  latitude = 5.6037,
  longitude = -0.1871,
  radius = 100,
  onLocationChange,
  isInteractive = true,
  address = 'Accra, Ghana',
}: MapWithGeofenceProps) {
  const mapRef = useRef<any>(null);
  const [currentLat, setCurrentLat] = useState(latitude);
  const [currentLng, setCurrentLng] = useState(longitude);
  const [isClient, setIsClient] = useState(false);
  const [useSatellite, setUseSatellite] = useState(false);

  // Initialize client-side rendering and set marker icon
  useEffect(() => {
    setIsClient(true);
    
    // Fix Leaflet marker icon in Next.js dynamic import
    if (typeof window !== 'undefined') {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
    }
  }, []);

  // Update map view when coordinates change
  useEffect(() => {
    if (!isClient) return;
    
    console.log('🗺️ Updating map center to:', { latitude, longitude });
    setCurrentLat(latitude);
    setCurrentLng(longitude);
    
    // After a short delay, pan the map to the new location
    const timer = setTimeout(() => {
      if (mapRef.current) {
        try {
          console.log('📍 Panning map to:', { latitude, longitude });
          mapRef.current.setView([latitude, longitude], 18);
        } catch (error) {
          console.log('⚠️ Map not ready for pan yet');
        }
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [latitude, longitude, isClient]);

  const handleLocationChange = useCallback((lat: number, lng: number) => {
    console.log('✅ Map click location:', { lat, lng });
    setCurrentLat(lat);
    setCurrentLng(lng);
    
    // Reverse geocode to get address
    if (typeof window !== 'undefined') {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'SanctuaryConnect-App',
          },
        }
      )
        .then((res) => res.json())
        .then((data) => {
          console.log('🔄 Reverse geocoding result:', data);
          
          // Try to build a useful address from available fields
          let reversedAddress = '';
          
          // Prefer: road > neighbourhood > suburb > city > county
          if (data.address?.road) {
            reversedAddress = data.address.road;
            // Append number if available
            if (data.address.house_number) {
              reversedAddress = `${data.address.house_number} ${reversedAddress}`;
            }
          } else if (data.address?.neighbourhood) {
            reversedAddress = data.address.neighbourhood;
          } else if (data.address?.suburb) {
            reversedAddress = data.address.suburb;
          } else if (data.address?.city || data.address?.town) {
            reversedAddress = data.address.city || data.address.town;
          } else if (data.address?.county) {
            reversedAddress = data.address.county;
          } else if (data.display_name) {
            // Last resort: use first part of display_name
            reversedAddress = data.display_name.split(',')[0];
          } else {
            reversedAddress = 'Location Set';
          }
          
          const city = data.address?.city || data.address?.town || '';
          onLocationChange?.(lat, lng, reversedAddress);
          console.log('📍 Address found:', { reversedAddress, city });
        })
        .catch((error) => {
          console.error('❌ Reverse geocoding error:', error);
          onLocationChange?.(lat, lng);
        });
    }
  }, [onLocationChange]);

  const handleMapClick = useCallback((e: any) => {
    if (!isInteractive) return;
    
    try {
      const latlng = e.latlng;
      if (latlng) {
        console.log('🎯 Map clicked at:', { lat: latlng.lat, lng: latlng.lng });
        handleLocationChange(latlng.lat, latlng.lng);
      }
    } catch (error) {
      console.error('❌ Error handling map click:', error);
    }
  }, [isInteractive, handleLocationChange]);

  // Add click event listener to map
  useEffect(() => {
    if (!isClient || !mapRef.current) return;

    const timer = setTimeout(() => {
      try {
        mapRef.current.on('click', handleMapClick);
        console.log('✅ Map click handler registered');
      } catch (error) {
        console.log('⚠️ Could not register map click handler');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        try {
          mapRef.current.off('click', handleMapClick);
        } catch (error) {
          console.log('⚠️ Could not unregister map click handler');
        }
      }
    };
  }, [isClient, handleMapClick]);

  if (!isClient) {
    return (
      <div className="w-full h-full rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        ref={mapRef}
        center={[currentLat, currentLng] as any}
        zoom={18}
        className="w-full h-full rounded-xl"
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        {/* Tile Layer - Toggle between Street and Satellite */}
        {!useSatellite ? (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        ) : (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="&copy; Esri"
          />
        )}

        {/* Geofence Circle */}
        <CircleMarker
          key={`circle-${currentLat}-${currentLng}`}
          center={[currentLat, currentLng] as any}
          radius={Math.sqrt(radius / Math.PI) * 0.008}
          pathOptions={{
            color: '#3AAFDC',
            weight: 2,
            opacity: 0.8,
            fillColor: '#3AAFDC',
            fillOpacity: 0.1,
          }}
        />

        {/* Location Marker */}
        <Marker 
          key={`${currentLat}-${currentLng}`}
          position={[currentLat, currentLng] as any}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-gray-800">{address}</p>
              <p className="text-gray-600 text-xs mt-1">
                Lat: {currentLat.toFixed(6)}, Lng: {currentLng.toFixed(6)}
              </p>
              <p className="text-gray-600 text-xs mt-1">Radius: {radius}m</p>
              {isInteractive && (
                <p className="text-blue-500 text-xs mt-2 font-medium">
                  ← Click map to move marker
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>


      {/* Satellite Toggle Button */}
      <button
        onClick={() => setUseSatellite(!useSatellite)}
        className="absolute top-4 right-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg z-[999] flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={useSatellite ? 'Switch to street view' : 'Switch to satellite view'}
      >
        <Satellite className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {useSatellite ? 'Street' : 'Satellite'}
        </span>
      </button>

      {/* Instructions Overlay */}
      {isInteractive && (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg z-[999]">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Click on map to set location
          </p>
        </div>
      )}

      {/* Coordinates Display */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg z-[999] font-mono text-xs">
        <p className="text-gray-700 dark:text-gray-300">
          <span className="font-semibold text-[#3AAFDC]">{currentLat.toFixed(6)}</span>
          <span className="text-gray-500 mx-1">,</span>
          <span className="font-semibold text-[#3AAFDC]">{currentLng.toFixed(6)}</span>
        </p>
        <p className="text-gray-500 text-xs mt-1">{radius}m radius</p>
      </div>
    </div>
  );
}

