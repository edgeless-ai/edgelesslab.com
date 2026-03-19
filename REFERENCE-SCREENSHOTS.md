# Edgeless Lab - Design Reference Screenshots

**Captured**: 2026-03-13
**Location**: `/edgeless-website/references/`
**Purpose**: Best-in-class design references for Edgeless Lab website rebuild

---

## Sites Captured

### 1. Basement Studio (basement.studio)

**Files**: `01-basement-studio-hero.png`, `01-basement-studio-full.png`

**Key Design Observations**:
- **Layout**: Full-bleed immersive 3D WebGL hero (wireframe architectural scene), then shifts to bold typography sections below
- **Typography**: Massive display font (condensed sans-serif), white on black. Headlines span full width. Body copy in lighter weight gray
- **Color**: Strict black/white palette with orange as the sole accent color (nav active state, links). No gradients in text sections
- **Components**: Logo grid ("Trusted by Visionaries") with 20+ client logos in bordered cells. Project cards use large imagery with text overlay. Capabilities section uses 4-column grid
- **Animation Hints**: 3D interactive scene responds to mouse movement. Scroll-triggered content reveals. Text likely uses staggered entrance animations
- **What translates to Edgeless**: The bold typography hierarchy, orange accent color system, dark mode authority, logo grid pattern, and the confidence of letting large statements breathe

---

### 2. Linear (linear.app)

**Files**: `02-linear-hero.png`, `02-linear-full.png`

**Key Design Observations**:
- **Layout**: Centered hero headline with product UI screenshot embedded below. Alternating left-right feature sections with generous whitespace. Content-rich but never crowded
- **Typography**: Clean sans-serif (Inter or custom). Hero headline is large but not overwhelming. Sub-headline in muted gray. Section titles are medium-weight
- **Color**: Dark theme with subtle gradients. Background uses very dark gray (not pure black). Yellow-green accent for highlights and badges. Muted blue-gray for secondary UI elements
- **Components**: Floating product UI cards showing real app features. Integration logo bar. Changelog section with timeline. Testimonial cards with quote marks. CTA banner at bottom
- **Animation Hints**: Product UI screenshots likely animate on scroll. Subtle gradient backgrounds shift. Feature sections reveal with parallax
- **What translates to Edgeless**: The product-led storytelling approach, showing real UI to build credibility. The dark theme execution with careful contrast ratios. The feature section alternating pattern

---

### 3. Daylight Computer (daylightcomputer.com)

**Files**: `03-daylight-computer-hero.png`, `03-daylight-computer-full.png`

**Key Design Observations**:
- **Layout**: Organic, editorial-feeling hero with product photography at center. Overlapping card elements (newsletter signup, product info). Warm, natural feel
- **Typography**: Serif or editorial serif for headlines, creating a warm/human contrast to typical tech sites. Clean sans for body copy
- **Color**: Warm cream/beige background, amber/golden accents (matching their hardware aesthetic). Dark sections at footer. No cold blues or grays
- **Components**: Newsletter signup card overlaying hero image. Product image with subtle shadow. Navigation uses pill-shaped active state. Testimonial section at bottom
- **Animation Hints**: Product image likely has subtle floating or parallax. Cards appear to layer naturally. Page has a calm, unhurried scroll feel
- **What translates to Edgeless**: The warm color palette approach (alternative to pure dark mode). Editorial typography choices. The way product photography drives the narrative. Card layering technique

---

### 4. Vercel (vercel.com)

**Files**: `04-vercel-hero.png`, `04-vercel-full.png`

**Key Design Observations**:
- **Layout**: Clean centered hero with headline, sub-headline, and dual CTA buttons. Generative art/abstract graphic below. Then grid-based feature sections. Very structured
- **Typography**: System-feeling sans-serif (Geist). Strong headline hierarchy. Monospace for code snippets and technical content. Clean, precise type scale
- **Color**: Light theme with white background. Black primary text. Subtle pastel gradients (mint, coral, amber) in the hero graphic. Minimal color usage in content sections. Pill-shaped colored badges for categories
- **Components**: Dual CTA buttons (filled primary, outlined secondary). Social proof bar with brand names and stats. Feature grid cards. Code snippet blocks. AI model leaderboard table. Template gallery cards. Mega footer with 6 columns
- **Animation Hints**: Hero graphic uses generative/procedural animation (triangle with radiating lines). Gradient shifts. Stats counters likely animate
- **What translates to Edgeless**: The clean information hierarchy. Dual CTA pattern. The way they mix technical content (code, APIs) with approachable design. Template gallery pattern. The precision of their spacing system

