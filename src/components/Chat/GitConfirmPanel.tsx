import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GitCommitHorizontal,
  ArrowUpFromLine,
  GitPullRequest,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Check,
  GitBranch,
} from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { subscribeWsMessages, sendMessage } from '../../services/websocket';
import { parseStreamEvent } from '../../types/streamEvent';
import {
  sendGitWriteRequest,
  sendGitAddRequest,
  handleGitWriteResult,
  type GitWriteCompletedResult,
} from '../../services/gitWrite';
import { useGitStatus } from '../../hooks/useGitStatus';

interface DiffStat {
  files: Array<{ path: string; insertions: number; deletions: number }>;
  summary: { filesChanged: number; insertions: number; deletions: number };
}

type PanelPhase = 'loading' | 'preview' | 'executing' | 'success' | 'error';
type NextStep = 'commit' | 'commit-push' | 'commit-push-pr';

interface GitConfirmPanelProps {
  onClose: () => void;
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

const STEP_OPTIONS: Array<{
  value: NextStep;
  icon: typeof GitCommitHorizontal;
  label: string;
}> = [
  { value: 'commit', icon: GitCommitHorizontal, label: '\u63d0\u4ea4' },
  { value: 'commit-push', icon: ArrowUpFromLine, label: '\u63d0\u4ea4\u5e76\u63a8\u9001' },
  { value: 'commit-push-pr', icon: GitPullRequest, label: '\u63d0\u4ea4\u5e76\u521b\u5efa PR' },
];

export default function GitConfirmPanel({ onClose }: GitConfirmPanelProps) {
  const cwd = useChatStore((s) => s.cwd);
  const { status: gitStatus } = useGitStatus();

  const [phase, setPhase] = useState<PanelPhase>('loading');
  const [nextStep, setNextStep] = useState<NextStep>('commit');
  const [includeUnstaged, setIncludeUnstaged] = useState(true);
  const [commitMessage, setCommitMessage] = useState('');
  const [executionStep, setExecutionStep] = useState('');
  const [result, setResult] = useState<GitWriteCompletedResult | null>(null);
  const [diffStat, setDiffStat] = useState<DiffStat | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const diffCorrelationRef = useRef<string | null>(null);
  const executingRef = useRef(false);

  useEffect(() => {
    if (!cwd) {
      setPhase('preview');
      return;
    }

    const correlationId = crypto.randomUUID();
    diffCorrelationRef.current = correlationId;

    const fetchDiffStat = async () => {
      const normalizedCwd = cwd.replace(/[\\/]+$/, '');
      const requestId = crypto.randomUUID();
      const workspaceFingerprint = await createWorkspaceFingerprint(
        normalizedCwd,
        normalizedCwd
      );

      sendMessage({
        version: 1,
        type: 'git_diff_stat_request',
        correlationId,
        payload: {
          requestId,
          cwd: normalizedCwd,
          workspaceRoot: normalizedCwd,
          workspaceFingerprint,
        },
      });
    };

    void fetchDiffStat();

    const timeout = window.setTimeout(() => {
      if (phase === 'loading') setPhase('preview');
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [cwd]);

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
          streamEvent.type === 'git_add_result' &&
          streamEvent.correlationId &&
          executingRef.current
        ) {
          const payload = streamEvent.payload as unknown as {
            success: boolean;
            error?: { code: string; message: string; retryable?: boolean };
          };
          if (!payload.success) {
            setResult({
              action: 'commit',
              operationId: '',
              success: false,
              error: payload.error ?? { code: 'ADD_FAILED', message: 'Failed to stage files' },
            });
            setPhase('error');
            executingRef.current = false;
          }
          return;
        }

        if (
          streamEvent.type === 'git_commit_result' ||
          streamEvent.type === 'git_push_result' ||
          streamEvent.type === 'git_pr_result'
        ) {
          const actionMap: Record<string, 'commit' | 'push' | 'pr'> = {
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
              executingRef.current = false;
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
      inputRef.current?.focus();
    }
  }, [phase]);

  const handleSubmit = useCallback(async () => {
    if (!cwd) return;
    executingRef.current = true;
    setPhase('executing');

    try {
      if (includeUnstaged) {
        setExecutionStep('\u6682\u5b58\u6587\u4ef6...');
        await sendGitAddRequest({ cwd });
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setExecutionStep('\u63d0\u4ea4\u4e2d...');
      const commitOp = await sendGitWriteRequest({
        action: 'commit',
        cwd,
        message: commitMessage || undefined,
        onResult: (commitResult) => {
          if (!commitResult.success) {
            setResult(commitResult);
            setPhase('error');
            executingRef.current = false;
            return;
          }

          if (nextStep === 'commit') {
            setResult(commitResult);
            setPhase('success');
            executingRef.current = false;
            return;
          }

          setExecutionStep('\u63a8\u9001\u4e2d...');
          void sendGitWriteRequest({
            action: 'push',
            cwd: cwd!,
            onResult: (pushResult) => {
              if (!pushResult.success) {
                setResult(pushResult);
                setPhase('error');
                executingRef.current = false;
                return;
              }

              if (nextStep === 'commit-push') {
                setResult(pushResult);
                setPhase('success');
                executingRef.current = false;
                return;
              }

              setExecutionStep('\u521b\u5efa PR...');
              void sendGitWriteRequest({
                action: 'pr',
                cwd: cwd!,
                onResult: (prResult) => {
                  setResult(prResult);
                  setPhase(prResult.success ? 'success' : 'error');
                  executingRef.current = false;
                },
              });
            },
          });
        },
      });

      void commitOp;
    } catch {
      setResult({
        action: 'commit',
        operationId: '',
        success: false,
        error: { code: 'UNEXPECTED', message: 'Unexpected error during execution' },
      });
      setPhase('error');
      executingRef.current = false;
    }
  }, [cwd, includeUnstaged, commitMessage, nextStep]);

  const fileCount = diffStat?.summary.filesChanged ?? 0;
  const insertions = diffStat?.summary.insertions ?? 0;
  const deletions = diffStat?.summary.deletions ?? 0;

  return (
    <div className="git-confirm-overlay" onClick={onClose}>
      <div
        className="git-confirm-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Commit changes"
      >
        {/* Header */}
        <div className="git-confirm-header">
          <div className="git-confirm-header-left">
            <GitCommitHorizontal size={14} strokeWidth={1.8} />
            <span className="git-confirm-header-label">COMMIT</span>
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
              <span>Loading...</span>
            </div>
          )}

          {phase === 'preview' && (
            <>
              {/* Title */}
              <h2 className="git-confirm-title">{'\u63d0\u4ea4\u66f4\u6539'}</h2>

              {/* Branch row */}
              <div className="git-confirm-info-row">
                <span className="git-confirm-info-label">{'\u5206\u652f'}</span>
                <div className="git-confirm-info-value">
                  <GitBranch size={13} strokeWidth={1.8} />
                  <span>{gitStatus.branch ?? 'unknown'}</span>
                </div>
              </div>

              {/* Changes row */}
              <div className="git-confirm-info-row">
                <span className="git-confirm-info-label">{'\u66f4\u6539'}</span>
                <div className="git-confirm-info-value">
                  <span>{fileCount} file{fileCount !== 1 ? 's' : ''}</span>
                  {insertions > 0 && (
                    <span className="git-confirm-additions">+{insertions}</span>
                  )}
                  {deletions > 0 && (
                    <span className="git-confirm-deletions">-{deletions}</span>
                  )}
                </div>
              </div>

              {/* Unstaged toggle */}
              <div className="git-confirm-toggle-row">
                <div
                  className={`git-confirm-toggle ${includeUnstaged ? 'on' : ''}`}
                  onClick={() => setIncludeUnstaged((v) => !v)}
                  role="switch"
                  aria-checked={includeUnstaged}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIncludeUnstaged((v) => !v);
                    }
                  }}
                >
                  <div className="git-confirm-toggle-thumb" />
                </div>
                <span className="git-confirm-toggle-label">
                  {'\u5305\u542b\u672a\u6682\u5b58\u7684\u66f4\u6539'}
                </span>
              </div>

              {/* Commit message */}
              <div className="git-confirm-input-group">
                <label className="git-confirm-label" htmlFor="commit-msg">
                  {'\u63d0\u4ea4\u6d88\u606f'}
                </label>
                <input
                  ref={inputRef}
                  id="commit-msg"
                  type="text"
                  className="git-confirm-input"
                  placeholder={'\u7559\u7a7a\u4ee5\u81ea\u52a8\u751f\u6210\u63d0\u4ea4\u6d88\u606f'}
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSubmit();
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {/* Next steps */}
              <div className="git-confirm-steps-section">
                <span className="git-confirm-label">{'\u540e\u7eed\u6b65\u9aa4'}</span>
                <div className="git-confirm-steps-list">
                  {STEP_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const selected = nextStep === opt.value;
                    return (
                      <div
                        key={opt.value}
                        className={`git-confirm-step-option ${selected ? 'selected' : ''}`}
                        onClick={() => setNextStep(opt.value)}
                        role="radio"
                        aria-checked={selected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setNextStep(opt.value);
                          }
                        }}
                      >
                        <Icon size={14} strokeWidth={1.8} />
                        <span className="git-confirm-step-label">{opt.label}</span>
                        {selected && (
                          <Check size={14} strokeWidth={2} className="git-confirm-step-check" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {phase === 'executing' && (
            <div className="git-confirm-loading">
              <Loader2 size={18} className="git-confirm-spinner" />
              <span>{executionStep}</span>
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
                  <span>Pushed to {result.remote}/{result.branch ?? 'current branch'}</span>
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
                <span>{result.error?.message ?? 'Operation failed'}</span>
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

        {/* Footer */}
        <div className="git-confirm-footer">
          {phase === 'success' || phase === 'error' ? (
            <button
              type="button"
              className="git-confirm-btn secondary"
              onClick={onClose}
            >
              Close
            </button>
          ) : (
            <button
              type="button"
              className="git-confirm-submit-btn"
              onClick={() => void handleSubmit()}
              disabled={phase === 'loading' || phase === 'executing'}
            >
              {phase === 'executing' ? (
                <>
                  <Loader2 size={13} className="git-confirm-spinner" />
                  {executionStep}
                </>
              ) : (
                '\u7ee7\u7eed'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
