import type { Highlighter } from 'shiki';

let highlighterPromise: Promise<Highlighter> | null = null;

const COMMON_LANGS = [
  'typescript', 'javascript', 'python', 'rust', 'go', 'java',
  'json', 'yaml', 'html', 'css', 'bash', 'sql', 'markdown',
  'tsx', 'jsx', 'c', 'cpp',
] as const;

async function createHighlighter(): Promise<Highlighter> {
  const { createHighlighter } = await import('shiki');
  return createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: [...COMMON_LANGS],
  });
}

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter();
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: string,
  theme?: 'github-light' | 'github-dark'
): Promise<string> {
  if (!theme) {
    theme = document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'github-dark'
      : 'github-light';
  }
  const highlighter = await getHighlighter();

  const loadedLangs = highlighter.getLoadedLanguages();
  const normalizedLang = lang.toLowerCase();

  if (!loadedLangs.includes(normalizedLang as never)) {
    try {
      await highlighter.loadLanguage(normalizedLang as never);
    } catch {
      return escapeHtml(code);
    }
  }

  return highlighter.codeToHtml(code, { lang: normalizedLang, theme });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
