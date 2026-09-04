/** Format YYYY-MM-DD for workout headers: "Today, Sep 4" or "Wed, Sep 3". */
export function formatWorkoutDateTitle(dateIso: string, now = new Date()): string {
  const [y, m, day] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, day);
  const monthDay = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return `Today, ${monthDay}`;
  }

  const weekday = date.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday}, ${monthDay}`;
}
