/// <reference types="vite/client" />

/**
 * Service to interact with OpenRouteService Directions API
 */

const ORS_BASE_URL = 'https://api.openrouteservice.org/v2/directions/foot-walking';

export interface RouteData {
  coordinates: [number, number][];
  distance: number; // meters
  duration: number; // seconds
}

// Simple in-memory cache to avoid redundant API calls
const routeCache = new Map<string, RouteData>();

function getCacheKey(start: [number, number], end: [number, number]): string {
  // Precision to ~10m to handle minor GPS jitter while keeping cache effective
  const precision = 10000; 
  const r = (n: number) => Math.round(n * precision) / precision;
  return `${r(start[0])},${r(start[1])}|${r(end[0])},${r(end[1])}`;
}

export async function fetchWalkingRoute(
  start: [number, number],
  end: [number, number]
): Promise<RouteData> {
  const cacheKey = getCacheKey(start, end);
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  const apiKey = import.meta.env.VITE_ORS_API_KEY;

  if (!apiKey) {
    console.warn('VITE_ORS_API_KEY is missing. Falling back to straight line.');
    const fallback = {
      coordinates: [start, end],
      distance: calculateStraightLineDistance(start, end),
      duration: calculateStraightLineDistance(start, end) / 1.4
    };
    return fallback;
  }

  try {
    const response = await fetch(ORS_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey
      },
      body: JSON.stringify({
        coordinates: [
          [start[1], start[0]],
          [end[1], end[0]]
        ],
        geometry: true,
        preference: 'recommended',
        radiuses: [-1, -1]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch route');
    }

    const data = await response.json();
    if (!data.features || data.features.length === 0) {
      // Return fallback without logging a scary error if no route is found (e.g. crossing water)
      return {
        coordinates: [start, end],
        distance: calculateStraightLineDistance(start, end),
        duration: calculateStraightLineDistance(start, end) / 1.4
      };
    }
    const feature = data.features[0];
    
    if (!feature?.geometry?.coordinates || !feature?.properties?.summary) {
      throw new Error('Incomplete route data from ORS');
    }
    
    const coordinates: [number, number][] = feature.geometry.coordinates.map(
      (coord: number[]) => [coord[1], coord[0]] as [number, number]
    );

    const result = {
      coordinates,
      distance: feature.properties.summary.distance,
      duration: feature.properties.summary.duration
    };

    routeCache.set(cacheKey, result);
    return result;
  } catch (error) {
    // Only log if it's not the "no route found" case which we now handle above
    console.warn('ORS Route Warning (using fallback):', error instanceof Error ? error.message : error);
    return {
      coordinates: [start, end],
      distance: calculateStraightLineDistance(start, end),
      duration: calculateStraightLineDistance(start, end) / 1.4
    };
  }
}

function calculateStraightLineDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6371e3;
  const φ1 = p1[0] * Math.PI / 180;
  const φ2 = p2[0] * Math.PI / 180;
  const Δφ = (p2[0] - p1[0]) * Math.PI / 180;
  const Δλ = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
