import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';

export default function SettingsPanel() {
  const { cwd, setCwd } = useChatStore();
  const [dirInput, setDirInput] = useState(cwd);

  const handleSetDir = () => {
    setCwd(dirInput);
  };

  const handleSelectDir = async () => {
    if (window.electronAPI) {
      const dir = await window.electronAPI.projects.selectDirectory();
      if (dir) {
        setDirInput(dir);
        setCwd(dir);
      }
    }
  };

  return (
    <div className="settings-panel">
      <div className="settings-section">
        <label className="settings-label">Working Directory</label>
        <div className="settings-row">
          <input
            type="text"
            className="settings-input"
            value={dirInput}
            onChange={(e) => setDirInput(e.target.value)}
            onBlur={handleSetDir}
            onKeyDown={(e) => e.key === 'Enter' && handleSetDir()}
            placeholder="/path/to/project"
          />
          {window.electronAPI && (
            <button className="settings-browse-btn" onClick={handleSelectDir}>
              Browse
            </button>
          )}
        </div>
        {cwd && <span className="settings-hint">Current: {cwd}</span>}
      </div>

      <div className="settings-section">
        <label className="settings-label">Status</label>
        <div className="settings-status">
          <span className="status-dot idle" />
          <span>Demo Mode (running inside Claude Code session)</span>
        </div>
        <p className="settings-hint">
          When running standalone, Codeye will use the real Claude CLI.
        </p>
      </div>

      <div className="settings-section">
        <label className="settings-label">About</label>
        <p className="settings-hint">
          Codeye v0.1.0 — A desktop GUI for Claude Code.
        </p>
      </div>
    </div>
  );
}
