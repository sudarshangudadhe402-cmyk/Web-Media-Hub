export const INDIA_BOUNDS = {
  minLatitude: 6.5,
  maxLatitude: 37.2,
  minLongitude: 68.1,
  maxLongitude: 97.5,
} as const;

export function isIndiaCoordinate(latitude: unknown, longitude: unknown): boolean {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= INDIA_BOUNDS.minLatitude &&
    lat <= INDIA_BOUNDS.maxLatitude &&
    lng >= INDIA_BOUNDS.minLongitude &&
    lng <= INDIA_BOUNDS.maxLongitude;
}

export function parseIndiaCoordinatePair(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  if (latitude === undefined || longitude === undefined || latitude === null || longitude === null || latitude === "" || longitude === "") {
    return null;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  return isIndiaCoordinate(lat, lng) ? { latitude: lat, longitude: lng } : null;
}