import { useState } from 'react';
import {
  Eye,
  FilePlus,
  PencilSimple,
  TerminalWindow,
  MagnifyingGlass,
  FolderOpen,
  GlobeSimple,
  Link,
  Robot,
  Lightning,
  CircleNotch,
  Brain,
  // Alternatives to compare
  FileText,
  BookOpenText,
  NotePencil,
  Terminal,
  Binoculars,
  FolderSimpleStar,
  Globe,
  ArrowSquareOut,
  RocketLaunch,
  Sparkle,
  Code,
  GitBranch,
  TreeStructure,
  Wrench,
  CheckCircle,
  XCircle,
  Warning,
  Spinner,
} from '@phosphor-icons/react';

type WeightType = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

const TOOL_ICONS = [
  {
    tool: 'Read',
    desc: '读取文件',
    color: '#34d399',
    options: [
      { name: 'Eye', icon: Eye },
      { name: 'FileText', icon: FileText },
      { name: 'BookOpenText', icon: BookOpenText },
    ],
  },
  {
    tool: 'Write',
    desc: '创建文件',
    color: '#34d399',
    options: [
      { name: 'FilePlus', icon: FilePlus },
      { name: 'Code', icon: Code },
    ],
  },
  {
    tool: 'Edit',
    desc: '编辑文件',
    color: '#fbbf24',
    options: [
      { name: 'PencilSimple', icon: PencilSimple },
      { name: 'NotePencil', icon: NotePencil },
    ],
  },
  {
    tool: 'Bash',
    desc: '执行命令',
    color: 'var(--text-secondary)',
    options: [
      { name: 'TerminalWindow', icon: TerminalWindow },
      { name: 'Terminal', icon: Terminal },
    ],
  },
  {
    tool: 'Grep',
    desc: '搜索内容',
    color: '#38bdf8',
    options: [
      { name: 'MagnifyingGlass', icon: MagnifyingGlass },
      { name: 'Binoculars', icon: Binoculars },
    ],
  },
  {
    tool: 'Glob',
    desc: '搜索文件',
    color: '#38bdf8',
    options: [
      { name: 'FolderOpen', icon: FolderOpen },
      { name: 'FolderSimpleStar', icon: FolderSimpleStar },
    ],
  },
  {
    tool: 'WebSearch',
    desc: '网页搜索',
    color: '#a855f7',
    options: [
      { name: 'GlobeSimple', icon: GlobeSimple },
      { name: 'Globe', icon: Globe },
    ],
  },
  {
    tool: 'WebFetch',
    desc: '抓取网页',
    color: '#a855f7',
    options: [
      { name: 'Link', icon: Link },
      { name: 'ArrowSquareOut', icon: ArrowSquareOut },
    ],
  },
  {
    tool: 'Agent / Task',
    desc: '子任务',
    color: '#818cf8',
    options: [
      { name: 'Robot', icon: Robot },
      { name: 'TreeStructure', icon: TreeStructure },
      { name: 'RocketLaunch', icon: RocketLaunch },
    ],
  },
  {
    tool: 'Unknown',
    desc: '未知工具',
    color: 'var(--text-muted)',
    options: [
      { name: 'Lightning', icon: Lightning },
      { name: 'Sparkle', icon: Sparkle },
      { name: 'Wrench', icon: Wrench },
    ],
  },
];

const STATUS_ICONS = [
  { name: 'Thinking (spinner)', icon: CircleNotch, color: '#a855f7', spin: true },
  { name: 'Thinking (brain)', icon: Brain, color: '#a855f7', spin: false },
  { name: 'Success', icon: CheckCircle, color: '#34d399', spin: false },
  { name: 'Error', icon: XCircle, color: '#ef4444', spin: false },
  { name: 'Warning', icon: Warning, color: '#fbbf24', spin: false },
  { name: 'Loading', icon: Spinner, color: '#38bdf8', spin: true },
];

const WEIGHTS: WeightType[] = ['thin', 'light', 'regular', 'bold', 'fill', 'duotone'];

