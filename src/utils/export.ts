// H5 端真实下载文件；非浏览器环境（小程序）退化为复制到剪贴板
export type ExportResult = 'downloaded' | 'copied' | 'failed';

export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof Blob === 'undefined') return false;
  try {
    const blob = new Blob([`${String.fromCharCode(0xfeff)}${content}`], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch {
    return false;
  }
}

export function exportTextFile(filename: string, content: string, mime = 'text/plain'): Promise<ExportResult> {
  if (downloadTextFile(filename, content, mime)) return Promise.resolve('downloaded');
  return new Promise((resolve) => {
    uni.setClipboardData({
      data: content,
      success: () => resolve('copied'),
      fail: () => resolve('failed'),
    });
  });
}

export function exportStamp(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
