import { FolderOpen } from 'lucide-react';
import { useFileTree } from '../../hooks/useFileTree';
import FileTreeNode from './FileTreeNode';

export default function FileTreePanel() {
  const { rootPath, nodes, expandedPaths, loadingPaths, toggleExpand, isLoading } = useFileTree();

  if (!rootPath) {
    return (
      <div className="file-tree-empty">
        <FolderOpen size={24} strokeWidth={1.5} />
        <span>未打开项目文件夹</span>
      </div>
    );
  }

  const rootEntries = nodes.get(rootPath);

  if (isLoading && !rootEntries) {
    return <div className="file-tree-loading">加载中...</div>;
  }

  if (!rootEntries || rootEntries.length === 0) {
    return (
      <div className="file-tree-empty">
        <FolderOpen size={24} strokeWidth={1.5} />
        <span>空目录</span>
      </div>
    );
  }

  return (
    <div className="file-tree" role="tree" aria-label="文件浏览器">
      {rootEntries.map((entry) => (
        <FileTreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          expandedPaths={expandedPaths}
          loadingPaths={loadingPaths}
          nodes={nodes}
          onToggle={toggleExpand}
        />
      ))}
    </div>
  );
}
