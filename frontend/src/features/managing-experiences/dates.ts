const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function written(day: number, month: number, year: number): string {
  return `${day} ${MONTHS[month]} ${year}`;
}

// managing-experiences.wireframe.drawio.svg writes a date as "24 Oct 2026" and
// "2 May 2026" — the day with no leading zero, the month abbreviated.
//
// occurred_on is a plain date, "2026-10-24", carrying no time and no zone. Its
// parts are read straight off the string rather than through a Date, because a
// Date would read it as UTC midnight and render the day before for any owner
// west of Greenwich.
export function formatDay(date: string): string {
  const [year, month, day] = date.split("-");

  return written(Number(day), Number(month) - 1, Number(year));
}

// recorded_at is a real instant, so this one does go through a Date and reads
// out in the owner's own time. The wireframe writes it as "recorded 20 Oct
// 2026" beside an experience that carries no date of its own.
export function formatInstant(instant: string): string {
  const moment = new Date(instant);

  return written(moment.getDate(), moment.getMonth(), moment.getFullYear());
}
