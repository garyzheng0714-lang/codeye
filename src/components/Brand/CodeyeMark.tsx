interface CodeyeMarkProps {
  className?: string;
  size?: number;
}

export default function CodeyeMark({ className, size = 72 }: CodeyeMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
    >
      <path
        d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z"
        fill="var(--accent)"
      />
      <ellipse cx="48" cy="62" rx="9" ry="12" fill="white" />
      <ellipse cx="72" cy="62" rx="9" ry="12" fill="white" />
      <ellipse cx="50" cy="65" rx="5" ry="7" fill="var(--text-primary)" />
      <ellipse cx="74" cy="65" rx="5" ry="7" fill="var(--text-primary)" />
      <circle cx="30" cy="78" r="3" fill="rgba(30,22,37,0.15)" />
    </svg>
  );
}
