# Codeye Design System

## Brand Identity

**Product**: Codeye — Desktop GUI for Claude Code
**Logo**: Purple blob character with expressive eyes (organic, asymmetric shape)
**Personality**: Fun, playful, quirky yet elegant and premium
**Tone**: Approachable & lighthearted, never corporate or sterile

### Reference Brands
- Discord (playful community energy)
- Kiro (dev-tool elegance, large radius)
- Linear (polish, attention to detail)

### Anti-patterns
- Boring/generic corporate UI
- Overly serious or sterile
- Cheap feeling, harsh colors
- Stiff/mechanical animations
- High saturation overload, "AI-bro" aesthetic

## Logo Usage

The blob character SVG (inline):
```svg
<svg viewBox="0 0 120 120" fill="none">
  <path d="M52 8C30 10, 10 30, 12 58C14 86, 34 110, 62 110C90 110, 112 86, 110 56C108 28, 88 6, 66 6C60 6, 56 7, 52 8Z" fill="var(--accent)"/>
  <ellipse cx="48" cy="62" rx="9" ry="12" fill="white"/>
  <ellipse cx="72" cy="62" rx="9" ry="12" fill="white"/>
  <ellipse cx="50" cy="65" rx="5" ry="7" fill="#1a1625"/>
  <ellipse cx="74" cy="65" rx="5" ry="7" fill="#1a1625"/>
  <circle cx="30" cy="78" r="3" fill="rgba(30,22,37,0.15)"/>
</svg>
```

Sizes:
- TitleBar: 24x24
- Welcome Screen: 72x72 (with floatBounce animation + drop-shadow)
- AI Avatar: 32x32 (no circular background, blob shape is the avatar)
- Favicon: PNG at /public/logo.png

## Color Palette

### Light Theme (Current)

```css
/* Backgrounds (5 levels, purple-tinted light) */
--bg-base:      #ffffff;
--bg-primary:   #faf9fe;
--bg-secondary: #f3f1fa;
--bg-tertiary:  #ebe8f5;
--bg-elevated:  #ffffff;   /* with shadow for elevation */
--bg-hover:     #f0edfa;
--bg-active:    #e8e4f4;
--bg-accent:    rgba(124, 58, 237, 0.06);

/* Text (4 levels) */
--text-primary:   #1a1625;   /* dark purple-black */
--text-secondary: #57527a;
--text-muted:     #8b85a3;
--text-disabled:  #b5b0c8;

/* Accent (matches logo purple) */
--accent:        #7C3AED;
--accent-hover:  #6D28D9;
--accent-active: #5B21B6;
--accent-muted:  rgba(124, 58, 237, 0.10);
--accent-glow:   rgba(124, 58, 237, 0.15);

/* Borders */
--border-strong:  #d4d0e0;
--border-subtle:  #e8e5f0;
--border-accent:  rgba(124, 58, 237, 0.3);

/* Semantic */
--success:  #16a34a;
--warning:  #d97706;
--danger:   #dc2626;
--info:     #4f46e5;
```

### Color Decisions
- **Why white background**: Airy, sunny feel — the blob character pops against white
- **Why purple-tinted grays**: Cohesion with brand color, avoids cold/sterile feel
- **Why dark code blocks**: Developers expect dark code; creates a dramatic contrast island
- **User bubbles**: Solid purple with white text — bold, unmistakable "this is you"
- **Shadows**: Subtle purple tint in shadows ties everything to the brand

## Typography

```css
--font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
```

Scale: 11px / 12px / 13px / 14px / 16px / 20px / 28px / 36px / 48px

## Spacing

Base unit: 4px
Scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40

## Radius

Kiro-inspired large radius:
- xs: 4px (inline code, small tags)
- sm: 8px (buttons, inputs, cards)
- md: 12px (panels, dropdowns)
- lg: 16px (input container, hint cards)
- xl: 24px (user bubble)
- 2xl: 32px (emphasis elements)
- full: 9999px (pills, avatars, mode switcher)

## Depth & Elevation

Light theme uses shadow-based elevation (not background darkness):
```css
--shadow-sm:   0 1px 3px rgba(124, 58, 237, 0.04), 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md:   0 4px 12px rgba(124, 58, 237, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-lg:   0 8px 24px rgba(124, 58, 237, 0.08), 0 4px 8px rgba(0, 0, 0, 0.04);
```

Elevation hierarchy:
1. **Flat**: bg-secondary/tertiary (sidebar, settings cards)
2. **Raised**: bg-base + shadow-sm (hint cards, tool calls)
3. **Floating**: bg-base + shadow-md (input composer, dropdowns)
4. **Modal**: bg-base + shadow-lg (slash palette, overlays)

## Animation

```css
--transition-fast: 120ms ease-out;   /* micro-interactions */
--transition-base: 200ms ease-out;   /* standard transitions */
--transition-slow: 300ms ease-out;   /* entrance animations */
```

Keyframes:
- `floatBounce` — welcome logo gentle float (3s infinite)
- `fadeIn` — content entrance
- `slideUp` — messages entering from bottom
- `pulse` — streaming status dot
- `pulseGlow` — stop button urgency
- `blink` — streaming cursor

Principle: Animations should feel **alive and organic** (matching the blob character), never mechanical.

## Component Patterns

### Surface Cards
- Background: bg-base or bg-secondary
- Border: 1px solid border-subtle
- Radius: radius-md to radius-lg
- Shadow: shadow-sm (raised) or none (flat)

### Interactive Elements
- Hover: translateY(-1px) or (-2px) + shadow increase
- Focus: 2px outline accent + 3px accent-glow ring
- Active: accent-muted background + accent left-border indicator

### Tool Calls (Discord embed style)
- Left border 4px color-coded by type (info/success/warning/purple)
- Collapsible with chevron
- Detail section uses bg-secondary

### Code Blocks (Dark Island)
- Background: #1e1b2e (dark purple)
- Header: #16132a
- Text: #e2e0f0
- Language badge: purple tint

## Layout

```
TitleBar (52px) — bg-base, border-bottom
├── Logo blob (24px) + "Codeye" text
├── Breadcrumb (path segments)
└── Mode Switcher (pill: Chat/Code/Plan)

ActivityBar (48px) — bg-primary, border-right
├── Sessions button
└── Settings button

Sidebar (280px, collapsible) — bg-primary, border-right
├── Search + New Session button
├── Session list (grouped by date)
└── Footer (current path)

Main — bg-base
├── Welcome Screen (centered, blob logo + title + hints grid)
│   or Message List (800px max-width)
└── Input Area (floating composer, shadow-md)
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