export default function IconPreview() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
  });
  const [activeWeight, setActiveWeight] = useState<WeightType>('duotone');
  const [iconSize, setIconSize] = useState(20);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme === 'dark' ? '#0a0a0c' : '#ffffff',
      color: theme === 'dark' ? '#e4e4e7' : '#18181b',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '40px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
            Phosphor Icons Preview
          </h1>
          <p style={{ fontSize: 14, opacity: 0.6, margin: '4px 0 0' }}>
            Codeye 工具 Icon 候选方案对比
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
              background: theme === 'dark' ? '#1a1a1e' : '#f4f4f5',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      {/* Weight Selector */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 24,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, marginRight: 8 }}>WEIGHT:</span>
        {WEIGHTS.map((w) => (
          <button
            key={w}
            onClick={() => setActiveWeight(w)}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: activeWeight === w ? '1px solid #a855f7' : `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
              background: activeWeight === w ? (theme === 'dark' ? '#2d1b4e' : '#f3e8ff') : 'transparent',
              color: activeWeight === w ? '#a855f7' : 'inherit',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeWeight === w ? 600 : 400,
            }}
          >
            {w}
          </button>
        ))}
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.5, marginLeft: 20, marginRight: 8 }}>SIZE:</span>
        {[16, 18, 20, 24].map((s) => (
          <button
            key={s}
            onClick={() => setIconSize(s)}
            style={{
              padding: '5px 10px',
              borderRadius: 6,
              border: iconSize === s ? '1px solid #a855f7' : `1px solid ${theme === 'dark' ? '#333' : '#ddd'}`,
              background: iconSize === s ? (theme === 'dark' ? '#2d1b4e' : '#f3e8ff') : 'transparent',
              color: iconSize === s ? '#a855f7' : 'inherit',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: iconSize === s ? 600 : 400,
            }}
          >
            {s}px
          </button>
        ))}
      </div>

      {/* Tool Icons Grid */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, opacity: 0.8 }}>
        Tool Icons — 工具图标候选
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
        marginBottom: 40,
      }}>
        {TOOL_ICONS.map((group) => (
          <div
            key={group.tool}
            style={{
              background: theme === 'dark' ? '#141416' : '#fafafa',
              border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
              borderRadius: 12,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{group.tool}</span>
              <span style={{ fontSize: 12, opacity: 0.5 }}>{group.desc}</span>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {group.options.map((opt) => {
                const Icon = opt.icon;
                return (
                  <div key={opt.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    {/* Static (done) */}
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: theme === 'dark' ? '#1e1e22' : '#f0f0f2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Icon size={iconSize} weight={activeWeight} color={group.color} />
                    </div>
                    <span style={{ fontSize: 11, opacity: 0.5 }}>{opt.name}</span>
                  </div>
                );
              })}
            </div>

            {/* In-card simulation: done / running / error */}
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.options.slice(0, 1).map((opt) => {
                const Icon = opt.icon;
                return (
                  <div key={opt.name + '-states'}>
                    {/* Done state */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 14px',
                      background: theme === 'dark' ? '#1a1a1e' : '#fff',
                      border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
                      borderRadius: 8,
                      marginBottom: 4,
                    }}>
                      <Icon size={16} weight={activeWeight} color={group.color} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {group.tool === 'Bash' ? 'Ran command' : group.tool === 'Grep' ? 'Searched' : group.desc}
                      </span>
                      <span style={{
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                        background: theme === 'dark' ? '#27272a' : '#f0f0f2',
                        padding: '2px 7px',
                        borderRadius: 4,
                        opacity: 0.7,
                      }}>
                        example.ts
                      </span>
                    </div>
                    {/* Running state */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 14px',
                      background: theme === 'dark' ? '#1a1a1e' : '#fff',
                      border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
                      borderRadius: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{ animation: 'spin 0.9s linear infinite', display: 'flex' }}>
                        <Icon size={16} weight={activeWeight} style={{ opacity: 0.5 }} />
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.6 }}>
                        {group.tool === 'Bash' ? 'Running command...' : group.tool === 'Grep' ? 'Searching...' : `${group.desc}...`}
                      </span>
                    </div>
                    {/* Error state */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 14px',
                      background: theme === 'dark' ? '#1c1517' : '#fef2f2',
                      border: `1px solid ${theme === 'dark' ? '#3b1d26' : '#fecaca'}`,
                      borderRadius: 8,
                    }}>
                      <Icon size={16} weight={activeWeight} color="#ef4444" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#ef4444' }}>
                        Error
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Status Icons */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, opacity: 0.8 }}>
        Status Icons — 状态图标
      </h2>
      <div style={{
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        marginBottom: 40,
      }}>
        {STATUS_ICONS.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                background: theme === 'dark' ? '#141416' : '#fafafa',
                border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
                borderRadius: 12,
                minWidth: 100,
              }}
            >
              <span style={{ animation: item.spin ? 'spin 0.9s linear infinite' : undefined, display: 'flex' }}>
                <Icon size={24} weight={activeWeight} color={item.color} />
              </span>
              <span style={{ fontSize: 11, opacity: 0.6, textAlign: 'center' }}>{item.name}</span>
            </div>
          );
        })}
      </div>

      {/* Task Module Preview */}
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, opacity: 0.8 }}>
        Task Module — 任务模块预览
      </h2>
      <div style={{ maxWidth: 560 }}>
        <div style={{
          background: theme === 'dark' ? '#141416' : '#fafafa',
          border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          {/* Task header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 16px',
            borderBottom: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
          }}>
            <Robot size={16} weight={activeWeight} color="#818cf8" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Agent Task</span>
            <span style={{ fontSize: 12, opacity: 0.4, marginLeft: 'auto' }}>3/5 completed</span>
          </div>
          {/* Task items */}
          {[
            { label: 'Read project structure', done: true },
            { label: 'Search for existing patterns', done: true },
            { label: 'Analyze dependencies', done: true },
            { label: 'Generate implementation plan', done: false, running: true },
            { label: 'Write test cases', done: false },
          ].map((task, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 16px',
                borderBottom: i < 4 ? `1px solid ${theme === 'dark' ? '#1e1e22' : '#f0f0f2'}` : 'none',
              }}
            >
              {task.done ? (
                <CheckCircle size={16} weight="fill" color="#34d399" />
              ) : task.running ? (
                <span style={{ animation: 'spin 0.9s linear infinite', display: 'flex' }}>
                  <CircleNotch size={16} weight="bold" color="#38bdf8" />
                </span>
              ) : (
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  border: `1.5px solid ${theme === 'dark' ? '#3f3f46' : '#d4d4d8'}`,
                  flexShrink: 0,
                }} />
              )}
              <span style={{
                fontSize: 13,
                fontWeight: 500,
                color: task.done ? (theme === 'dark' ? '#a1a1aa' : '#71717a') : 'inherit',
                textDecoration: task.done ? 'line-through' : 'none',
                opacity: task.done ? 0.6 : 1,
              }}>
                {task.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Full conversation simulation */}
      <h2 style={{ fontSize: 16, fontWeight: 700, margin: '40px 0 16px', opacity: 0.8 }}>
        Full Conversation Simulation — 完整会话模拟
      </h2>
      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { tool: 'Read', label: 'Read file', file: 'App.tsx', Icon: Eye, color: '#34d399', done: true },
          { tool: 'Read', label: 'Read file', file: 'utils.ts', Icon: Eye, color: '#34d399', done: true },
          { tool: 'Grep', label: 'Searched', file: '"useEffect"', Icon: MagnifyingGlass, color: '#38bdf8', done: true, count: 12 },
          { tool: 'Edit', label: 'Edited', file: 'App.tsx', Icon: PencilSimple, color: '#fbbf24', done: true },
          { tool: 'Bash', label: 'Ran command', file: 'npm run build', Icon: TerminalWindow, color: theme === 'dark' ? '#a1a1aa' : '#52525b', done: true },
          { tool: 'Glob', label: 'Searching files...', file: '**/*.css', Icon: FolderOpen, color: '#38bdf8', done: false },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 14px',
              background: theme === 'dark' ? '#141416' : '#fafafa',
              border: `1px solid ${theme === 'dark' ? '#27272a' : '#e4e4e7'}`,
              borderRadius: 8,
            }}
          >
            {item.done ? (
              <item.Icon size={16} weight={activeWeight} color={item.color} />
            ) : (
              <span style={{ animation: 'spin 0.9s linear infinite', display: 'flex' }}>
                <item.Icon size={16} weight={activeWeight} style={{ opacity: 0.5 }} />
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, opacity: item.done ? 1 : 0.6 }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 11,
              fontFamily: 'JetBrains Mono, monospace',
              background: theme === 'dark' ? '#27272a' : '#f0f0f2',
              padding: '2px 7px',
              borderRadius: 4,
              opacity: 0.7,
            }}>
              {item.file}
            </span>
            {item.count && (
              <span style={{ fontSize: 11, opacity: 0.4, fontStyle: 'italic', marginLeft: 'auto' }}>
                {item.count} results
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Inject keyframes */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
