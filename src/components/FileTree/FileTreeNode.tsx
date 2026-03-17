import { memo } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { getFileIcon } from './fileIcons';

interface Props {
  entry: FileTreeEntry;
  depth: number;
  expandedPaths: Set<string>;
  loadingPaths: Set<string>;
  nodes: Map<string, FileTreeEntry[]>;
  onToggle: (dirPath: string) => void;
}

export default memo(function FileTreeNode({
  entry,
  depth,
  expandedPaths,
  loadingPaths,
  nodes,
  onToggle,
}: Props) {
  const isExpanded = entry.isDirectory && expandedPaths.has(entry.path);
  const isNodeLoading = loadingPaths.has(entry.path);
  const children = nodes.get(entry.path);
  const Icon = getFileIcon(entry.name, entry.isDirectory, isExpanded);

  return (
    <>
      <div
        className={`file-tree-row ${entry.isDirectory ? 'is-dir' : 'is-file'}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        role="treeitem"
        aria-expanded={entry.isDirectory ? isExpanded : undefined}
        onClick={() => entry.isDirectory && onToggle(entry.path)}
      >
        {entry.isDirectory && (
          <span className={`file-tree-chevron ${isExpanded ? 'expanded' : ''}`}>
            {isNodeLoading
              ? <Loader2 size={12} className="file-tree-spinner" />
              : <ChevronRight size={12} />}
          </span>
        )}
        {!entry.isDirectory && <span className="file-tree-chevron-spacer" />}
        <span className="file-tree-icon">
          <Icon size={14} strokeWidth={1.5} />
        </span>
        <span className="file-tree-name">{entry.name}</span>
      </div>
      {isExpanded && children?.map((child) => (
        <FileTreeNode
          key={child.path}
          entry={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          loadingPaths={loadingPaths}
          nodes={nodes}
          onToggle={onToggle}
        />
      ))}
    </>
  );
});
