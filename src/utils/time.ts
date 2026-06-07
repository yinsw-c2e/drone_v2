import dayjs from 'dayjs';
export const nowISO = () => new Date().toISOString();
export const fmt = (iso?: string, f = 'YYYY-MM-DD HH:mm') => (iso ? dayjs(iso).format(f) : '-');
export const minutesUntil = (iso: string) => Math.round((new Date(iso).getTime() - Date.now()) / 60000);
