import { getEffortInfo, getModelInfo } from '../../data/models';
import { useChatStore } from '../../stores/chatStore';
import CodeyeMark from '../Brand/CodeyeMark';
import GitActionMenu from './GitActionMenu';

const modeLabels = {
  chat: 'Chat',
  code: 'Code',
  plan: 'Plan',
} as const;

export default function TitleBar() {
  const { mode, model, effort, cwd, messages } = useChatStore();

  const breadcrumbParts = cwd ? cwd.split('/').filter(Boolean).slice(-2) : [];
  const modelInfo = getModelInfo(model);
  const effortInfo = getEffortInfo(effort);
  const messageLabel =
    messages.length === 0 ? 'Fresh thread' : `${messages.length} ${messages.length === 1 ? 'msg' : 'msgs'}`;

  return (
    <div className="title-bar">
      <div className="title-bar-watchpost" aria-hidden="true">
        <span className="title-bar-watchpost-glow" />
        <span className="title-bar-watchpost-wall" />
        <CodeyeMark className="title-bar-watchpost-mark" size={34} />
      </div>
      <div className="title-bar-content">
        <div className="title-bar-left">
          <div className="title-bar-mark-shell">
            <CodeyeMark className="title-bar-icon" size={24} />
          </div>
          <span className="title-bar-logo">Codeye</span>
          {breadcrumbParts.length > 0 && (
            <div className="title-bar-breadcrumb">
              <span className="sep">/</span>
              {breadcrumbParts.map((part, i) => (
                <span key={`${i}-${part}`}>
                  {i > 0 && <span className="sep"> / </span>}
                  {part}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="title-bar-actions">
          <div className="title-glass-cluster">
            <GitActionMenu />
            <div className="title-chip context-chip" title={`Mode: ${modeLabels[mode]} • ${messageLabel}`}>
              <span className={`context-dot context-dot-${mode}`} aria-hidden="true" />
              <span className="title-chip-text">{modeLabels[mode]}</span>
            </div>
            <div className="title-chip agent-chip" title={`Agent: ${modelInfo.label} • ${effortInfo.label}`}>
              <span className="agent-spark" aria-hidden="true" />
              <span className="title-chip-text">{modelInfo.shortLabel}</span>
              <span className="title-chip-sep">/</span>
              <span className="title-chip-subtle">{effortInfo.shortLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
