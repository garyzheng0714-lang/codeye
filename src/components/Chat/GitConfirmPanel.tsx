import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitCommitHorizontal,
  ArrowUpFromLine,
  GitPullRequest,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  FilePlus,
  FileMinus,
} from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { subscribeWsMessages, sendMessage } from '../../services/websocket';
import { parseStreamEvent } from '../../types/streamEvent';
import {
  sendGitWriteRequest,
  handleGitWriteResult,
  type GitWriteAction,
  type GitWriteCompletedResult,
} from '../../services/gitWrite';

interface DiffStatFile {
  path: string;
  insertions: number;
  deletions: number;
}

interface DiffStat {
  files: DiffStatFile[];
  summary: { filesChanged: number; insertions: number; deletions: number };
}

type PanelPhase = 'loading' | 'preview' | 'executing' | 'success' | 'error';

interface GitConfirmPanelProps {
  action: GitWriteAction;
  onClose: () => void;
}

const actionLabels: Record<GitWriteAction, string> = {
  commit: 'Commit Changes',
  push: 'Push Branch',
  pr: 'Create Pull Request',
};

const actionIcons: Record<GitWriteAction, typeof GitCommitHorizontal> = {
  commit: GitCommitHorizontal,
  push: ArrowUpFromLine,
  pr: GitPullRequest,
};

function fileIcon(filePath: string, insertions: number, deletions: number) {
  if (insertions > 0 && deletions === 0) return <FilePlus size={13} strokeWidth={1.6} className="git-confirm-file-icon added" />;
  if (insertions === 0 && deletions > 0) return <FileMinus size={13} strokeWidth={1.6} className="git-confirm-file-icon deleted" />;
  return <FileEdit size={13} strokeWidth={1.6} className="git-confirm-file-icon modified" />;
}

