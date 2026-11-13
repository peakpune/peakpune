export async function sharePlan({ title, url }, nav = globalThis.navigator) {
    const data = { title: title + ' - Peak Pune', text: 'Pune plan: ' + title, url };
    if (typeof nav?.share === 'function') {
        try {
            await nav.share(data);
            return 'shared';
        }
        catch (e) {
            if (e instanceof Error && e.name === 'AbortError')
                return 'cancelled';
        }
    }
    if (typeof nav?.clipboard?.writeText === 'function') {
        try {
            await nav.clipboard.writeText(url);
            return 'copied';
        }
        catch {
            return 'failed';
        }
    }
    return 'unavailable';
}
