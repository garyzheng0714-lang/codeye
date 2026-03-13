const BRANCH_NAME_RE = /^[a-zA-Z0-9._/-]{1,100}$/;

export function sanitizeBranchName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export function suggestBranchName(firstMessage: string): string {
  const words = firstMessage
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => w.toLowerCase());

  if (words.length === 0) return 'feat/codeye-session';

  return `feat/${words.join('-')}`;
}

export function isValidBranchName(name: string): boolean {
  return BRANCH_NAME_RE.test(name);
}

export function resolveBranchConflict(name: string, existing: string[]): string {
  if (!existing.includes(name)) return name;

  let suffix = 2;
  while (existing.includes(`${name}-${suffix}`)) {
    suffix += 1;
  }
  return `${name}-${suffix}`;
}



export function createCheckpointRefName(sessionId: string, turnIndex: number): string {
  const short = sessionId.slice(0, 8);
  return `refs/codeye/checkpoints/${short}/${turnIndex}`;
}

export function parseCheckpointRef(refName: string): { sessionId: string; turnIndex: number } | null {
  const match = refName.match(/^refs\/codeye\/checkpoints\/([a-zA-Z0-9-]+)\/(\d+)$/);
  if (!match) return null;
  return {
    sessionId: match[1],
    turnIndex: parseInt(match[2], 10),
  };
}
