// Same rules as the iOS app's TimeCluster.swift:
// Today · Yesterday · Earlier this week · Last week · "August" · "2025"

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBefore(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() - n);
  return d;
}

// Which cluster does one date belong to?
export function clusterFor(date, now = new Date()) {
  const today = startOfDay(now);
  const day = startOfDay(date);
  // Math.round, not floor: days around a clock change are 23 or 25 hours long
  const daysAgo = Math.round((today - day) / DAY);
  const fullDate = day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  if (daysAgo <= 0) return { key: 'today', title: 'Today', subtitle: fullDate, start: today };
  if (daysAgo === 1) return { key: 'yesterday', title: 'Yesterday', subtitle: fullDate, start: day };
  if (daysAgo <= 6) return { key: 'this-week', title: 'Earlier this week', subtitle: null, start: daysBefore(today, 6) };
  if (daysAgo <= 13) return { key: 'last-week', title: 'Last week', subtitle: null, start: daysBefore(today, 13) };

  if (date.getFullYear() === now.getFullYear()) {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    return {
      key: `m-${date.getFullYear()}-${date.getMonth()}`,
      title: date.toLocaleDateString(undefined, { month: 'long' }),
      subtitle: null,
      start: monthStart,
    };
  }

  return {
    key: `y-${date.getFullYear()}`,
    title: String(date.getFullYear()),
    subtitle: null,
    start: new Date(date.getFullYear(), 0, 1),
  };
}

// photos → [{ key, title, subtitle, start, photos: [oldest … newest] }], newest cluster first
export function groupIntoClusters(photos, now = new Date()) {
  const groups = new Map();

  for (const photo of photos) {
    const date = new Date(photo.taken_at);
    const cluster = clusterFor(date, now);
    if (!groups.has(cluster.key)) groups.set(cluster.key, { ...cluster, photos: [] });
    groups.get(cluster.key).photos.push(photo);
  }

  const list = [...groups.values()];
  for (const c of list) {
    c.photos.sort((a, b) => new Date(a.taken_at) - new Date(b.taken_at));
  }
  return list.sort((a, b) => b.start - a.start);
}