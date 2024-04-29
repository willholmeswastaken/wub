export function parseUrl(url: string) {
    return !url.startsWith('http://') || !url.startsWith('https://')
        ? `https://${url}`
        : url;
}
