import { useEffect, useState } from 'react';
import { activityStream } from '../../services/activityStream';
import type { ActivityEntry, ActivityType } from '../../services/activityStream';

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  session_created: 'Session',
  session_forked: 'Fork',
  message_sent: 'Sent',
  message_received: 'Received',
  tool_executed: 'Tool',
  file_modified: 'File',
  error_occurred: 'Error',
  git_action: 'Git',
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  session_created: '💬',
  session_forked: '🍴',
  message_sent: '↑',
  message_received: '↓',
  tool_executed: '⚙️',
  file_modified: '📝',
  error_occurred: '⚠️',
  git_action: '🔀',
};

const FILTER_OPTIONS: { label: string; value: ActivityType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'File', value: 'file_modified' },
  { label: 'Tool', value: 'tool_executed' },
  { label: 'Git', value: 'git_action' },
  { label: 'Error', value: 'error_occurred' },
];

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function ActivityStream() {
  const [entries, setEntries] = useState<ActivityEntry[]>(() =>
    activityStream.getEntries()
  );
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');

  useEffect(() => {
    return activityStream.subscribe((updated) => {
      setEntries([...updated]);
    });
  }, []);

  const visible = filter === 'all'
    ? entries
    : entries.filter((e) => e.type === filter);

  return (
    <div className="activity-stream">
      <div className="activity-stream-header">
        <p className="activity-stream-title">Activity</p>
        <div className="activity-filter">
          {FILTER_OPTIONS.map(({ label, value }) => (
            <button
              key={value}
              className={`activity-filter-btn${filter === value ? ' active' : ''}`}
              onClick={() => setFilter(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="activity-empty">
          <span className="activity-empty-icon">⚡</span>
          <span className="activity-empty-text">
            {filter === 'all'
              ? 'No activity yet.\nStart a conversation to see events here.'
              : `No "${ACTIVITY_LABELS[filter as ActivityType]}" events yet.`}
          </span>
        </div>
      ) : (
        <div className="activity-list">
          {visible.map((entry) => (
            <div key={entry.id} className="activity-entry">
              <span className="activity-icon" aria-hidden="true">
                {ACTIVITY_ICONS[entry.type]}
              </span>
              <div className="activity-info">
                <div className="activity-summary" title={entry.summary}>
                  {entry.summary}
                </div>
                <div className="activity-meta">
                  <span className="activity-session" title={entry.sessionName}>
                    {entry.sessionName}
                  </span>
                  <span className="activity-time">{formatTime(entry.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
