import { useState } from 'react';
import GeneralTab from './GeneralTab';
import ModelTab from './ModelTab';
import ShortcutsTab from './ShortcutsTab';
import AboutTab from './AboutTab';
import HooksTab from './HooksTab';
import SkillsTab from './SkillsTab';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'model', label: 'Model' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'about', label: 'About' },
  { id: 'hooks', label: 'Hooks' },
  { id: 'skills', label: 'Skills' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="settings-panel">
      <div className="settings-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="settings-content">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'model' && <ModelTab />}
        {activeTab === 'shortcuts' && <ShortcutsTab />}
        {activeTab === 'about' && <AboutTab />}
        {activeTab === 'hooks' && <HooksTab />}
        {activeTab === 'skills' && <SkillsTab />}
      </div>
    </div>
  );
}
