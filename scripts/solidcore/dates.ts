export type TargetMonthInfo = {
  end: Date;
  key: string;
  monthIndex: number;
  monthNameLong: string;
  monthNameShort: string;
  start: Date;
  year: number;
};

export function getTargetMonthInfo(now = new Date()): TargetMonthInfo {
  const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const monthIndex = (now.getMonth() + 1) % 12;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    end,
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    monthIndex,
    monthNameLong: start.toLocaleString("en-US", { month: "long" }),
    monthNameShort: start.toLocaleString("en-US", { month: "short" }),
    start,
    year,
  };
}

export function getCurrentDayOfMonth(now = new Date()): number {
  return now.getDate();
}

export function isExpectedReleaseWindow(days: number[], now = new Date()): boolean {
  return days.includes(getCurrentDayOfMonth(now));
}
