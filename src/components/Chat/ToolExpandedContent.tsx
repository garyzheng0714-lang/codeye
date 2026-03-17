import { useMemo } from 'react';
import type { ToolCallDisplay } from '../../types';
import {
  parseToolOutput,
  type ParsedEditTool,
  type ParsedReadTool,
  type ParsedBashTool,
  type ParsedSearchTool,
  type ParsedWriteTool,
} from '../../utils/toolOutputParser';
import { getLanguageFromPath } from '../../utils/fileLanguage';
import CodeBlock from './CodeBlock';

function MiniDiff({ oldString, newString }: { oldString: string; newString: string }) {
  const lines = useMemo(() => {
    const oldLines = oldString.split('\n');
    const newLines = newString.split('\n');
    const result: { type: 'add' | 'remove' | 'context'; content: string }[] = [];
    let oi = 0;
    let ni = 0;
    while (oi < oldLines.length || ni < newLines.length) {
      if (oi < oldLines.length && ni < newLines.length) {
        if (oldLines[oi] === newLines[ni]) {
          result.push({ type: 'context', content: oldLines[oi] });
          oi++;
          ni++;
        } else {
          result.push({ type: 'remove', content: oldLines[oi] });
          oi++;
          result.push({ type: 'add', content: newLines[ni] });
          ni++;
        }
      } else if (oi < oldLines.length) {
        result.push({ type: 'remove', content: oldLines[oi] });
        oi++;
      } else {
        result.push({ type: 'add', content: newLines[ni] });
        ni++;
      }
    }
    return result;
  }, [oldString, newString]);

  return (
    <div className="tool-mini-diff">
      {lines.map((line, i) => (
        <div key={i} className={`tool-diff-line tool-diff-line--${line.type}`}>
          <span className="tool-diff-sign">
            {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
          </span>
          <span className="tool-diff-text">{line.content || '\u00A0'}</span>
        </div>
      ))}
    </div>
  );
}

function EditExpanded({ data }: { data: ParsedEditTool }) {
  return (
    <div className="tool-expanded-edit">
      {data.filePath && (
        <div className="tool-expanded-path">{data.filePath}</div>
      )}
      {data.oldString != null && data.newString != null ? (
        <MiniDiff oldString={data.oldString} newString={data.newString} />
      ) : (
        <div className="tool-expanded-fallback">
          <span className="tool-diff-add">+{data.added}</span>
          {' '}
          <span className="tool-diff-del">-{data.removed}</span>
        </div>
      )}
    </div>
  );
}

function ReadExpanded({ data, rawOutput }: { data: ParsedReadTool; rawOutput?: string }) {
  const lang = getLanguageFromPath(data.filePath);
  const snippet = data.snippet || rawOutput?.split('\n').slice(0, 15).join('\n') || '';
  const totalLines = data.lineCount;
  const shownLines = snippet.split('\n').length;
  const hasMore = totalLines > shownLines;

  return (
    <div className="tool-expanded-read">
      <div className="tool-expanded-header">
        <span className="tool-expanded-path">{data.filePath}</span>
        <span className="tool-line-count">{totalLines} lines</span>
      </div>
      {snippet && (
        <div className="tool-code-preview">
          <CodeBlock code={snippet} language={lang} />
        </div>
      )}
      {hasMore && (
        <div className="tool-code-more">{totalLines - shownLines} more lines</div>
      )}
    </div>
  );
}

function BashExpanded({ data }: { data: ParsedBashTool }) {
  return (
    <div className="tool-bash-terminal">
      <div className="tool-bash-command-line">
        <span className="tool-bash-prompt">$</span>
        <span className="tool-bash-cmd">{data.command}</span>
      </div>
      {data.output && (
        <pre className={`tool-bash-output ${data.isError ? 'tool-bash-output--error' : ''}`}>
          {data.output}
        </pre>
      )}
    </div>
  );
}

function SearchExpanded({ data }: { data: ParsedSearchTool }) {
  return (
    <div className="tool-expanded-search">
      <div className="tool-expanded-header">
        {data.pattern && (
          <span className="tool-pattern-badge">{data.pattern}</span>
        )}
        <span className="tool-match-count">{data.matchCount} results</span>
      </div>
      {data.files.length > 0 && (
        <div className="tool-search-files">
          {data.files.map((file, i) => (
            <div key={i} className="tool-search-file">{file}</div>
          ))}
        </div>
      )}
      {data.truncated && (
        <div className="tool-code-more">{data.matchCount - data.files.length} more results</div>
      )}
    </div>
  );
}

function WriteExpanded({ data }: { data: ParsedWriteTool }) {
  const lang = getLanguageFromPath(data.filePath);
  const shownLines = data.contentPreview?.split('\n').length ?? 0;
  const hasMore = data.lineCount > shownLines;

  return (
    <div className="tool-expanded-write">
      <div className="tool-expanded-header">
        <span className="tool-expanded-path">{data.filePath}</span>
        <span className="tool-line-count">{data.lineCount} lines</span>
      </div>
      {data.contentPreview && (
        <div className="tool-code-preview">
          <CodeBlock code={data.contentPreview} language={lang} />
        </div>
      )}
      {hasMore && (
        <div className="tool-code-more">{data.lineCount - shownLines} more lines</div>
      )}
    </div>
  );
}

function GenericExpanded({ output }: { output: string }) {
  return <pre className="tool-block-output">{output}</pre>;
}

export default function ToolExpandedContent({ tool }: { tool: ToolCallDisplay }) {
  const parsed = useMemo(() => parseToolOutput(tool), [tool]);

  switch (parsed.kind) {
    case 'edit':
      return <EditExpanded data={parsed} />;
    case 'read':
      return <ReadExpanded data={parsed} rawOutput={tool.output} />;
    case 'bash':
      return <BashExpanded data={parsed} />;
    case 'search':
      return <SearchExpanded data={parsed} />;
    case 'write':
      return <WriteExpanded data={parsed} />;
    case 'generic':
      return <GenericExpanded output={parsed.output} />;
  }
}
