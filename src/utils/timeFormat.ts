const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const WEEK = 604_800_000;

export function formatCompactTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 0) return '';

  if (diff < HOUR) {
    const m = Math.max(1, Math.floor(diff / MINUTE));
    return `${m} 分钟`;
  }
  if (diff < DAY) {
    return `${Math.floor(diff / HOUR)} 小时`;
  }
  if (diff < WEEK) {
    return `${Math.floor(diff / DAY)} 天`;
  }
  if (diff < DAY * 30) {
    return `${Math.floor(diff / WEEK)} 周`;
  }
  if (diff < DAY * 365) {
    return `${Math.floor(diff / (DAY * 30))} 月`;
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function isOlderThan3Days(timestamp: number): boolean {
  return Date.now() - timestamp > 3 * DAY;
}
