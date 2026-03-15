import { useState } from 'react';
import { CaretDown, CaretRight, CheckCircle, CircleNotch } from '@phosphor-icons/react';
import CodeBlock from '../Chat/CodeBlock';
import { ToolIcon, SpinnerIcon } from '../../data/toolIcons';
import { getToolColor } from '../../data/toolMeta';

type ToolName = 'Read' | 'Write' | 'Edit' | 'Bash' | 'Grep' | 'Glob' | 'WebSearch' | 'WebFetch' | 'Agent';
type Status = 'done' | 'running' | 'error';

function ToolStatusIcon({ name, status }: { name: ToolName; status: Status }) {
  const color = status === 'error'
    ? 'var(--danger)'
    : status === 'running'
      ? 'var(--text-muted)'
      : getToolColor(name);

  return (
    <span className={`tool-icon ${status === 'running' ? 'tool-icon--spinning' : ''}`} style={{ color }}>
      {status === 'running' ? <SpinnerIcon size={15} /> : <ToolIcon name={name} size={15} />}
    </span>
  );
}

function DemoToolBlock({
  name,
  status,
  label,
  fileName,
  output,
}: {
  name: ToolName;
  status: Status;
  label: string;
  fileName?: string;
  output?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="tool-block">
      <div className="tool-block-header" onClick={() => output && setExpanded(!expanded)}>
        <ToolStatusIcon name={name} status={status} />
        <span className="tool-block-label">{label}</span>
        {fileName && <span className="tool-file-badge">{fileName}</span>}
        {output && (
          <span className="tool-block-expand">
            {expanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </span>
        )}
      </div>
      {expanded && output && (
        <div className="tool-block-content">
          <pre className="tool-block-output">{output}</pre>
        </div>
      )}
    </div>
  );
}

function DemoReadGroup({ count, status }: { count: number; status: Status }) {
  const color = status === 'running' ? 'var(--text-muted)' : getToolColor('Read');

  return (
    <div className="tool-block">
      <div className="tool-block-header">
        <span className={`tool-icon ${status === 'running' ? 'tool-icon--spinning' : ''}`} style={{ color }}>
          {status === 'running' ? <SpinnerIcon size={15} /> : <ToolIcon name="Read" size={15} />}
        </span>
        <span className="tool-block-label">Read {count} files</span>
        <div className="tool-block-files">
          {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
            <span key={i} className="tool-file-badge">{['App.tsx', 'index.ts', 'utils.ts', 'types.ts'][i]}</span>
          ))}
          {count > 4 && <span className="tool-block-more">+{count - 4}</span>}
        </div>
      </div>
    </div>
  );
}

function DemoThinkingBlock() {
  return (
    <div className="thinking-block">
      <SpinnerIcon size={15} />
      <span className="thinking-text">Thinking</span>
    </div>
  );
}

function DemoToolCard({
  name,
  status,
  label,
  fileName,
  count,
}: {
  name: ToolName;
  status: Status;
  label: string;
  fileName?: string;
  count?: number;
}) {
  return (
    <div className={`tool-card tool-card--${status}`}>
      <div className="tool-card-row">
        <ToolStatusIcon name={name} status={status} />
        <span className="tool-card-label">{label}</span>
        {fileName && <span className="tool-file-badge">{fileName}</span>}
        {count !== undefined && <span className="tool-count-badge">{count} results</span>}
      </div>
    </div>
  );
}

