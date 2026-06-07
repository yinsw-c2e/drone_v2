export async function safeRun<T>(fn: () => T | Promise<T>, okMsg?: string): Promise<T | undefined> {
  try { const r = await fn(); if (okMsg) uni.showToast({ title: okMsg, icon: 'success' }); return r; }
  catch (e: any) { uni.showToast({ title: e?.message ?? '操作失败', icon: 'none' }); return undefined; }
}
