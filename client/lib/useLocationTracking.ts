'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from './store';
import { apiUpdateLocation } from './api';

const OFFLINE_LOCATION_KEY = 'polarlink_offline_location';
const THROTTLE_MS = 30000; // 30 seconds throttle

interface LocationCoords {
  lat: number;
  lng: number;
}

export function useLocationTracking() {
  const { user, isEffectivelyOnline } = useAppStore();
  const [coordinates, setCoordinates] = useState<LocationCoords | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const lastReportedTimeRef = useRef<number>(0);
  const userRef = useRef(user);
  userRef.current = user;

  // Sync queued offline location when back online
  const syncOfflineLocation = async () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(OFFLINE_LOCATION_KEY);
      if (!stored) return;
      const data = JSON.parse(stored);
      if (data?.personnelId && data?.lat != null && data?.lng != null) {
        await apiUpdateLocation(data.personnelId, data.lat, data.lng);
        localStorage.removeItem(OFFLINE_LOCATION_KEY);
      }
    } catch {
      // Ignore sync failure; will retry next time
    }
  };

  const sendLocationUpdate = async (lat: number, lng: number) => {
    const currentUser = userRef.current;
    if (!currentUser?.personnelId) return;

    setCoordinates({ lat, lng });
    setLastUpdated(new Date());

    const online = typeof navigator !== 'undefined' ? navigator.onLine && isEffectivelyOnline() : true;

    if (online) {
      try {
        await apiUpdateLocation(currentUser.personnelId, lat, lng);
        localStorage.removeItem(OFFLINE_LOCATION_KEY);
      } catch (err) {
        // Store locally if request fails
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            OFFLINE_LOCATION_KEY,
            JSON.stringify({
              personnelId: currentUser.personnelId,
              lat,
              lng,
              timestamp: Date.now(),
            })
          );
        }
      }
    } else {
      // Store in offline queue
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          OFFLINE_LOCATION_KEY,
          JSON.stringify({
            personnelId: currentUser.personnelId,
            lat,
            lng,
            timestamp: Date.now(),
          })
        );
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    // Attempt to sync any offline location on mount
    syncOfflineLocation();

    const handleOnline = () => {
      syncOfflineLocation();
    };
    window.addEventListener('online', handleOnline);

    let watchId: number | null = null;

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocationDenied(false);
          const now = Date.now();
          if (now - lastReportedTimeRef.current >= THROTTLE_MS) {
            lastReportedTimeRef.current = now;
            sendLocationUpdate(position.coords.latitude, position.coords.longitude);
          } else {
            // Keep local state updated even if network report is throttled
            setCoordinates({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setLocationDenied(true);
          }
          // Other codes (POSITION_UNAVAILABLE, TIMEOUT) are handled silently
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 27000,
        }
      );
    } catch {
      // Silently catch geolocation initialization failure
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user?.personnelId]);

  return { coordinates, locationDenied, lastUpdated };
}
