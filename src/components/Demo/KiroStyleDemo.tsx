import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CodeBlock from '../Chat/CodeBlock';

// Kiro-style status circle component
function StepStatusCircle({ status }: { status: 'done' | 'running' | 'error' }) {
  if (status === 'running') {
    return (
      <span className="kiro-status kiro-status--running">
        <span className="kiro-status-dot" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="kiro-status kiro-status--error">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 3v2M5 6.5v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="kiro-status kiro-status--done">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// Demo tool block
function DemoToolBlock({
  status,
  label,
  fileName,
  output
}: {
  status: 'done' | 'running' | 'error';
  label: string;
  fileName?: string;
  output?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="tool-block">
      <div className="tool-block-header" onClick={() => output && setExpanded(!expanded)}>
        <StepStatusCircle status={status} />
        <span className="tool-block-label">{label}</span>
        {fileName && <span className="tool-file-badge">{fileName}</span>}
        {output && (
          <span className="tool-block-expand">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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

// Demo read file group
function DemoReadGroup({ count, status }: { count: number; status: 'done' | 'running' | 'error' }) {
  return (
    <div className="tool-block">
      <div className="tool-block-header">
        <StepStatusCircle status={status} />
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

// Demo thinking block
function DemoThinkingBlock() {
  return (
    <div className="thinking-block">
      <StepStatusCircle status="running" />
      <span className="thinking-text">Thinking</span>
    </div>
  );
}

// Demo tool card (from ToolCall.tsx)
function DemoToolCard({
  status,
  label,
  fileName,
  count
}: {
  status: 'done' | 'running' | 'error';
  label: string;
  fileName?: string;
  count?: number;
}) {
  return (
    <div className={`tool-card tool-card--${status}`}>
      <div className="tool-card-row">
        <StepStatusCircle status={status} />
        <span className="tool-card-label">{label}</span>
        {fileName && <span className="tool-file-badge">{fileName}</span>}
        {count !== undefined && <span className="tool-count-badge">{count} results</span>}
      </div>
    </div>
  );
}

export default function KiroStyleDemo() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="kiro-demo" data-theme={theme}>
      <div className="kiro-demo-header">
        <h1>Kiro Style UI Components</h1>
        <button className="demo-theme-toggle" onClick={toggleTheme}>
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      <div className="kiro-demo-content">
        {/* Section: Status Circles */}
        <section className="demo-section">
          <h2>状态圆点 (Status Circles)</h2>
          <div className="demo-row">
            <div className="demo-item">
              <StepStatusCircle status="done" />
              <span>Done</span>
            </div>
            <div className="demo-item">
              <StepStatusCircle status="running" />
              <span>Running</span>
            </div>
            <div className="demo-item">
              <StepStatusCircle status="error" />
              <span>Error</span>
            </div>
          </div>
        </section>

        {/* Section: Tool Blocks */}
        <section className="demo-section">
          <h2>工具卡片 (Tool Blocks)</h2>
          <div className="demo-stack">
            <DemoToolBlock status="done" label="Read" fileName="App.tsx" output="import React from 'react';\n\nexport default function App() {\n  return <div>Hello World</div>;\n}" />
            <DemoToolBlock status="running" label="Searching" fileName="*.tsx" />
            <DemoToolBlock status="error" label="Ran command" fileName="build.sh" output="Error: Command failed with exit code 1" />
            <DemoToolBlock status="done" label="Edited" fileName="utils.ts" />
          </div>
        </section>

        {/* Section: Read File Groups */}
        <section className="demo-section">
          <h2>文件组 (Read Groups)</h2>
          <div className="demo-stack">
            <DemoReadGroup count={1} status="done" />
            <DemoReadGroup count={3} status="done" />
            <DemoReadGroup count={6} status="running" />
          </div>
        </section>

        {/* Section: Tool Cards (ToolCall style) */}
        <section className="demo-section">
          <h2>工具卡片变体 (Tool Cards)</h2>
          <div className="demo-stack">
            <DemoToolCard status="done" label="Searched" fileName="*.ts" count={12} />
            <DemoToolCard status="running" label="Reading" fileName="config.json" />
            <DemoToolCard status="error" label="Command failed" />
          </div>
        </section>

        {/* Section: Thinking */}
        <section className="demo-section">
          <h2>思考状态 (Thinking)</h2>
          <div className="demo-stack">
            <DemoThinkingBlock />
          </div>
        </section>

        {/* Section: Code Blocks */}
        <section className="demo-section">
          <h2>代码块 (Code Blocks)</h2>
          <CodeBlock
            code={`function greet(name: string) {\n  console.log(\`Hello, \${name}!\`);\n  return {\n    message: \`Welcome to Codeye\`,\n    timestamp: Date.now()\n  };\n}`}
            language="typescript"
          />
          <CodeBlock
            code={`import { useState, useEffect } from 'react';\n\nexport function useCounter(initial = 0) {\n  const [count, setCount] = useState(initial);\n  \n  const increment = () => setCount(c => c + 1);\n  const decrement = () => setCount(c => c - 1);\n  \n  return { count, increment, decrement };\n}`}
            language="typescript"
          />
        </section>

        {/* Section: File Badges */}
        <section className="demo-section">
          <h2>文件徽章 (File Badges)</h2>
          <div className="demo-row">
            <span className="tool-file-badge">App.tsx</span>
            <span className="tool-file-badge">index.ts</span>
            <span className="tool-file-badge">styles.css</span>
            <span className="tool-file-badge">package.json</span>
            <span className="tool-file-badge">tsconfig.json</span>
          </div>
        </section>

        {/* Section: Labels */}
        <section className="demo-section">
          <h2>工具标签 (Tool Labels)</h2>
          <div className="demo-row">
            <span className="tool-block-label">Read</span>
            <span className="tool-block-label">Searched</span>
            <span className="tool-block-label">Edited</span>
            <span className="tool-block-label">Ran command</span>
          </div>
        </section>

        {/* Section: Combined Example */}
        <section className="demo-section">
          <h2>完整示例 (Full Example)</h2>
          <div className="demo-stack">
            <DemoReadGroup count={4} status="done" />
            <DemoToolBlock status="done" label="Searched" fileName="*.tsx" />
            <DemoToolBlock status="done" label="Edited" fileName="App.tsx" output={`- const old = 'value';\n+ const new = 'updated';`} />
            <DemoThinkingBlock />
          </div>
        </section>
      </div>
    </div>
  );
}