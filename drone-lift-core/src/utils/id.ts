import { nanoid } from 'nanoid';
export const genId = (prefix: string) => `${prefix}_${nanoid(8)}`;
