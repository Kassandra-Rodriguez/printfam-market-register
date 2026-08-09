import { todayRange, yesterdayRange, thisWeekRange, thisMonthRange, dayRangeInTimezone } from "@/lib/dates";
import type { DateRange } from "@/lib/dates";

export type ReportRangeKey = "today" | "yesterday" | "week" | "month" | "custom";

export function resolveRange(
  timezone: string,
  range: string | undefined,
  from?: string,
  to?: string
): DateRange {
  switch (range) {
    case "yesterday":
      return yesterdayRange(timezone);
    case "week":
      return thisWeekRange(timezone);
    case "month":
      return thisMonthRange(timezone);
    case "custom":
      if (from && to) {
        return {
          from: dayRangeInTimezone(new Date(`${from}T00:00:00`), timezone).from,
          to: dayRangeInTimezone(new Date(`${to}T00:00:00`), timezone).to,
        };
      }
      return todayRange(timezone);
    default:
      return todayRange(timezone);
  }
}
