const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;
const MONTH = DAY * 30;

export function formatCompactTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 0) return '';

  if (diff < MINUTE) return '刚刚';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} 小时`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)} 天`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)} 周`;
  if (diff < DAY * 365) return `${Math.floor(diff / MONTH)} 月`;
  return `${Math.floor(diff / (DAY * 365))} 年`;
}

export function isOlderThan3Days(timestamp: number): boolean {
  return Date.now() - timestamp > 3 * DAY;
}
