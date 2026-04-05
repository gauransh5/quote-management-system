/**
 * Compute total hours from a quote item schedule (date/time ranges).
 * Used for hourly-billed services (e.g. Static Guard) where each row is a shift.
 *
 * Schedule row shape: { startDate, startTime, endDate?, endTime? }
 * - startDate, startTime required (YYYY-MM-DD, HH:mm).
 * - If endDate/endTime omitted, same-day end: endTime only (startDate, endTime).
 * - Overnight: endDate > startDate, or same date with endTime < startTime (e.g. 17:30 to 08:00 next day).
 */

export interface ScheduleRow {
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
}

/**
 * Parse "HH:mm" to minutes since midnight.
 */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Compute hours between start and end for one row.
 * Handles overnight: e.g. March 6 17:30 to March 7 08:00 = 14.5 hrs.
 * If endDate/endTime omitted, same-day end: use endTime on startDate.
 */
function rowHours(row: ScheduleRow): number {
  const start = new Date(`${row.startDate}T${row.startTime}:00`);
  const endDate = row.endDate ?? row.startDate;
  const endTime = row.endTime ?? row.startTime;
  let end = new Date(`${endDate}T${endTime}:00`);
  // If end is before or equal to start (e.g. 17:30 → 08:00 same day), assume end is next day
  if (end.getTime() <= start.getTime()) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }
  const ms = end.getTime() - start.getTime();
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100; // 2 decimal places
}

/**
 * Sum hours for all schedule rows. Returns 0 if schedule is missing or empty.
 */
export function totalHoursFromSchedule(schedule: unknown): number {
  if (!schedule || !Array.isArray(schedule)) return 0;
  let total = 0;
  for (const row of schedule as ScheduleRow[]) {
    if (row && typeof row.startDate === "string" && typeof row.startTime === "string") {
      total += rowHours(row);
    }
  }
  return Math.round(total * 100) / 100;
}

/** Per-row hours for display (e.g. on public quote). */
export interface ScheduleBreakdownRow extends ScheduleRow {
  hours: number;
}

/**
 * Return schedule rows with computed hours for each, for display on the quote.
 */
export function getScheduleBreakdown(schedule: unknown): ScheduleBreakdownRow[] {
  if (!schedule || !Array.isArray(schedule)) return [];
  return (schedule as ScheduleRow[])
    .filter((row) => row && typeof row.startDate === "string" && typeof row.startTime === "string")
    .map((row) => ({ ...row, hours: rowHours(row) }));
}
