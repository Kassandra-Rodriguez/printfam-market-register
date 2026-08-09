import { describe, expect, it } from "vitest";
import { dayRangeInTimezone, todayRange, customRange } from "@/lib/dates";

describe("dayRangeInTimezone", () => {
  it("produces a 24-hour UTC range for a New York calendar day (standard time)", () => {
    // Jan 15 2026 is in EST (UTC-5, no DST), so midnight local = 05:00 UTC.
    const { from, to } = dayRangeInTimezone(new Date("2026-01-15T12:00:00Z"), "America/New_York");
    expect(from).toBe("2026-01-15T05:00:00.000Z");
    expect(to).toBe("2026-01-16T04:59:59.999Z");
  });

  it("accounts for daylight saving time (EDT, UTC-4)", () => {
    const { from, to } = dayRangeInTimezone(new Date("2026-07-15T12:00:00Z"), "America/New_York");
    expect(from).toBe("2026-07-15T04:00:00.000Z");
    expect(to).toBe("2026-07-16T03:59:59.999Z");
  });

  it("handles a timezone west of UTC that is a different calendar day at midnight UTC", () => {
    const { from } = dayRangeInTimezone(new Date("2026-03-01T04:00:00Z"), "Pacific/Honolulu");
    // At 2026-03-01T04:00Z it's still Feb 28 in Honolulu (UTC-10).
    expect(from).toBe("2026-02-28T10:00:00.000Z");
  });

  it("returns a range spanning exactly 24 hours minus one millisecond", () => {
    const { from, to } = dayRangeInTimezone(new Date("2026-06-01T12:00:00Z"), "America/Chicago");
    const spanMs = new Date(to).getTime() - new Date(from).getTime();
    expect(spanMs).toBe(24 * 60 * 60 * 1000 - 1);
  });
});

describe("todayRange", () => {
  it("returns a valid range that contains the current instant", () => {
    const { from, to } = todayRange("America/New_York");
    const now = Date.now();
    expect(new Date(from).getTime()).toBeLessThanOrEqual(now);
    expect(new Date(to).getTime()).toBeGreaterThanOrEqual(now);
  });
});

describe("customRange", () => {
  it("spans from the start of the first day to the end of the last day", () => {
    const { from, to } = customRange(
      "America/New_York",
      new Date("2026-05-01T00:00:00Z"),
      new Date("2026-05-03T00:00:00Z")
    );
    expect(from.startsWith("2026-04-30") || from.startsWith("2026-05-01")).toBe(true);
    expect(new Date(to).getTime()).toBeGreaterThan(new Date(from).getTime());
  });
});
