# Codeye Design System

## Brand Identity

**Product**: Codeye — Desktop GUI for Claude Code
**Logo**: Purple blob character with expressive eyes (organic, asymmetric shape)
**Personality**: Fun, playful, quirky yet elegant and premium
**Tone**: Approachable & lighthearted, never corporate or sterile

### Reference Brands
- Kiro (dev-tool elegance, structured action blocks)
- Cursor (premium dark mode, breathable layouts)
- Linear (polish, attention to detail)
- Discord (playful community energy)

### Anti-patterns
- Boring/generic corporate UI
- Overly serious or sterile
- Cheap feeling, harsh colors
- Stiff/mechanical animations
- High saturation overload, "AI-bro" aesthetic
- Unnecessary gradients or decorative noise

## Logo Usage

The blob character SVG (inline) with animated eyes:
```svg
<svg viewBox="0 0 120 120" fill="none">
  <g class="codeye-body">
    <path d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z" fill="var(--accent)"/>
    <ellipse cx="48" cy="62" rx="9" ry="12" fill="white"/>
    <ellipse cx="72" cy="62" rx="9" ry="12" fill="white"/>
    <ellipse class="codeye-pupil" cx="50" cy="65" rx="5" ry="7" fill="#0d0b11"/>
    <ellipse class="codeye-pupil" cx="74" cy="65" rx="5" ry="7" fill="#0d0b11"/>
    <circle cx="30" cy="78" r="3" fill="rgba(168, 85, 247, 0.2)"/>
    <circle cx="90" cy="78" r="3" fill="rgba(168, 85, 247, 0.2)"/>
  </g>
</svg>
```

Sizes:
- TitleBar: 24x24
- Welcome Screen: 72x72 (with floatBounce animation + drop-shadow)
- AI Thinking: 28x28 (thinkingWobble + thinkingEyes animations)
- AI Avatar: 32x32 (no circular background, blob shape is the avatar)
- Favicon: PNG at /public/logo.png

### Logo Animation States
- **idle**: `floatBounce` 4s + `eyeBlink` 4s (welcome screen)
- **thinking**: `thinkingWobble` 2.5s body + `thinkingEyes` 1.8s pupils + `thinkingGlow` 2s filter (AI processing)
- **hop**: `logoHop` 0.6s squash-and-stretch (new message arrival)

## Color Palette

### Dark Theme (Default)

```css
/* Backgrounds (deep, neutral dark — minimal tint) */
--bg-base:      #0e0e10;
--bg-primary:   #141416;
--bg-secondary: #1a1a1e;
--bg-tertiary:  #222226;
--bg-elevated:  #18181c;
--bg-hover:     #252528;
--bg-active:    #2c2c30;
--bg-accent:    rgba(168, 85, 247, 0.06);

/* Text (high legibility off-white) */
--text-primary:   #ededef;
--text-secondary: #9a9aa0;
--text-muted:     #68686e;
--text-disabled:  #454548;

/* Accent (vibrant purple — used sparingly) */
--accent:        #a855f7;
--accent-hover:  #c084fc;
--accent-active: #d8b4fe;
--accent-muted:  rgba(168, 85, 247, 0.10);
--accent-glow:   rgba(168, 85, 247, 0.18);

/* Borders */
--border-strong:  #333336;
--border-subtle:  #232326;
--border-accent:  rgba(168, 85, 247, 0.25);

/* Semantic */
--success:  #34d399;
--warning:  #fbbf24;
--danger:   #f87171;
--info:     #818cf8;
```

### Light Theme

```css
--bg-base:      #ffffff;
--bg-primary:   #fafafa;
--bg-secondary: #f3f3f5;
--bg-tertiary:  #eaeaee;
--accent:       #9333ea;
```

