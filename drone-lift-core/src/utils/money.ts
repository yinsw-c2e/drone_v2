export const yuan2fen = (y: number) => Math.round(y * 100);
export const fen2yuan = (f: number) => +(f / 100).toFixed(2);
export const fmtMoney = (f: number) => `¥${fen2yuan(f).toFixed(2)}`;
