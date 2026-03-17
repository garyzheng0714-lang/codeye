import { memo, useState } from 'react';
import { CheckCircle, CircleNotch, Circle, CaretDown, CaretRight } from '@phosphor-icons/react';
import { useChatStore } from '../../stores/chatStore';

function extractTaskData(messages: { toolCalls: { name: string; progressLines?: string[]; input: Record<string, unknown>; output?: string }[]; isStreaming?: boolean }[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    for (const tool of msg.toolCalls) {
      if (tool.name === 'Task' && tool.progressLines && tool.progressLines.length > 0) {
        const tasks = tool.progressLines.map((line) => {
          const isDone = line.startsWith('[x]') || line.startsWith('[done]');
          return { label: line.replace(/^\[(x|done|pending|\s)\]\s*/, ''), done: isDone };
        });
        const title = String(tool.input.description || 'Agent Task');
        const isRunning = msg.isStreaming === true && tool.output === undefined;
        return { title, tasks, isRunning };
      }
    }
  }
  return null;
}

export default memo(function TaskProgressCard() {
  const messages = useChatStore((s) => s.messages);
  const [showCompleted, setShowCompleted] = useState(false);

  const data = extractTaskData(messages);
  if (!data) return null;

  const { tasks, isRunning } = data;
  const doneCount = tasks.filter((t) => t.done).length;
  const totalCount = tasks.length;
  const allDone = doneCount === totalCount && !isRunning;
  const pendingTasks = tasks.filter((t) => !t.done);
  const doneTasks = tasks.filter((t) => t.done);

  return (
    <div className="kiro-task-card">
      <div className="kiro-task-total">TOTAL TASKS ({totalCount})</div>

      {pendingTasks.length > 0 && !allDone && (
        <div className="kiro-task-section">
          <div className="kiro-task-section-header">
            <span className="kiro-task-section-title">IN PROGRESS ({pendingTasks.length})</span>
            <CaretDown size={13} weight="bold" className="kiro-task-chevron" />
          </div>
          <div className="kiro-task-timeline">
            {pendingTasks.map((task, i) => (
              <div key={`p-${i}`} className="kiro-timeline-item">
                <div className="kiro-timeline-rail">
                  <div className="kiro-timeline-icon">
                    <CircleNotch size={18} weight="bold" className={i === 0 ? 'kiro-spinner' : 'kiro-pending'} />
                  </div>
                  {i < pendingTasks.length - 1 && <div className="kiro-timeline-line" />}
                </div>
                <div className="kiro-timeline-content">
                  <span className="kiro-task-item-label">{task.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {doneCount > 0 && (
        <button
          type="button"
          className="kiro-task-completed-btn"
          onClick={() => setShowCompleted((v) => !v)}
        >
          <CheckCircle size={18} weight="fill" className="kiro-check-done" />
          <span className="kiro-task-completed-text">COMPLETED ({doneCount})</span>
          <span className="kiro-task-completed-arrow">
            {showCompleted ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
          </span>
        </button>
      )}

      {showCompleted && (
        <div className="kiro-task-timeline kiro-task-timeline--done">
          {doneTasks.map((task, i) => (
            <div key={`d-${i}`} className="kiro-timeline-item kiro-timeline-item--done">
              <div className="kiro-timeline-rail">
                <div className="kiro-timeline-icon">
                  <CheckCircle size={18} weight="fill" className="kiro-check-done" />
                </div>
                {i < doneTasks.length - 1 && <div className="kiro-timeline-line kiro-timeline-line--done" />}
              </div>
              <div className="kiro-timeline-content">
                <span className="kiro-task-item-label">{task.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
