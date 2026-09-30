/** Grafik login pertama mahasiswa, dikelompokkan menurut kalender WIB. */
const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export type GrowthSeries = {
  labels: string[];
  values: number[];
  gained: number;
};

export type UserGrowth = {
  total: number;
  weekly: GrowthSeries;
  monthly: GrowthSeries;
};

function wibDay(date: Date): number {
  return Math.floor((date.getTime() + WIB_OFFSET_MS) / DAY_MS);
}

function dateForWibDay(day: number): Date {
  return new Date(day * DAY_MS);
}

function weekStart(day: number): number {
  const weekDay = dateForWibDay(day).getUTCDay();
  return day - ((weekDay + 6) % 7); // Senin
}

function monthIndex(date: Date): number {
  const wib = new Date(date.getTime() + WIB_OFFSET_MS);
  return wib.getUTCFullYear() * 12 + wib.getUTCMonth();
}

function monthLabel(index: number): string {
  const year = Math.floor(index / 12);
  const month = index % 12;
  return new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month, 1)));
}

function weekLabel(day: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(dateForWibDay(day));
}

/** Semua tanggal adalah login pertama user unik, bukan event login berulang. */
export function buildUserGrowth(firstLogins: Date[], now = new Date()): UserGrowth {
  const valid = firstLogins.filter((date) => !Number.isNaN(date.getTime()) && date <= now);
  const days = valid.map(wibDay);
  const months = valid.map(monthIndex);
  const currentWeek = weekStart(wibDay(now));
  const currentMonth = monthIndex(now);

  const weeklyLabels: string[] = [];
  const weeklyValues: number[] = [];
  for (let offset = 7; offset >= 0; offset--) {
    const start = currentWeek - offset * 7;
    weeklyLabels.push(weekLabel(start));
    weeklyValues.push(days.filter((day) => day < start + 7).length);
  }

  const monthlyLabels: string[] = [];
  const monthlyValues: number[] = [];
  for (let offset = 5; offset >= 0; offset--) {
    const index = currentMonth - offset;
    monthlyLabels.push(monthLabel(index));
    monthlyValues.push(months.filter((month) => month <= index).length);
  }

  return {
    total: valid.length,
    weekly: {
      labels: weeklyLabels,
      values: weeklyValues,
      gained: weeklyValues.at(-1)! - weeklyValues.at(-2)!,
    },
    monthly: {
      labels: monthlyLabels,
      values: monthlyValues,
      gained: monthlyValues.at(-1)! - monthlyValues.at(-2)!,
    },
  };
}
