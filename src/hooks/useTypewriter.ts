import { useState, useEffect, useRef } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number; // ms per char
  enabled?: boolean;
  onComplete?: () => void;
}

export function useTypewriter({ text, speed = 8, enabled = true, onComplete }: UseTypewriterOptions) {
  const [displayText, setDisplayText] = useState(enabled ? '' : text);
  const [isComplete, setIsComplete] = useState(!enabled);
  const indexRef = useRef(0);
  const textRef = useRef(text);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Update ref when text changes
  if (text !== textRef.current) {
    textRef.current = text;
    if (!enabled) {
      setDisplayText(text);
    }
  }

  useEffect(() => {
    if (!enabled) {
      setDisplayText(text);
      setIsComplete(true);
      return;
    }

    // Reset when text changes significantly (new message)
    if (text.length < displayText.length || displayText === '') {
      indexRef.current = 0;
      setDisplayText('');
      setIsComplete(false);
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= speed) {
        lastTimeRef.current = timestamp;

        if (indexRef.current < text.length) {
          // Type multiple characters for speed
          const charsToType = Math.max(1, Math.floor(elapsed / speed));
          const nextIndex = Math.min(indexRef.current + charsToType, text.length);
          indexRef.current = nextIndex;
          setDisplayText(text.slice(0, nextIndex));

          if (nextIndex >= text.length) {
            setIsComplete(true);
            onComplete?.();
            return;
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [text, enabled, speed, onComplete]);

  // Handle streaming - when text updates, we want to show new content
  useEffect(() => {
    if (!enabled && text !== displayText) {
      setDisplayText(text);
    }
  }, [text, enabled, displayText]);

  return { displayText, isComplete };
}

// Hook for streaming message typewriter effect
export function useStreamingTypewriter(text: string, isStreaming: boolean) {
  const [displayText, setDisplayText] = useState('');
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset when text is cleared
    if (!text) {
      indexRef.current = 0;
      setDisplayText('');
      return;
    }

    // If not streaming, show full text immediately
    if (!isStreaming) {
      setDisplayText(text);
      indexRef.current = text.length;
      return;
    }

    // For streaming, we want to show new content as it arrives
    // but with a smooth reveal effect
    const animate = () => {
      if (indexRef.current < text.length) {
        // Type 2-3 characters per frame for smoothness
        const charsToType = Math.min(3, text.length - indexRef.current);
        indexRef.current += charsToType;
        setDisplayText(text.slice(0, indexRef.current));
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [text, isStreaming]);

  // When streaming ends, ensure all text is shown
  useEffect(() => {
    if (!isStreaming && text && displayText.length < text.length) {
      setDisplayText(text);
    }
  }, [isStreaming, text, displayText]);

  return displayText;
}
