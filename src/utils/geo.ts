import type { GeoPoint } from '@/models';
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371, dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return +(R * 2 * Math.asin(Math.sqrt(h))).toFixed(3);
}
export const lerp = (a: GeoPoint, b: GeoPoint, t: number): GeoPoint => ({ lng: a.lng + (b.lng - a.lng) * t, lat: a.lat + (b.lat - a.lat) * t });
export function bearing(a: GeoPoint, b: GeoPoint): number {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}
export function routeProgressRatio(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const mLat = 111320, mLng = 111320 * Math.cos(rad((a.lat + b.lat) / 2));
  const bx = (b.lng - a.lng) * mLng, by = (b.lat - a.lat) * mLat;
  const px = (p.lng - a.lng) * mLng, py = (p.lat - a.lat) * mLat;
  const len2 = bx * bx + by * by || 1;
  return Math.max(0, Math.min(1, (px * bx + py * by) / len2));
}
function pointToSegMeters(p: GeoPoint, a: GeoPoint, b: GeoPoint): number {
  const mLat = 111320, mLng = 111320 * Math.cos(rad(a.lat));
  const bx = (b.lng - a.lng) * mLng, by = (b.lat - a.lat) * mLat;
  const px = (p.lng - a.lng) * mLng, py = (p.lat - a.lat) * mLat;
  const len2 = bx * bx + by * by || 1;
  let t = (px * bx + py * by) / len2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - bx * t, py - by * t);
}
export function deviationM(p: GeoPoint, route: GeoPoint[]): number {
  let min = Infinity;
  for (let i = 0; i < route.length - 1; i++) min = Math.min(min, pointToSegMeters(p, route[i], route[i + 1]));
  return Math.round(min);
}
export function pointInPolygon(p: GeoPoint, poly: GeoPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat, xj = poly[j].lng, yj = poly[j].lat;
    if ((yi > p.lat) !== (yj > p.lat) && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const insideNoFlyZone = (p: GeoPoint, zones: GeoPoint[][]) => zones.some((z) => pointInPolygon(p, z));
