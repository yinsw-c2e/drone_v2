import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
const ROOTS = ['src/models', 'src/utils', 'src/stores', 'src/api'];
const FORBIDDEN = [/\bTODO\b/, /\bFIXME\b/, /\bXXX\b/, /not implemented/i, /未实现/, /占位/, /placeholder/i, /\blocalStorage\b/, /\bsessionStorage\b/];
const errors = [];
function walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); if (s.isDirectory()) walk(p); else if (['.ts', '.vue', '.js'].includes(extname(p))) scan(p); } }
function scan(p) { const src = readFileSync(p, 'utf8'); for (const re of FORBIDDEN) if (re.test(src)) errors.push(`${p} 含禁止内容: ${re}`); }
for (const r of ROOTS) { try { walk(r); } catch {} }
const MUST = [
  ['src/utils/db.ts', /export const db/], ['src/utils/repo.ts', /export const repo/],
  ['src/utils/price.ts', /export function priceOrder/], ['src/utils/match.ts', /export function matchPure/],
  ['src/utils/order-machine.ts', /export const canTransition/], ['src/utils/settlement.ts', /export function computeSettlement/],
  ['src/utils/credit.ts', /export function pilotCredit/], ['src/utils/wallet.ts', /export function walletWithdraw/],
  ['src/utils/telemetry.ts', /export function startTelemetry/], ['src/utils/compliance.ts', /export function checkCompliance/],
];
for (const [file, re] of MUST) { try { if (!re.test(readFileSync(file, 'utf8'))) errors.push(`${file} 缺少必需导出 ${re}`); } catch { errors.push(`缺少文件 ${file}`); } }
// —— 设计完整性子检查：页面/组件颜色与字号必须取 token ——
const D_ROOTS = ['src/pages', 'src/components'];
const D_FORBID = [/#[0-9a-fA-F]{3,8}\b/, /font-size\s*:\s*\d+px/];
function dwalk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p); if (s.isDirectory()) dwalk(p); else if (/\.(vue|scss|css)$/.test(p)) { const src = readFileSync(p, 'utf8'); for (const re of D_FORBID) if (re.test(src)) errors.push(`[设计] ${p} 含禁止值(应改用 token): ${re}`); } } }
for (const r of D_ROOTS) { try { dwalk(r); } catch {} }
if (errors.length) { console.error('❌ 完整性检查失败:\n' + errors.join('\n')); process.exit(1); }
console.log('✅ 完整性检查通过');
