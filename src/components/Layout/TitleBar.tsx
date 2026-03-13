import { useChatStore } from '../../stores/chatStore';

const modes = [
  { key: 'chat' as const, label: 'Chat' },
  { key: 'code' as const, label: 'Code' },
  { key: 'plan' as const, label: 'Plan' },
];

export default function TitleBar() {
  const { mode, setMode, cwd } = useChatStore();

  const breadcrumbParts = cwd ? cwd.split('/').filter(Boolean).slice(-2) : [];

  return (
    <div className="title-bar">
      <div className="title-bar-content">
        <div className="title-bar-left">
          <svg className="title-bar-icon" width="24" height="24" viewBox="0 0 120 120" fill="none">
            <path d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z" fill="var(--accent)"/>
            <ellipse cx="48" cy="62" rx="9" ry="12" fill="white"/>
            <ellipse cx="72" cy="62" rx="9" ry="12" fill="white"/>
            <ellipse cx="50" cy="65" rx="5" ry="7" fill="var(--text-primary)"/>
            <ellipse cx="74" cy="65" rx="5" ry="7" fill="var(--text-primary)"/>
            <circle cx="30" cy="78" r="3" fill="rgba(30,22,37,0.15)"/>
          </svg>
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
        <div className="mode-switcher">
          {modes.map((m) => (
            <button
              key={m.key}
              className={`mode-btn ${mode === m.key ? 'active' : ''}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
