import { useState, useMemo, useCallback, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';

export default function MessageSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messages = useChatStore((s) => s.messages);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    return messages
      .filter((m) => m.content.toLowerCase().includes(lower))
      .map((m) => ({
        id: m.id,
        role: m.role,
        snippet: extractSnippet(m.content, lower),
      }));
  }, [query, messages]);

  const handleJump = useCallback((id: string) => {
    const el = document.querySelector(`[data-message-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('search-highlight');
      setTimeout(() => el.classList.remove('search-highlight'), 2000);
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="message-search" role="search">
      <div className="message-search-bar">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          className="message-search-input"
          placeholder="Search messages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search messages"
          autoFocus
        />
        <span className="message-search-count">
          {query.trim() ? `${results.length} found` : ''}
        </span>
        <button type="button" className="message-search-close" aria-label="Close search" onClick={() => { setIsOpen(false); setQuery(''); }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {results.length > 0 && (
        <div className="message-search-results">
          {results.slice(0, 20).map((r) => (
            <button
              key={r.id}
              className="message-search-result"
              onClick={() => handleJump(r.id)}
            >
              <span className="search-result-role">{r.role}</span>
              <span className="search-result-snippet">{r.snippet}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function extractSnippet(content: string, query: string): string {
  const idx = content.toLowerCase().indexOf(query);
  if (idx === -1) return content.slice(0, 80);
  const start = Math.max(0, idx - 30);
  const end = Math.min(content.length, idx + query.length + 30);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';
  return snippet;
}
