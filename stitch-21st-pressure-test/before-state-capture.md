# Edgeless Site - Before-State Capture (EDGA-134)

Date: 2026-04-17
Task: Stitch + 21st.dev Pressure Test

## Current Homepage Sections

### 1. HeroSection (Lines 23-186, home-client.tsx)
**Current Implementation:**
- Layout: CSS Grid (1.25fr 1fr), min-height 92svh/100vh
- Left column: Animated headline + KineticPreText subtitle + CTAs
- Right column: Terminal-style "live system panel" (pm2 status mock)
- Background: DotBackground component (animated dot grid)
- Badge: "Shipping daily · Live now" with pulsing green indicator

**Animation Stack:**
- AnimatedText (character-by-character reveal, delay staggered)
- AnimatedFadeIn (wrapper for sequential reveals)
- KineticPreText (interactive mouse-following text with canvas)
- DotBackground (CSS animated background pattern)

**Visual Language:**
- Dark theme with emerald accent (#10b981)
- Terminal aesthetic in right panel
- Clean typography with tight tracking

---

### 2. RecentActivity Section (Line 188+)
**Current Implementation:**
- Simon Willison-style chronological stream
- Blog posts from `posts` array
- Relative time formatting (today/yesterday/Xd ago)
- Links to full blog feed

---

### 3. Featured Projects (FeaturedGrid)
**Current Implementation:**
- 3 featured projects (pamela, mcp-servers, pen-plotter-art)
- Pamela spans 2x2 grid cells (featured)
- Hover effects, tag chips, snippet text
- "Featured" header with "All projects" link

---

### 4. Capabilities/Infrastructure (CapabilitiesGrid)
**Current Implementation:**
- 4 capability cards with monospace code snippets
- Multi-Agent Orchestration, MCP Tool Servers, Autonomous Trading, Knowledge Pipelines
- GlowingCard wrapper (custom glow effect on hover)
- Dark surface background section

---

### 5. Stack Section (StackFlow)
**Current Implementation:**
- Animated horizontal flow of stack nodes
- 5 nodes: Claude Code, MCP Servers, ChromaDB, Obsidian, VPS/Hermes
- Animated connector lines and node reveals
- Green accent for data nodes, main accent for agent layer

---

### 6. Lab/Experiments Grid
**Current Implementation:**
- 4 experiments: strange-attractors, knowledge-graph, total-serialism, tartanism
- Category tags, stack pills, status indicators
- External link handling for some

---

### 7. Products Section (ProductHighlight)
**Current Implementation:**
- Shrink-wrap animation on scroll
- Uses `useShrinkWrap` hook for scroll-driven scale
- Featured products from products array

---

### 8. About Blurb
**Current Implementation:**
- Text-heavy about section
- ScrollReveal wrapper

---

### 9. Subscribe Section
**Current Implementation:**
- Newsletter signup form
- Border styling consistent with site

---

## Section Hypotheses to Test

### Hypothesis A: Hero Section
**Current friction:** KineticPreText uses canvas and mouse tracking - may be performance heavy on mobile. Terminal panel is static (mock data). Layout is solid but could use more visual impact.

**Test options:**
1. **Stitch alternative:** Generate hero with integrated 3D/visual element or split layout variation
2. **21st.dev alternative:** Animated Hero (824 saves) or Spline Scene (942 saves) for 3D background
3. **Hybrid:** Keep terminal panel, add Glowing Effect border (1,000+ saves) to elevate it

---

### Hypothesis B: Capabilities Grid (Infrastructure)
**Current friction:** Cards are functional but lack visual punch. Code snippets are nice but could be more integrated.

**Test options:**
1. **21st.dev:** Bento Grid (815 saves) for asymmetric layout
2. **21st.dev:** Display Cards (872 saves) for feature showcase
3. **21st.dev:** Glowing Effect (1,000+ saves) for card borders
4. **Stitch:** Generate alternative layout with integrated icons/graphics

---

### Hypothesis C: Stack Section
**Current friction:** Custom animation code - could be replaced with community-vetted component.

**Test options:**
1. **21st.dev:** Timeline (864 saves) for vertical step-through
2. **21st.dev:** Container Scroll Animation (835 saves) for scroll-driven reveal
3. **Stitch:** Generate node-graph or network visualization

---

## Dependency Budget

**Current animation deps:**
- framer-motion (already used)
- Custom canvas-based KineticPreText

**21st.dev typical deps:**
- framer-motion (~140kb) - already have
- tailwind-merge, clsx - lightweight
- lucide-react - already using

**Heavy deps to avoid:**
- three.js, @react-three/fiber (~600kb)
- @splinetool/react-spline (~1MB+)

---

## Success Criteria
- [ ] At least 1 section has Stitch-generated alternative mock
- [ ] At least 1 section has 21st.dev component integrated
- [ ] Bundle impact documented
- [ ] Mobile performance checked
