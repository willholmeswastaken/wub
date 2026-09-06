import { format, subDays } from "date-fns";

export type DateObject = {
  date: string;
  clicks: number;
};

export function generateDateArrayFromDays(
  days: number,
  clicksByDay: Record<string, number>,
): DateObject[] {
  const dates: DateObject[] = [];
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = subDays(today, i);
    const key = format(date, "yyyy-MM-dd");
    dates.push({
      date: format(date, "do MMMM"),
      clicks: clicksByDay[key] ?? 0,
    });
  }

  return dates;
}