---

### 5. Raycast (raycast.com)

**Files**: `05-raycast-hero.png`, `05-raycast-full.png`

**Key Design Observations**:
- **Layout**: Centered hero with massive headline, generous vertical spacing. Product demos below fold. Feature showcase alternates between full-width and grid layouts
- **Typography**: Bold, high-contrast sans-serif for hero headline. Very large type scale. Clean hierarchy from H1 through body. Monospace for technical elements
- **Color**: Dark theme (near-black background). White text. Subtle color accents for different feature areas (blue glow, red accents, green highlights). UI elements have subtle glass/frosted borders
- **Components**: Floating nav bar with subtle border and backdrop blur. Download CTA buttons (Mac + Windows). Product screenshot cards with rounded corners and subtle shadows. 3D rendered objects (cube, keyboard). Extension/plugin marketplace grid. Video embeds. Team testimonials
- **Animation Hints**: 3D objects rotate on scroll. Product screenshots have parallax depth. Nav bar likely has scroll-triggered background blur. Feature sections use staggered entrance
- **What translates to Edgeless**: The dark theme with selective color highlights. The floating nav pattern with glass effect. The way they showcase product features with real UI. The 3D element integration. Download CTA pattern. The generous whitespace that lets content breathe

---

## Cross-Site Pattern Analysis

### Shared Patterns Worth Adopting

| Pattern | Used By | Priority for Edgeless |
|---------|---------|----------------------|
| Dark theme as default | Basement, Linear, Raycast | High - matches "lab" aesthetic |
| Centered hero with large headline | All 5 sites | High - proven conversion |
| Social proof / logo bar | Basement, Vercel | High - builds trust |
| Product UI screenshots in hero | Linear | High - shows, not tells |
| Floating/glass nav bar | Raycast | Medium - modern feel |
| Dual CTA buttons | Vercel, Raycast | Medium - download + learn more |
| Alternating feature sections | Linear, Vercel | Medium - storytelling flow |
| 3D/WebGL elements | Basement, Raycast | Low - impressive but heavy |
| Warm editorial palette | Daylight | Low - alternative direction |
| Template/resource gallery | Vercel | Medium - product showcase |

### Typography Approaches

| Site | Headline Style | Body Style | Personality |
|------|---------------|------------|-------------|
| Basement | Massive condensed sans | Light sans | Bold, aggressive |
| Linear | Clean geometric sans | System sans | Professional, precise |
| Daylight | Editorial serif | Clean sans | Warm, human |
| Vercel | Geist sans | Geist mono for code | Technical, clean |
| Raycast | Heavy sans-serif | Medium sans | Confident, direct |

### Color Strategy Comparison

| Site | Background | Primary Text | Accent | Vibe |
|------|-----------|-------------|--------|------|
| Basement | Pure black (#000) | White | Orange | Dark authority |
| Linear | Near-black (#111) | White/gray | Yellow-green | Dark sophistication |
| Daylight | Warm cream | Dark brown | Amber/gold | Warm editorial |
| Vercel | White (#fff) | Black | Pastel gradients | Clean technical |
| Raycast | Near-black (#0a0a0a) | White | Multi-color accents | Dark premium |

---

## Recommended Direction for Edgeless Lab

Based on analysis of all 5 references:

1. **Theme**: Dark mode primary (like Raycast/Linear), with enough contrast to feel premium, not gloomy
2. **Hero**: Centered headline + sub-headline + dual CTA. Show the Prompt Engineering OS product UI below
3. **Typography**: Bold sans-serif headlines (similar to Raycast's confidence). Clean sans body. Monospace for code/technical elements
4. **Color**: Near-black background, white text, with a signature accent color (consider coral from the Edgeless design system, or electric blue for "lab" feel)
5. **Nav**: Floating glass-effect nav bar (Raycast pattern)
6. **Social proof**: Logo/brand bar showing where the OS has been adopted
7. **Features**: Alternating sections showing product capabilities with real screenshots
8. **CTA**: Dual button pattern, "Get the OS" (primary) + "See Examples" (secondary)
9. **Footer**: Clean multi-column (Vercel pattern)

---

## Screenshot-to-Code Integration

- Tool running at: `http://localhost:5173`
- Best candidates for code generation:
  - `04-vercel-hero.png` - cleanest layout for component extraction
  - `05-raycast-hero.png` - dark theme hero pattern
  - `02-linear-hero.png` - product-led hero layout

Upload screenshots to generate initial component code, then customize for Edgeless branding.
