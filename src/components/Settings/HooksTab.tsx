import { useState } from 'react';
import {
  loadHooks,
  addHook,
  removeHook,
  updateHook,
  loadMcpServers,
  addMcpServer,
  removeMcpServer,
  exportHooksConfig,
  importHooksConfig,
  type HookDefinition,
  type HookTrigger,
  type McpServerConfig,
} from '../../services/hooksManager';

export default function HooksTab() {
  const [hooks, setHooks] = useState<HookDefinition[]>(() => loadHooks());
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>(() => loadMcpServers());

  const [newTrigger, setNewTrigger] = useState<HookTrigger>('PreToolUse');
  const [newPattern, setNewPattern] = useState('');
  const [newCommand, setNewCommand] = useState('');

  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpCommand, setNewMcpCommand] = useState('');
  const [newMcpArgs, setNewMcpArgs] = useState('');

  const handleAddHook = () => {
    if (!newCommand.trim()) return;
    const hook = addHook({ trigger: newTrigger, pattern: newPattern, command: newCommand, enabled: true });
    setHooks((prev) => [...prev, hook]);
    setNewPattern('');
    setNewCommand('');
  };

  const handleRemoveHook = (id: string) => {
    removeHook(id);
    setHooks((prev) => prev.filter((h) => h.id !== id));
  };

  const handleToggleHook = (id: string, enabled: boolean) => {
    updateHook(id, { enabled });
    setHooks((prev) => prev.map((h) => (h.id === id ? { ...h, enabled } : h)));
  };

  const handleAddMcp = () => {
    if (!newMcpName.trim() || !newMcpCommand.trim()) return;
    const args = newMcpArgs.trim() ? newMcpArgs.trim().split(/\s+/) : [];
    const server = addMcpServer({ name: newMcpName, command: newMcpCommand, args, enabled: true });
    setMcpServers((prev) => [...prev, server]);
    setNewMcpName('');
    setNewMcpCommand('');
    setNewMcpArgs('');
  };

  const handleRemoveMcp = (id: string) => {
    removeMcpServer(id);
    setMcpServers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleExport = () => {
    const json = exportHooksConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'codeye-hooks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const result = importHooksConfig(ev.target?.result as string);
          setHooks(loadHooks());
          setMcpServers(loadMcpServers());
          alert(`Imported ${result.hooks} hooks and ${result.mcpServers} MCP servers.`);
        } catch {
          alert('Failed to import: invalid JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <>
      <div className="settings-section">
        <label className="settings-label">Hooks</label>
        {hooks.length === 0 && (
          <span className="settings-hint">No hooks configured.</span>
        )}
        {hooks.map((hook) => (
          <div key={hook.id} className="settings-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                [{hook.trigger}] {hook.pattern || '*'} → {hook.command}
              </span>
              {hook.description && (
                <span className="settings-hint">{hook.description}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={hook.enabled}
                onChange={(e) => handleToggleHook(hook.id, e.target.checked)}
                title="Enabled"
              />
              <button className="settings-browse-btn" onClick={() => handleRemoveHook(hook.id)}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <label className="settings-label">Add Hook</label>
        <div className="settings-row">
          <select
            className="settings-select"
            style={{ flex: 'none', width: 140 }}
            value={newTrigger}
            onChange={(e) => setNewTrigger(e.target.value as HookTrigger)}
          >
            <option value="PreToolUse">PreToolUse</option>
            <option value="PostToolUse">PostToolUse</option>
            <option value="Stop">Stop</option>
          </select>
          <input
            type="text"
            className="settings-input"
            placeholder="Pattern (e.g. Bash)"
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
          />
        </div>
        <div className="settings-row">
          <input
            type="text"
            className="settings-input"
            placeholder="Command (e.g. echo $TOOL_NAME)"
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
          />
          <button className="settings-browse-btn" onClick={handleAddHook}>
            Add
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">MCP Servers</label>
        {mcpServers.length === 0 && (
          <span className="settings-hint">No MCP servers configured.</span>
        )}
        {mcpServers.map((server) => (
          <div key={server.id} className="settings-row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 500 }}>
                {server.name}
              </span>
              <span className="settings-hint" style={{ fontFamily: 'var(--font-mono)' }}>
                {server.command} {server.args.join(' ')}
              </span>
            </div>
            <button className="settings-browse-btn" onClick={() => handleRemoveMcp(server.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="settings-section">
        <label className="settings-label">Add MCP Server</label>
        <div className="settings-row">
          <input
            type="text"
            className="settings-input"
            placeholder="Name"
            value={newMcpName}
            onChange={(e) => setNewMcpName(e.target.value)}
          />
        </div>
        <div className="settings-row">
          <input
            type="text"
            className="settings-input"
            placeholder="Command (e.g. npx)"
            value={newMcpCommand}
            onChange={(e) => setNewMcpCommand(e.target.value)}
          />
          <input
            type="text"
            className="settings-input"
            placeholder="Args (space-separated)"
            value={newMcpArgs}
            onChange={(e) => setNewMcpArgs(e.target.value)}
          />
          <button className="settings-browse-btn" onClick={handleAddMcp}>
            Add
          </button>
        </div>
      </div>

      <div className="settings-section">
        <label className="settings-label">Import / Export</label>
        <div className="settings-row">
          <button className="settings-browse-btn" onClick={handleExport}>
            Export Config
          </button>
          <button className="settings-browse-btn" onClick={handleImport}>
            Import Config
          </button>
        </div>
      </div>
    </>
  );
}
