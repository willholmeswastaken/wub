export function relativeTime(input: Date | string, now = new Date()) {
  const date = new Date(input);
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string) {
  if (!/^[a-z]{2}$/i.test(code)) return "Unknown";
  try {
    return regionNames.of(code.toUpperCase()) ?? "Unknown";
  } catch {
    return "Unknown";
  }
}

export function flagEmoji(code: string) {
  if (!/^[a-z]{2}$/i.test(code)) return "\u{1F310}";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65),
  );
}

export function percentOf(count: number, total: number) {
  if (total <= 0) return "0%";
  const share = (count / total) * 100;
  return share < 1 && share > 0 ? "<1%" : `${Math.round(share)}%`;
}
