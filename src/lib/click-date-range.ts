import { format, subDays } from 'date-fns';

export type DateObject = {
    date: string;
    clicks: number;
}

export function generateDateArrayFromDays(days: number, totalClicks: { timestamp: Date | null }[]): DateObject[] {
    const dates: DateObject[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const date = subDays(today, i);
        const clicksForDate = totalClicks.filter(click => click.timestamp?.toDateString() === date.toDateString());
        const formattedDate = format(date, 'do MMMM');
        dates.push({ date: formattedDate, clicks: clicksForDate.length });
    }

    return dates;
}
