# Edgeless Website -- Best Practices

## Design Language

### Visual Identity
- **Dark theme only**. Background: `var(--bg-base)` (#111113). Surface: `var(--bg-surface)`.
- **Accent**: Blue-violet `var(--accent)`. Used sparingly for CTAs, active states, tags.
- **Green dots**: `var(--green)` status indicators. Convey "live" / "active" / "online".
- **Borders**: `var(--border-subtle)` -- barely visible, adds structure without noise.

### Typography
- **Headings**: System sans-serif, bold, tight tracking (`tracking-[-0.04em]`).
- **Body**: Light weight, generous line-height (1.6-1.7).
- **Mono**: `font-mono` for code snippets, labels, section headers, tags, status text.
- **Section headers**: `text-sm font-mono uppercase tracking-[0.15em]` in `var(--text-tertiary)`.

### Color Hierarchy
- `var(--text-primary)`: White. Headlines, names, emphasis.
- `var(--text-secondary)`: Light gray. Body copy, descriptions.
- `var(--text-tertiary)`: Dim gray. Labels, timestamps, footer text.

### Spacing
- Max content width: 1280px, centered.
- Section padding: `px-6 py-20` (standard), `py-24` (editorial sections).
- Grid gap: `gap-4` (cards), `gap-3` (small items), `gap-8` (footer columns).

## Component Patterns

### Code Windows
Dark rounded boxes with three dots and a filename tab. Used for project showcases and infrastructure blocks.
```
border: 1px solid var(--border-subtle)
background: rgba(0,0,0,0.4)
Header: dots + filename in font-mono text-[10px]
Body: pre, text-[11px] leading-[1.7] font-mono, color: var(--green)
```

### Cards (GlowingCard)
Interactive cards with subtle glow on hover. Used for featured projects.
- Import from `@/components/ui/glowing-card`
- Always wrap content in motion.div with staggered fade-up animation

### Tags / Badges
```
px-2.5 py-1 text-[11px] font-mono rounded-md
background: var(--accent-muted)
color: var(--accent)
```

### Status Indicators
```
<span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--green)" }} />
```

### Buttons
Primary (filled):
```
h-11 px-6 text-sm font-medium rounded-full
background: var(--accent)
hover: brightness-110, scale-[1.02]
```

Text links with arrow:
```
text-sm font-medium flex items-center gap-1.5
color: var(--text-secondary) or var(--accent)
icon: ArrowRight (14px) or ArrowUpRight (12px for external)
```

## Animation Patterns

### Entry Animations (framer-motion)
All content uses staggered fade-up on scroll:
```tsx
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true, margin: "-50px" }}
transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
```

### AnimatedText
Character-by-character reveal for hero text. Import from `@/components/ui/animated-text`.
```tsx
<AnimatedText text="Tools for" delay={0.1} />
```

### DotBackground
Subtle dot grid pattern for hero section. Import from `@/components/ui/dot-background`.

## Layout Patterns

### Bento Grid (Featured Projects)
Asymmetric grid: one large card spanning 2 cols + 2 rows, two smaller cards.
```
grid-cols-1 md:grid-cols-3 gap-4 md:grid-rows-[auto_auto]
```

### Infrastructure Grid
2x2 code-block cards with green status dots.
```
grid-cols-1 md:grid-cols-2 gap-4
```

### Experiment Grid
4-column horizontal cards.
```
grid-cols-2 lg:grid-cols-4 gap-3
```

### Footer
4-column grid: Tools, Lab, Social, Legal. Bottom bar with copyright and status.

## Content Guidelines

### Voice
- Direct, specific, confident. No buzzwords.
- "Tools that work" not "revolutionary AI solutions".
- "Ships daily" not "committed to continuous delivery".
- Show the terminal output, don't describe it.

### Code Snippets
- Keep short (4-8 lines max in cards).
- Show real commands, real output (pm2 status, curl, code).
- Use `var(--green)` for all code text.

### Project Descriptions
- One sentence. What it does + one differentiator.
- Example: "Autonomous prediction market agent. ML-driven position sizing, live on Polymarket 24/7."

## File Structure

```
src/
  app/
    page.tsx          -- Landing page
    layout.tsx        -- Root layout, fonts, CSS vars
    globals.css       -- CSS custom properties, base styles
  components/
    ui/
      animated-text.tsx
      glowing-card.tsx
      dot-background.tsx
```

## Adding New Sections

1. Follow the section pattern: `<section className="px-6 py-20">`
2. Max width container: `<div className="max-w-[1280px] mx-auto">`
3. Section header: `text-sm font-mono uppercase tracking-[0.15em]` in `var(--text-tertiary)`
4. Content with staggered motion animations
5. Use existing CSS variables -- do not introduce new colors

## Do NOT

- Add light mode or theme switching
- Use emojis in UI text
- Use em dashes anywhere (use -- instead)
- Add external font CDN links (fonts are in layout.tsx)
- Create new color variables without design review
- Add loading spinners or skeleton screens (content renders server-side)
- Use absolute pixel font sizes above 14px body text (use clamp for headings)
