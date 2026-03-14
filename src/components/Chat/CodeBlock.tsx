import { useState, useEffect, useRef, memo } from 'react';
import { highlightCode } from '../../services/shikiHighlighter';

interface Props {
  code: string;
  language: string;
}

export default memo(function CodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const codeRef = useRef(code);
  const langRef = useRef(language);

  useEffect(() => {
    codeRef.current = code;
    langRef.current = language;
    let cancelled = false;

    highlightCode(code, language).then((html) => {
      if (!cancelled && codeRef.current === code && langRef.current === language) {
        setHighlightedHtml(html);
      }
    });

    return () => { cancelled = true; };
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-lang">{language}</span>
        <button type="button" className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy} aria-label={copied ? 'Copied' : 'Copy code'}>
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="3.5" y="3.5" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1" />
                <path d="M2 9V2.5a.5.5 0 01.5-.5H9" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {highlightedHtml ? (
        <div
          className="code-block-shiki"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre className="code-block-pre">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
});
