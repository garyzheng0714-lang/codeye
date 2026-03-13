import type React from 'react';

const iconMap: Record<string, React.ReactNode> = {
  chat: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 3V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  code: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M5 4L1 8l4 4M11 4l4 4-4 4M9 2l-2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plan: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 3h10v2H3zM3 7h7v2H3zM3 11h5v2H3z" fill="currentColor" opacity="0.8" />
    </svg>
  ),
  git: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="5" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 5.5v5M5 4h6" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  ),
  build: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v4l3 2-3 2v4l7-6-7-6z" fill="currentColor" opacity="0.8" />
      <path d="M1 5h5M1 8h4M1 11h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  review: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 8l1.5 1.5L10 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  test: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M6 2v4L3 12h10L10 6V2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M4 2h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  clean: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.5 3h3.2l-2.6 2 1 3.1L8 8.4 4.9 10l1-3-2.6-2h3.2L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  security: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1L2 4v4c0 3.3 2.6 6.4 6 7 3.4-.6 6-3.7 6-7V4L8 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  save: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h8l3 3v9H2V2h1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 2v4h6V2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 10h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  restore: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 8a6 6 0 1 1 1 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M2 12V8h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  clear: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  new: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  help: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 6a2 2 0 1 1 2 2v1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.8" fill="currentColor" />
    </svg>
  ),
  compact: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M4 2v4l4-2-4-2zM12 14v-4l-4 2 4 2zM2 8h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  model: (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5a2.5 2.5 0 0 1 2.5 2.5v1h1A1.5 1.5 0 0 1 13 6.5v6A1.5 1.5 0 0 1 11.5 14h-7A1.5 1.5 0 0 1 3 12.5v-6A1.5 1.5 0 0 1 4.5 5h1V4A2.5 2.5 0 0 1 8 1.5zm0 1.2A1.3 1.3 0 0 0 6.7 4v1h2.6V4A1.3 1.3 0 0 0 8 2.7zM8 8a1.2 1.2 0 0 0-.6 2.2v1a.6.6 0 0 0 1.2 0v-1A1.2 1.2 0 0 0 8 8z" fill="currentColor" opacity="0.8" />
    </svg>
  ),
};

export function getCommandIcon(iconName: string): React.ReactNode {
  return iconMap[iconName] ?? iconMap.help;
}
