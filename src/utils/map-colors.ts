// 原生 map 组件（polyline/circle/marker label）只接受字面色值，无法取用 SCSS token。
// 此处集中维护地图用色，色值必须与 src/styles/tokens.scss 对应 token 保持一致。
export const MAP_PRIMARY = '#00F2FF'; // $color-primary / $blue-300
export const MAP_PRIMARY_SOFT = '#74F5FF'; // $blue-200
export const MAP_TEXT_LIGHT = '#E1FDFF'; // $blue-50
export const MAP_LINE_STRONG = '#3A494B'; // $line-strong
export const MAP_WHITE = '#FFFFFF';

export function mapPrimaryAlpha(opacity: number) {
  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `${MAP_PRIMARY}${alpha}`;
}