async function createWorkspaceFingerprint(
  workspaceRoot: string,
  cwd: string
): Promise<string> {
  const source = `${workspaceRoot}\n${cwd}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(source);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}

export default function GitConfirmPanel({ action, onClose }: GitConfirmPanelProps) {
  const cwd = useChatStore((s) => s.cwd);
  const [phase, setPhase] = useState<PanelPhase>('loading');
  const [diffStat, setDiffStat] = useState<DiffStat | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [prTitle, setPrTitle] = useState('');
  const [prBody, setPrBody] = useState('');
  const [result, setResult] = useState<GitWriteCompletedResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const diffCorrelationRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cwd || action !== 'commit') {
      setPhase('preview');
      return;
    }

    const correlationId = crypto.randomUUID();
    diffCorrelationRef.current = correlationId;

    const fetchDiffStat = async () => {
      const normalizedCwd = cwd.replace(/[\\/]+$/, '');
      const workspaceRoot = normalizedCwd;
      const requestId = crypto.randomUUID();
      const workspaceFingerprint = await createWorkspaceFingerprint(
        workspaceRoot,
        normalizedCwd
      );

      sendMessage({
        version: 1,
        type: 'git_diff_stat_request',
        correlationId,
        payload: {
          requestId,
          cwd: normalizedCwd,
          workspaceRoot,
          workspaceFingerprint,
        },
      });
    };

    void fetchDiffStat();

    const timeout = window.setTimeout(() => {
      if (phase === 'loading') setPhase('preview');
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [cwd, action]);

  useEffect(() => {
    if (window.electronAPI) return;

    const unsubscribe = subscribeWsMessages((event) => {
      try {
        const raw = JSON.parse(event.data);
        const streamEvent = parseStreamEvent(raw);
        if (!streamEvent) return;

        if (
          streamEvent.type === 'git_diff_stat' &&
          streamEvent.correlationId === diffCorrelationRef.current
        ) {
          setDiffStat(streamEvent.payload as unknown as DiffStat);
          setPhase('preview');
          diffCorrelationRef.current = null;
          return;
        }

        if (
          streamEvent.type === 'git_commit_result' ||
          streamEvent.type === 'git_push_result' ||
          streamEvent.type === 'git_pr_result'
        ) {
          const actionMap: Record<string, GitWriteAction> = {
            git_commit_result: 'commit',
            git_push_result: 'push',
            git_pr_result: 'pr',
          };
          if (streamEvent.correlationId) {
            const completed = handleGitWriteResult(
              streamEvent.correlationId,
              actionMap[streamEvent.type],
              streamEvent.payload as unknown as Record<string, unknown>
            );
            if (completed) {
              setResult(completed);
              setPhase(completed.success ? 'success' : 'error');
            }
          }
        }
      } catch {
        // ignore
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (phase === 'preview') {
      if (action === 'commit') {
        inputRef.current?.focus();
      } else if (action === 'pr') {
        inputRef.current?.focus();
      }
    }
  }, [phase, action]);

  const handleConfirm = useCallback(async () => {
    if (!cwd) return;
    setPhase('executing');

    await sendGitWriteRequest({
      action,
      cwd,
      message: action === 'commit' ? commitMessage : undefined,
      title: action === 'pr' ? prTitle : undefined,
      body: action === 'pr' ? prBody : undefined,
      onResult: (r) => {
        setResult(r);
        setPhase(r.success ? 'success' : 'error');
      },
    });
  }, [action, cwd, commitMessage, prTitle, prBody]);

  const canConfirm = (() => {
    if (action === 'commit') return commitMessage.trim().length > 0;
    if (action === 'pr') return prTitle.trim().length > 0;
    return true;
  })();

  const Icon = actionIcons[action];

  return (
    <div className="git-confirm-overlay" onClick={onClose}>
      <div
        className="git-confirm-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={actionLabels[action]}
      >
        <div className="git-confirm-header">
          <div className="git-confirm-header-left">
            <Icon size={16} strokeWidth={1.8} />
            <span className="git-confirm-title">{actionLabels[action]}</span>
          </div>
          <button
            type="button"
            className="git-confirm-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="git-confirm-body">
          {phase === 'loading' && (
            <div className="git-confirm-loading">
              <Loader2 size={18} className="git-confirm-spinner" />
              <span>Loading diff stats...</span>
            </div>
          )}

          {phase === 'preview' && (
            <>
              {diffStat && diffStat.files.length > 0 && (
                <div className="git-confirm-diff-stat">
                  <div className="git-confirm-diff-summary">
                    <span className="git-confirm-diff-count">
                      {diffStat.summary.filesChanged} file{diffStat.summary.filesChanged !== 1 ? 's' : ''} changed
                    </span>
                    {diffStat.summary.insertions > 0 && (
                      <span className="git-confirm-additions">+{diffStat.summary.insertions}</span>
                    )}
                    {diffStat.summary.deletions > 0 && (
                      <span className="git-confirm-deletions">-{diffStat.summary.deletions}</span>
                    )}
                  </div>
                  <div className="git-confirm-file-list">
                    {diffStat.files.slice(0, 15).map((file) => (
                      <div key={file.path} className="git-confirm-file-row">
                        {fileIcon(file.path, file.insertions, file.deletions)}
                        <span className="git-confirm-file-path">{file.path}</span>
                        <span className="git-confirm-file-stat">
                          {file.insertions > 0 && <span className="git-confirm-additions">+{file.insertions}</span>}
                          {file.deletions > 0 && <span className="git-confirm-deletions">-{file.deletions}</span>}
                        </span>
                      </div>
                    ))}
                    {diffStat.files.length > 15 && (
                      <div className="git-confirm-more-files">
                        ...and {diffStat.files.length - 15} more files
                      </div>
                    )}
                  </div>
                </div>
              )}

              {action === 'commit' && (
                <div className="git-confirm-input-group">
                  <label className="git-confirm-label" htmlFor="commit-msg">Commit message</label>
                  <input
                    ref={inputRef}
                    id="commit-msg"
                    type="text"
                    className="git-confirm-input"
                    placeholder="feat: describe your changes"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && canConfirm) void handleConfirm();
                    }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}

              {action === 'pr' && (
                <>
                  <div className="git-confirm-input-group">
                    <label className="git-confirm-label" htmlFor="pr-title">PR title</label>
                    <input
                      ref={inputRef}
                      id="pr-title"
                      type="text"
                      className="git-confirm-input"
                      placeholder="feat: title of your pull request"
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="git-confirm-input-group">
                    <label className="git-confirm-label" htmlFor="pr-body">Description (optional)</label>
                    <textarea
                      ref={textareaRef}
                      id="pr-body"
                      className="git-confirm-textarea"
                      placeholder="Describe the changes..."
                      value={prBody}
                      onChange={(e) => setPrBody(e.target.value)}
                      rows={3}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {phase === 'executing' && (
            <div className="git-confirm-loading">
              <Loader2 size={18} className="git-confirm-spinner" />
              <span>Executing {action}...</span>
            </div>
          )}

          {phase === 'success' && result && (
            <div className="git-confirm-result success">
              <CheckCircle2 size={20} strokeWidth={1.8} />
              <div className="git-confirm-result-text">
                {result.action === 'commit' && (
                  <span>Committed <code>{result.hash}</code>: {result.message}</span>
                )}
                {result.action === 'push' && (
                  <span>Pushed to {result.remote}/{result.branch || 'current branch'}</span>
                )}
                {result.action === 'pr' && result.url && (
                  <span>PR created: <a href={result.url} target="_blank" rel="noopener noreferrer">#{result.number}</a></span>
                )}
              </div>
            </div>
          )}

          {phase === 'error' && result && (
            <div className="git-confirm-result error">
              <AlertCircle size={20} strokeWidth={1.8} />
              <div className="git-confirm-result-text">
                <span>{result.error?.message || 'Operation failed'}</span>
                {result.error?.retryable && (
                  <span className="git-confirm-retry-hint">This error is retryable.</span>
                )}
                {result.manualCommand && (
                  <div className="git-confirm-manual-cmd">
                    <code>{result.manualCommand}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="git-confirm-footer">
          {(phase === 'success' || phase === 'error') ? (
            <button
              type="button"
              className="git-confirm-btn secondary"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <>
              <button
                type="button"
                className="git-confirm-btn secondary"
                onClick={onClose}
                disabled={phase === 'executing'}
              >
                Cancel
              </button>
              <button
                type="button"
                className="git-confirm-btn primary"
                onClick={() => void handleConfirm()}
                disabled={!canConfirm || phase === 'loading' || phase === 'executing'}
              >
                {phase === 'executing' ? (
                  <>
                    <Loader2 size={13} className="git-confirm-spinner" />
                    Executing...
                  </>
                ) : (
                  `Confirm ${action === 'commit' ? 'Commit' : action === 'push' ? 'Push' : 'PR'}`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
