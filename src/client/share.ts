export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'failed' | 'unavailable';
type ShareNavigator = { share?: (data: ShareData) => Promise<void>; clipboard?: { writeText: (text: string) => Promise<void> } };
export async function sharePlan({title, url}: {title: string; url: string}, nav: ShareNavigator | undefined = globalThis.navigator): Promise<ShareResult> {
  const data = {title: title + ' - Peak Pune', text: 'Pune plan: ' + title, url};
  if (typeof nav?.share === 'function') {
    try { await nav.share(data); return 'shared'; }
    catch (e) { if (e instanceof Error && e.name === 'AbortError') return 'cancelled'; }
  }
  if (typeof nav?.clipboard?.writeText === 'function') {
    try { await nav.clipboard.writeText(url); return 'copied'; } catch { return 'failed'; }
  }
  return 'unavailable';
}
