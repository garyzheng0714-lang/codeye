import { useState } from 'react';
import {
  BUILTIN_SKILLS,
  loadInstalledSkills,
  installSkill,
  uninstallSkill,
  type Skill,
} from '../../services/skillsManager';

export default function SkillsTab() {
  const [installed, setInstalled] = useState<Skill[]>(() => loadInstalledSkills());

  const installedIds = new Set(installed.map((s) => s.id));

  const handleInstall = (skill: Omit<Skill, 'installed'>) => {
    const result = installSkill(skill);
    setInstalled(loadInstalledSkills());
    return result;
  };

  const handleUninstall = (id: string) => {
    uninstallSkill(id);
    setInstalled(loadInstalledSkills());
  };

  const notInstalled = BUILTIN_SKILLS.filter((s) => !installedIds.has(s.id));

  return (
    <>
      <div className="settings-section">
        <label className="settings-label">Installed Skills</label>
        {installed.length === 0 && (
          <span className="settings-hint">No skills installed.</span>
        )}
        {installed.map((skill) => (
          <div
            key={skill.id}
            className="settings-row"
            style={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {skill.name}
                </span>
                <span className="settings-hint" style={{ textTransform: 'capitalize' }}>
                  {skill.category}
                </span>
                <span className="settings-hint">v{skill.version}</span>
              </div>
              <span className="settings-hint">{skill.description}</span>
            </div>
            <button className="settings-browse-btn" onClick={() => handleUninstall(skill.id)}>
              Uninstall
            </button>
          </div>
        ))}
      </div>

      {notInstalled.length > 0 && (
        <div className="settings-section">
          <label className="settings-label">Available Skills</label>
          {notInstalled.map((skill) => (
            <div
              key={skill.id}
              className="settings-row"
              style={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {skill.name}
                  </span>
                  <span className="settings-hint" style={{ textTransform: 'capitalize' }}>
                    {skill.category}
                  </span>
                  <span className="settings-hint">v{skill.version}</span>
                </div>
                <span className="settings-hint">{skill.description}</span>
              </div>
              <button className="settings-browse-btn" onClick={() => handleInstall(skill)}>
                Install
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
