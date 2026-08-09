import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { startOfWeek, startOfMonth, subDays } from "date-fns";

export type DateRange = { from: string; to: string };

// Converts a business-local calendar day into a precise UTC instant range,
// correctly accounting for that timezone's offset (including DST) on that
// specific date -- used so "today" means the business's today, not the
// server's.
export function dayRangeInTimezone(date: Date, timezone: string): DateRange {
  const dateStr = formatInTimeZone(date, timezone, "yyyy-MM-dd");
  const from = fromZonedTime(`${dateStr}T00:00:00.000`, timezone);
  const to = fromZonedTime(`${dateStr}T23:59:59.999`, timezone);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function todayRange(timezone: string): DateRange {
  return dayRangeInTimezone(new Date(), timezone);
}

export function yesterdayRange(timezone: string): DateRange {
  return dayRangeInTimezone(subDays(new Date(), 1), timezone);
}

export function thisWeekRange(timezone: string): DateRange {
  const start = startOfWeek(new Date(), { weekStartsOn: 0 });
  return {
    from: dayRangeInTimezone(start, timezone).from,
    to: todayRange(timezone).to,
  };
}

export function thisMonthRange(timezone: string): DateRange {
  const start = startOfMonth(new Date());
  return {
    from: dayRangeInTimezone(start, timezone).from,
    to: todayRange(timezone).to,
  };
}

export function customRange(timezone: string, fromDate: Date, toDate: Date): DateRange {
  return {
    from: dayRangeInTimezone(fromDate, timezone).from,
    to: dayRangeInTimezone(toDate, timezone).to,
  };
}