function DemoTaskModule() {
  const tasks = [
    { label: 'Read project structure', done: true },
    { label: 'Search for existing patterns', done: true },
    { label: 'Analyze dependencies', done: true },
    { label: 'Generate implementation plan', done: false, running: true },
    { label: 'Write test cases', done: false },
  ];
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div className="task-module">
      <div className="task-module-header">
        <span className="tool-icon" style={{ color: '#818cf8' }}>
          <ToolIcon name="Agent" size={15} />
        </span>
        <span className="task-module-title">Agent Task</span>
        <span className="task-module-count">{doneCount}/{tasks.length}</span>
      </div>
      <div className="task-module-list">
        {tasks.map((task, i) => (
          <div key={i} className={`task-item ${task.done ? 'task-item--done' : ''}`}>
            {task.done ? (
              <CheckCircle size={15} weight="fill" className="task-item-check" />
            ) : task.running ? (
              <CircleNotch size={15} weight="bold" className="task-item-spinner tool-spinner" />
            ) : (
              <span className="task-item-circle" />
            )}
            <span className="task-item-label">{task.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function KiroStyleDemo() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="kiro-demo" data-theme={theme}>
      <div className="kiro-demo-header">
        <h1>Codeye UI Components</h1>
        <button className="demo-theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </div>

      <div className="kiro-demo-content">
        {/* Section: Tool Icons */}
        <section className="demo-section">
          <h2>Tool Icons (Phosphor Bold)</h2>
          <div className="demo-row">
            {(['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'WebSearch', 'WebFetch', 'Agent'] as ToolName[]).map((name) => (
              <div key={name} className="demo-item">
                <span className="tool-icon" style={{ color: getToolColor(name) }}>
                  <ToolIcon name={name} size={18} />
                </span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Section: Tool Blocks */}
        <section className="demo-section">
          <h2>Tool Blocks</h2>
          <div className="demo-stack">
            <DemoToolBlock name="Read" status="done" label="Read file" fileName="App.tsx" output="import React from 'react';\n\nexport default function App() {\n  return <div>Hello</div>;\n}" />
            <DemoToolBlock name="Grep" status="running" label="Searching..." fileName="*.tsx" />
            <DemoToolBlock name="Bash" status="error" label="Command failed" fileName="build.sh" output="Error: Command failed with exit code 1" />
            <DemoToolBlock name="Edit" status="done" label="Edited" fileName="utils.ts" />
          </div>
        </section>

        {/* Section: Read File Groups */}
        <section className="demo-section">
          <h2>Read File Groups</h2>
          <div className="demo-stack">
            <DemoReadGroup count={1} status="done" />
            <DemoReadGroup count={3} status="done" />
            <DemoReadGroup count={6} status="running" />
          </div>
        </section>

        {/* Section: Tool Cards (ToolCall.tsx style) */}
        <section className="demo-section">
          <h2>Tool Cards</h2>
          <div className="demo-stack">
            <DemoToolCard name="Grep" status="done" label="Searched" fileName="*.ts" count={12} />
            <DemoToolCard name="Read" status="running" label="Reading..." fileName="config.json" />
            <DemoToolCard name="Bash" status="error" label="Command failed" />
            <DemoToolCard name="Edit" status="done" label="Edited" fileName="App.tsx" />
            <DemoToolCard name="Glob" status="done" label="Found files" fileName="**/*.css" count={8} />
            <DemoToolCard name="WebSearch" status="done" label="Web search" fileName="phosphor icons react" />
          </div>
        </section>

        {/* Section: Task Module */}
        <section className="demo-section">
          <h2>Task Module</h2>
          <div className="demo-stack">
            <DemoTaskModule />
          </div>
        </section>

        {/* Section: Thinking */}
        <section className="demo-section">
          <h2>Thinking State</h2>
          <div className="demo-stack">
            <DemoThinkingBlock />
          </div>
        </section>

        {/* Section: Code Blocks */}
        <section className="demo-section">
          <h2>Code Blocks</h2>
          <CodeBlock
            code={`function greet(name: string) {\n  console.log(\`Hello, \${name}!\`);\n  return {\n    message: \`Welcome to Codeye\`,\n    timestamp: Date.now()\n  };\n}`}
            language="typescript"
          />
        </section>

        {/* Section: File Badges */}
        <section className="demo-section">
          <h2>File Badges</h2>
          <div className="demo-row">
            <span className="tool-file-badge">App.tsx</span>
            <span className="tool-file-badge">index.ts</span>
            <span className="tool-file-badge">styles.css</span>
            <span className="tool-file-badge">package.json</span>
          </div>
        </section>

        {/* Section: Full Conversation Simulation */}
        <section className="demo-section">
          <h2>Full Conversation Simulation</h2>
          <div className="demo-stack">
            <DemoReadGroup count={4} status="done" />
            <DemoToolBlock name="Grep" status="done" label="Searched" fileName="*.tsx" />
            <DemoToolBlock name="Edit" status="done" label="Edited" fileName="App.tsx" output={`- const old = 'value';\n+ const new = 'updated';`} />
            <DemoTaskModule />
            <DemoThinkingBlock />
          </div>
        </section>
      </div>
    </div>
  );
}
