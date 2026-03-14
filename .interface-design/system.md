# Codeye Design System

## Brand Identity

**Product**: Codeye — Desktop GUI for Claude Code (Electron + Web)
**Logo**: Purple blob character with expressive eyes (organic, asymmetric shape)
**Personality**: Refined, quietly playful, premium craftsmanship
**Tone**: Like a well-made instrument — every detail in its place, nothing extra

### Reference Brands
- Kiro (dev-tool elegance, structured action blocks)
- Cursor (premium dark mode, breathable layouts)
- Linear (polish, attention to detail)
- Discord (playful but never cheap)

### Anti-patterns
- Generic / corporate / sterile
- High saturation overload, "AI-bro" aesthetic
- Inconsistent icon sizes or stroke weights
- Mechanical animations
- Excessive gradients or decorative noise

---

## Font Loading (CRITICAL)

Fonts loaded via Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
```

Body-level rendering:
```css
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
letter-spacing: -0.011em;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
text-rendering: optimizeLegibility;
```

The `cv02/03/04/11` activate Inter's alternate glyphs — subtle personality without losing clarity.

---

## Icons — Lucide React (MANDATORY)

**ALL icons use Lucide React.** No hand-crafted SVGs.

Standard props:
```tsx
<IconName size={16} strokeWidth={1.8} />
```

Sizes by context:
| Context | size | strokeWidth |
|---------|------|-------------|
| Activity bar | 18 | 1.8 |
| Sidebar buttons | 13-15 | 1.8-2.0 |
| Inline (footer chips, dropdowns) | 11-13 | 2.0 |
| Tool call icons | 12-14 | 1.6 |
| Action buttons (copy, fork) | 13 | 1.8 |
| Send button | 16 | 2.2 |

Vertical centering: parent must be `display: flex; align-items: center;`

Icon mapping:
- Sidebar: `List`, `MessageSquare`, `Settings`, `Search`, `FolderPlus`, `Package`
- Session tree: `ChevronDown`, `Plus`, `X`, `Pencil`, `Trash2`
- Input: `ArrowUp` (send), `Square` (stop), `X`, `MoreHorizontal`
- Messages: `Eye`, `Copy`, `Check`, `GitFork`, `ChevronDown`
- Git menu: `GitCommitHorizontal`, `ArrowUpFromLine`, `GitPullRequest`, `ArrowRight`, `ChevronDown`
- Footer: `ChevronDown`, `Check`, `GitBranch`, `ChevronLeft`

---

## Color Palette

### Dark Theme (Default)

```css
/* Backgrounds — clear layer separation */
--bg-base:      #111113;   /* Main chat area */
--bg-primary:   #0c0c0e;   /* Sidebar, activity bar, title bar (deepest) */
--bg-secondary: #1a1a1f;   /* Cards, input composer, tool blocks */
--bg-tertiary:  #232328;   /* User bubble, pills, hover-lift */
--bg-elevated:  #1e1e23;   /* Dropdowns, floating panels */
--bg-hover:     #28282e;
--bg-active:    #303036;

/* Text */
--text-primary:   #ededef;
--text-secondary: #9a9aa0;
--text-muted:     #68686e;
--text-disabled:  #454548;

/* Accent — vibrant purple, used sparingly */
--accent:        #a855f7;
--accent-hover:  #c084fc;
--accent-muted:  rgba(168, 85, 247, 0.10);

/* Borders — slightly stronger for visible structure */
--border-strong:  #38383e;
--border-subtle:  #262629;

/* Semantic */
--success: #34d399;  --warning: #fbbf24;  --danger: #f87171;  --info: #818cf8;
```

### Color Philosophy
- **bg-primary is the darkest** — sidebar/titlebar sink into the background
- **bg-base slightly lighter** — main content area has presence
- **bg-secondary/tertiary step up clearly** — cards and interactive elements float
- Purple accent: send button, active states, avatar, inline code only

---

## Typography

```css
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

Scale: 11 / 12 / 13 / 14 / 16 / 20 / 28 / 36 / 48 px

All `<button>` elements inherit `font-family`, `font-feature-settings`, `letter-spacing`.

---

## Layout

```
TitleBar (42px) — bg-primary, border-bottom
├── [76px macOS traffic light safe area]
├── Blob logo (18px) + "Codeye" (13px/600)
└── Git Submit pill (right-aligned)

ActivityBar (48px) — bg-primary, border-right
├── List/MessageSquare (sessions)
└── Settings

Sidebar (280px, collapsible) — bg-primary, border-right
├── Search (Lucide) + FolderPlus button
├── Folder > Session tree (ChevronDown, Plus)
└── Footer (Package icon + mono path)

Main — bg-base
├── Message List (flex:1, spacer for bottom-alignment)
└── Input Area
    ├── Composer (bg-secondary, ArrowUp/Square)
    └── Footer: [Permission ˅] [GitBranch] | [Model ˅] [Ring + Cost]
```

### macOS Traffic Light
Title bar reserves `padding-left: 76px` for macOS window controls.
In Web mode this appears as left margin. In Electron mode the red/yellow/green buttons fill the space.
`-webkit-app-region: drag` on title bar, `no-drag` on content.

---

## Spacing & Radius

Base unit: 4px. Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40

Radius: xs(4) / sm(6) / md(10) / lg(14) / xl(20) / full(9999)

Scrollbar: 6px wide, `rgba(255,255,255,0.08)` thumb, transparent track.

---

## Animation

```css
--transition-fast: 120ms ease-out;
--transition-base: 200ms ease-out;
--transition-slow: 300ms cubic-bezier(0.16, 1, 0.3, 1);
```

Dropdown entrances: `180ms cubic-bezier(0.16, 1, 0.3, 1)` with `scale(0.97) + translateY(4px) → scale(1) + translateY(0)`

Hover micro-lift: icons scale(1.15), buttons translateY(-0.5px)

Context ring fill: `stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)`

Principle: Alive and organic, never mechanical. Snappy but with a soft landing.

---

## Component Patterns

### Footer Bar
```
[● Default ˅]  [GitBranch main]  |  [Sonnet · High ˅]  [◎ $0.0042]
```
- Permission selector: colored dot + label + ChevronDown, dropdown with descriptions + Check mark
- Git status: GitBranch icon + branch name + dirty dot
- Model selector: pill trigger, dropdown with Model + Thinking sections
- Stats: SVG ring (context %) + cost label, hover tooltip `2K / 200K`, click for full panel (session + day/week usage)

### Context Ring
- 22x22 SVG, radius 8, strokeWidth 2.5
- Color by usage: accent (<50%), warning (50-80%), danger (>80%)
- Fill animates with spring easing (600ms)
- Hover: scale(1.15) + tooltip slide-in

### Tool Calls
Lucide icons at 12-14px, consistent 1.6 strokeWidth. ChevronDown for expand toggles.

### Messages
- AI actions: Copy (Lucide) + GitFork (Lucide), 13px, strokeWidth 1.8
- Steps header: Eye icon (Lucide) + "STEPS TAKEN" uppercase label
- Bottom-aligned via `.message-list-spacer` (flex:1) — no scrollIntoView on ancestors

---

## Logo Usage

Blob SVG inline, sizes: TitleBar 18px, Welcome 72px, AI Avatar 32px, Thinking 28px.

Animation states: idle (floatBounce + eyeBlink), thinking (thinkingWobble + thinkingEyes + thinkingGlow), hop (logoHop on new message).