### Color Philosophy
- **Dark default**: Deep, premium dark greys (#0e0e10 to #1a1a1e) — neutral, not purple-tinted
- **Purple sparingly**: Accent only on avatar, active states, send button, links, inline code
- **Chat area is neutral**: AI text uses off-white `--text-primary`, no purple in message body
- **User bubbles**: Subtle `--bg-tertiary` + `--border-subtle`, not bold accent color
- **Semantic colors**: Green for success, amber for warnings/filepaths, red for errors

## Typography

```css
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

Scale: 11px / 12px / 13px / 14px / 16px / 20px / 28px / 36px / 48px

### Monospace Usage
- File paths: monospace + amber color + pill background
- Code snippets: monospace in dark code blocks
- Tool patterns: monospace + muted + pill background
- Inline code: monospace + subtle background + border

## Spacing

Base unit: 4px
Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40

## Radius

Clean, modern:
- xs: 4px (inline code, small tags, pills)
- sm: 6px (buttons, inputs, action blocks, tool cards)
- md: 10px (panels, dropdowns, input composer)
- lg: 14px (hint cards, user bubble)
- xl: 20px (emphasis elements)
- 2xl: 28px
- full: 9999px (pills, avatars, status dots)

## Depth & Elevation

Dark theme uses subtle borders for separation, not shadows:
```css
--shadow-sm:   0 1px 2px rgba(0, 0, 0, 0.5);
--shadow-md:   0 4px 12px rgba(0, 0, 0, 0.5);
--shadow-lg:   0 8px 24px rgba(0, 0, 0, 0.6);
--shadow-glow: 0 0 16px rgba(168, 85, 247, 0.15);
```

Elevation hierarchy:
1. **Flat**: bg-secondary (sidebar, settings cards, action blocks)
2. **Subtle**: bg-secondary + 1px border-subtle (tool call cards, bash output)
3. **Floating**: bg-elevated + border-subtle + shadow-md (dropdowns)
4. **Modal**: bg-elevated + border-subtle + shadow-lg (overlays)

## Animation

```css
--transition-fast: 120ms ease-out;
--transition-base: 200ms ease-out;
--transition-slow: 300ms cubic-bezier(0.16, 1, 0.3, 1);
```

### Logo-specific Keyframes
- `floatBounce` — welcome logo gentle float with subtle rotation (4s infinite)
- `eyeBlink` — pupils squash to 5% height then back (4s infinite)
- `thinkingWobble` — body rotates ±3° with micro scale changes (2.5s infinite)
- `thinkingEyes` — pupils translate left/right/diagonal (1.8s infinite)
- `thinkingGlow` — purple glow pulse via filter drop-shadow (2s infinite)
- `logoHop` — squash-and-stretch jump (0.6s once)
- `cursorPulse` — streaming cursor fade with glow (1.2s infinite)

### General Keyframes
- `fadeIn` — content entrance
- `slideUp` — messages entering from bottom
- `pulse` — status dots, streaming indicators
- `pulseGlow` — stop button urgency
- `shelfRise` — content shelf entrance
- `sessionSlideIn` — session item entrance

Principle: Animations should feel **alive and organic** (matching the blob character), never mechanical.

## Component Patterns

### Tool Calls (Kiro-style Action Cards)
- **Card**: `background: rgba(255,255,255,0.025)`, `border: 1px solid var(--border-subtle)`, `border-radius: var(--radius-sm)`
- **Status icon**: 22px soft circle with Lucide icon (13px). ONE accent for success:
  - Done: `background: rgba(52,211,153,0.10)`, `border: rgba(52,211,153,0.18)`, `color: var(--success)`
  - Running: neutral gray circle, Loader2 spinner
  - Error: `rgba(248,113,113,0.10)` red tint
- **Label**: 12px medium-weight, `var(--text-primary)` — "Read file", "Edit", "Command", "Search"
- **File pills**: `font-mono`, `var(--text-secondary)`, `bg-tertiary + 1px border-subtle`, `radius-xs`
- **Read group**: consecutive Reads merge into one card "Read files" + multiple pills
- **Bash/Command**: label row + embedded `border-top` sections for command + output
- **Edit**: diff shown inline on toggle
- **Glob/Grep**: pattern pill + count, clickable to expand results
- **Principle**: One green accent for all success states. No rainbow. Cards give structure; color is a signal, not decoration.

### Code Blocks (Dark Island)
- Background: deep dark (#0f0e14)
- Header: slightly lighter with language badge
- Text: off-white (#e2e0f0)

### User Bubble
- Background: `--bg-tertiary` (subtle, not accent)
- Border: 1px solid `--border-subtle`
- Radius: lg lg xs lg
- Text: `--text-primary`

### Input Composer
- Background: `--bg-secondary`
- Border: 1px solid `--border-subtle`
- Focus: `--border-accent` + 2px `--accent-muted` ring
- Radius: md
- No heavy shadow in dark mode

### Hint Cards
- Background: `--bg-secondary`
- Border: 1px solid `--border-subtle`
- Hover: bg-hover + border-strong + translateY(-1px)
- No shadow in dark mode (use border for definition)

## Layout

```
TitleBar (52px) — bg-base, border-bottom
├── Logo blob (24px) + "Codeye" text
├── Breadcrumb (path segments)
└── Mode/Git chips (bg-secondary pills)

ActivityBar (48px) — bg-primary, border-right
├── Sessions button
└── Settings button

Sidebar (280px, collapsible) — bg-primary, border-right
├── Search + Add Folder button
├── Session tree (folder > sessions)
└── Footer (mono path)

Main — bg-base
├── Welcome Screen (centered, blob logo + title + hints grid)
│   or Message List (800px max-width, generous gap)
└── Input Area (composer, bg-secondary)
    ├── Textarea + Send/Stop button
    ├── Slash Command Palette (above, shadow-lg)
    └── Footer (status dot + model selector + token counts + cost)
```

## Responsive

Breakpoint: 768px

Mobile (< 768px):
- ActivityBar + Sidebar hidden
- TitleBar simplified (no breadcrumb)
- Welcome hints: single column
- Message width: 100% (no max-width)
- User bubble: 85% max-width

## Sidebar Session Tree

Flat tree structure, no cards.

### Principles
- **No cards**: no borders, shadows, gradients, or hover-lift on folder sections
- **Tree hierarchy**: chevron + folder name as section headers, sessions indented below
- **Progressive disclosure**: folder `+` button and session delete only appear on hover
- **Zero layout shift**: session actions use absolute overlay, time fades out on hover

### Dark Theme
- Uses same CSS vars — no separate overrides needed
- Sidebar search uses `--bg-tertiary` in dark mode
