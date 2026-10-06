/** Formatting helpers shared by the public course marketplace. */

export function formatDurationHours(hours = 0) {
  const total = Number(hours) || 0;
  if (total <= 0) return null;
  if (total < 1) return `${Math.max(1, Math.round(total * 60))}m`;
  return `${total % 1 === 0 ? total : total.toFixed(1)}h`;
}

export function formatMinutes(totalMinutes = 0) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0));
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export function formatPrice(course = {}) {
  if (course.isFree || Number(course.price) === 0) return 'Free';
  const value = Number(course.price) || 0;
  return `$${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)}`;
}

export function formatCount(value = 0) {
  const count = Number(value) || 0;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return `${count}`;
}

export function levelLabel(difficulty) {
  const map = {
    Easy: 'Beginner',
    Medium: 'Intermediate',
    Hard: 'Advanced',
    Boss: 'Expert'
  };
  return map[difficulty] || difficulty || 'All levels';
}

export function timeAgo(dateValue) {
  if (!dateValue) return '';
  const then = new Date(dateValue).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  if (days < 365) return plural(Math.floor(days / 30), 'month');
  return plural(Math.floor(days / 365), 'year');
}
