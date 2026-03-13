const isMac = typeof navigator !== 'undefined' && navigator.platform.startsWith('Mac');
const MOD = isMac ? '\u2318' : 'Ctrl';

const SHORTCUTS = [
  { keys: `${MOD} + N`, description: 'New session' },
  { keys: `${MOD} + L`, description: 'Focus input' },
  { keys: `${MOD} + B`, description: 'Toggle sidebar' },
  { keys: `${MOD} + Enter`, description: 'Send message' },
  { keys: `${MOD} + /`, description: 'Slash commands' },
  { keys: 'Escape', description: 'Stop generation / Close palette' },
];

export default function ShortcutsTab() {
  return (
    <div className="settings-section">
      <label className="settings-label">Keyboard Shortcuts</label>
      <div className="shortcuts-list">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="shortcut-row">
            <kbd className="shortcut-keys">{s.keys}</kbd>
            <span className="shortcut-desc">{s.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
