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
            <CaretDown size={16} weight="bold" className="kiro-task-chevron" />
          </div>
          <div className="kiro-task-list">
            {pendingTasks.map((task, i) => (
              <div key={`p-${i}`} className="kiro-task-item">
                <CircleNotch size={22} weight="bold" className={`kiro-task-icon ${i === 0 && isRunning ? 'kiro-spinner' : 'kiro-pending'}`} />
                <span className="kiro-task-item-label">{task.label}</span>
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
          <CheckCircle size={22} weight="fill" className="kiro-check-done" />
          <span className="kiro-task-completed-text">COMPLETED ({doneCount})</span>
          <span className="kiro-task-completed-arrow">
            {showCompleted ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </span>
        </button>
      )}

      {showCompleted && (
        <div className="kiro-task-list kiro-task-list--done">
          {doneTasks.map((task, i) => (
            <div key={`d-${i}`} className="kiro-task-item kiro-task-item--done">
              <CheckCircle size={22} weight="fill" className="kiro-check-done" />
              <span className="kiro-task-item-label">{task.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
