interface CodeyeMarkProps {
  className?: string;
  size?: number;
  animate?: 'idle' | 'thinking' | 'hop';
}

export default function CodeyeMark({ className, size = 72, animate = 'idle' }: CodeyeMarkProps) {
  const bodyClass = animate === 'thinking' ? 'codeye-body thinking' : animate === 'hop' ? 'codeye-body hop' : 'codeye-body';
  const pupilClass = animate === 'thinking' ? 'codeye-pupil thinking' : 'codeye-pupil blinking';
  const glowClass = animate === 'thinking' ? 'codeye-glow thinking' : '';

  return (
    <svg
      aria-hidden="true"
      className={`${className ?? ''} ${glowClass}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
    >
      <g className={bodyClass}>
        <path
          d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z"
          fill="var(--accent)"
        />
        {/* White of eyes */}
        <ellipse cx="48" cy="62" rx="9" ry="12" fill="white" />
        <ellipse cx="72" cy="62" rx="9" ry="12" fill="white" />
        {/* Pupils — animated separately */}
        <ellipse className={pupilClass} cx="50" cy="65" rx="5" ry="7" fill="#0d0b11" />
        <ellipse className={pupilClass} cx="74" cy="65" rx="5" ry="7" fill="#0d0b11" />
        {/* Cheek blush */}
        <circle cx="30" cy="78" r="3" fill="rgba(139, 92, 246, 0.2)" />
        <circle cx="90" cy="78" r="3" fill="rgba(139, 92, 246, 0.2)" />
      </g>
    </svg>
  );
}
