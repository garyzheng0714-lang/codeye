import { useState } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useUIStore } from '../../stores/uiStore';
import type { ThemeId } from '../../services/themeManager';
import { getLocale, setLocale, AVAILABLE_LOCALES, type Locale } from '../../i18n';

export default function GeneralTab() {
  const cwd = useChatStore((s) => s.cwd);
  const setCwd = useChatStore((s) => s.setCwd);
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const [dirInput, setDirInput] = useState(cwd);
  const [locale, setLocaleState] = useState<Locale>(getLocale());

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

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
  };

  return (
    <>
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
        <label className="settings-label">Theme</label>
        <div className="settings-row">
          <select
            className="settings-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">Language</label>
        <div className="settings-row">
          <select
            className="settings-select"
            value={locale}
            onChange={(e) => handleLocaleChange(e.target.value as Locale)}
          >
            {AVAILABLE_LOCALES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
