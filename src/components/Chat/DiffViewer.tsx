import { useState, useMemo } from 'react';

interface Props {
  oldText: string;
  newText: string;
  fileName?: string;
}

type ViewMode = 'unified' | 'split';

interface DiffLine {
  type: 'add' | 'remove' | 'context';
  content: string;
  oldNum: number | null;
  newNum: number | null;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        result.push({
          type: 'context',
          content: oldLines[oldIdx],
          oldNum: oldIdx + 1,
          newNum: newIdx + 1,
        });
        oldIdx++;
        newIdx++;
      } else {
        result.push({
          type: 'remove',
          content: oldLines[oldIdx],
          oldNum: oldIdx + 1,
          newNum: null,
        });
        oldIdx++;
        result.push({
          type: 'add',
          content: newLines[newIdx],
          oldNum: null,
          newNum: newIdx + 1,
        });
        newIdx++;
      }
    } else if (oldIdx < oldLines.length) {
      result.push({
        type: 'remove',
        content: oldLines[oldIdx],
        oldNum: oldIdx + 1,
        newNum: null,
      });
      oldIdx++;
    } else {
      result.push({
        type: 'add',
        content: newLines[newIdx],
        oldNum: null,
        newNum: newIdx + 1,
      });
      newIdx++;
    }
  }

  return result;
}

export default function DiffViewer({ oldText, newText, fileName }: Props) {
  const [mode, setMode] = useState<ViewMode>('unified');
  const lines = useMemo(() => computeDiff(oldText, newText), [oldText, newText]);

  const additions = lines.filter((l) => l.type === 'add').length;
  const deletions = lines.filter((l) => l.type === 'remove').length;

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        {fileName && <span className="diff-filename">{fileName}</span>}
        <span className="diff-stats">
          <span className="diff-add">+{additions}</span>
          <span className="diff-del">-{deletions}</span>
        </span>
        <div className="diff-mode-toggle">
          <button
            className={mode === 'unified' ? 'active' : ''}
            onClick={() => setMode('unified')}
          >
            Unified
          </button>
          <button
            className={mode === 'split' ? 'active' : ''}
            onClick={() => setMode('split')}
          >
            Split
          </button>
        </div>
      </div>
      <div className={`diff-body diff-body--${mode}`}>
        {mode === 'unified' ? (
          <table className="diff-table">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className={`diff-line diff-line--${line.type}`}>
                  <td className="diff-gutter">{line.oldNum ?? ''}</td>
                  <td className="diff-gutter">{line.newNum ?? ''}</td>
                  <td className="diff-sign">
                    {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                  </td>
                  <td className="diff-content">{line.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="diff-split">
            <table className="diff-table diff-left">
              <tbody>
                {lines
                  .filter((l) => l.type !== 'add')
                  .map((line, i) => (
                    <tr key={i} className={`diff-line diff-line--${line.type}`}>
                      <td className="diff-gutter">{line.oldNum ?? ''}</td>
                      <td className="diff-content">{line.content}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <table className="diff-table diff-right">
              <tbody>
                {lines
                  .filter((l) => l.type !== 'remove')
                  .map((line, i) => (
                    <tr key={i} className={`diff-line diff-line--${line.type}`}>
                      <td className="diff-gutter">{line.newNum ?? ''}</td>
                      <td className="diff-content">{line.content}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
