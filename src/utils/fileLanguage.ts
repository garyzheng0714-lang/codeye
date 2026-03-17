const extMap: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  vue: 'vue',
  svelte: 'svelte',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  php: 'php',
  lua: 'lua',
  zig: 'zig',
};

export function getLanguageFromPath(filePath: string): string {
  const dot = filePath.lastIndexOf('.');
  if (dot === -1) {
    const base = filePath.split('/').pop()?.toLowerCase() ?? '';
    if (base === 'dockerfile') return 'dockerfile';
    if (base === 'makefile') return 'makefile';
    return 'text';
  }
  const ext = filePath.slice(dot + 1).toLowerCase();
  return extMap[ext] ?? 'text';
}
