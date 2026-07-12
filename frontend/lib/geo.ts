import type { Station } from "./types";

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestStation(
  userLat: number,
  userLon: number,
  stations: Station[]
): { station: Station; distanceKm: number } | null {
  if (stations.length === 0) return null;
  let nearest = stations[0];
  let minDist = haversineKm(userLat, userLon, nearest.lat, nearest.lon);
  for (const s of stations.slice(1)) {
    const d = haversineKm(userLat, userLon, s.lat, s.lon);
    if (d < minDist) {
      minDist = d;
      nearest = s;
    }
  }
  return { station: nearest, distanceKm: minDist };
}

export const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
export const INDIA_DEFAULT_ZOOM = 5;

export function getBrowserLocation(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  });
}