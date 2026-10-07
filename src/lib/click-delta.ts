export type DeltaTone = "up" | "down" | "flat";

export type WindowDelta = {
  label: string;
  tone: DeltaTone;
};

export function seriesTotal(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0);
}

export function sumSeries(series: readonly (readonly number[])[]) {
  let length = 0;
  for (const row of series) {
    if (row.length > length) length = row.length;
  }
  const totals = Array.from({ length }, () => 0);
  for (const row of series) {
    for (let index = 0; index < row.length; index += 1) {
      totals[index] = (totals[index] ?? 0) + (row[index] ?? 0);
    }
  }
  return totals;
}

/**
 * Daily buckets, oldest first. Compares the latest floor(n/2) days with the
 * same-length window just before them. A 7-day sparkline is the last 3 days
 * versus the 3 days before those; the oldest day stays in the week total and
 * out of the percentage so both windows are the same length.
 */
export function recentWindowTotals(values: readonly number[]) {
  const window = Math.floor(values.length / 2);
  if (window < 1) {
    return {
      current: seriesTotal(values),
      previous: 0,
      window: values.length,
    };
  }
  return {
    current: seriesTotal(values.slice(-window)),
    previous: seriesTotal(values.slice(-window * 2, -window)),
    window,
  };
}

export function formatWindowDelta(
  current: number,
  previous: number,
  { hideFlat = false }: { hideFlat?: boolean } = {},
): WindowDelta | null {
  if (current === 0 && previous === 0) return null;
  if (previous === 0) return { label: "New", tone: "up" };
  const change = Math.round(((current - previous) / previous) * 100);
  if (change === 0) {
    return hideFlat ? null : { label: "0%", tone: "flat" };
  }
  return {
    label: `${change > 0 ? "+" : ""}${change}%`,
    tone: change > 0 ? "up" : "down",
  };
}

export function windowDeltaCaption(window: number) {
  if (window <= 0) return "recent clicks";
  const noun = window === 1 ? "day" : "days";
  return `last ${window} ${noun} vs the prior ${window} ${noun}`;
}
