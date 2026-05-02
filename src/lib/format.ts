const DATE_TIME = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME_ONLY = new Intl.DateTimeFormat("uk-UA", {
  timeZone: "Europe/Kyiv",
  hour: "2-digit",
  minute: "2-digit",
});

function startOfDayKyiv(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return new Date(`${y}-${m}-${day}T00:00:00+03:00`).getTime();
}

export function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const today = startOfDayKyiv(now);
  const target = startOfDayKyiv(d);
  const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

  const time = TIME_ONLY.format(d);
  const isAllDayMarker = time === "23:59";

  if (diffDays === 0) return isAllDayMarker ? "Сьогодні" : `Сьогодні, ${time}`;
  if (diffDays === 1) return isAllDayMarker ? "Завтра" : `Завтра, ${time}`;
  if (diffDays === -1)
    return isAllDayMarker ? "Вчора" : `Вчора, ${time}`;

  return DATE_TIME.format(d);
}

export function isOverdue(iso: string | null, done: boolean): boolean {
  if (!iso || done) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}
