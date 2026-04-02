# Design Research Brief: Tech Lab/Studio Websites for Edgeless

## 1. Synthesis: 5 Universal Patterns of the "Gold Standard"
Analysis of Stripe, Linear, Vercel, Raycast, and Arc reveals five core patterns that define the modern high-end tech aesthetic:

1.  **Typography as Brand Identity**: Headlines are not just text; they are design elements. Massive scale, tight letter-spacing (tracking), and high weight contrast (Bold vs. Muted) create an immediate "pro" feel.
2.  **The "Bento" Information Architecture**: Features are grouped into rounded rectangular containers (Bento boxes) with 1px borders. This allows for high information density without visual clutter.
3.  **Functional Micro-Interactions**: Motion is rarely decorative. It is used to simulate the product experience (keyboard shortcuts in Raycast, deployment flows in Vercel, payment logic in Stripe).
4.  **Dual-Track CTA**: A high-contrast primary action (e.g., "Start Building") paired with a secondary ghost button (e.g., "Documentation" or "Talk to us") to capture both hot and cold leads.
5.  **Precision Borders & Glassmorphism**: Even in light mode, the use of `backdrop-filter: blur()` and subtle 1px borders with varying opacity creates depth and a "layered" physical feel.

---

## 2. Per-Site Analysis

### Stripe (stripe.com)
*   **Analysis**: The pioneer of "scroll-driven narrative." Stripe uses complex, multi-layered mesh gradients and SVG masking to tell a technical story visually. Its "Stripe Sans" typography is legible yet authoritative.
*   **Key Takeaway**: The "Global Scale" layout. Using fluid, full-width sections that transition between technical diagrams and large-scale metrics builds immense credibility for "infrastructure" products.

### Linear (linear.app)
*   **Analysis**: The benchmark for "Technical Elegance." Linear perfected the dark-themed Bento grid. Spacing is mathematically precise. It uses subtle "spotlight" hover effects and high-contrast labels to guide the eye.
*   **Key Takeaway**: The "Product-First" Hero. Placing a high-fidelity screenshot/video of the actual tool immediately below the headline removes all abstraction and builds instant trust.

### Vercel (vercel.com)
*   **Analysis**: Vercel bridges the gap between marketing and documentation. It uses "Geist" (a custom typeface designed for legibility) and mixes marketing copy with real code snippets and terminal-style UI blocks.
*   **Key Takeaway**: The "Modular Code Block." Presenting capabilities through code-centric components reinforces that the product is built for developers by developers.

### Raycast (raycast.com)
*   **Analysis**: Highly focused on speed and efficiency. The site feels like a keyboard-driven application. It uses "snappy" easing for all animations and reinforces its identity through monospace font elements and keyboard shortcut visuals.
*   **Key Takeaway**: The "Interaction Preview." Showing the tool in action through simulated keypresses and rapid UI transitions conveys "high-performance" better than any copy.

### Arc (arc.net)
*   **Analysis**: Breaks the "Rigid Tech" mold with organic shapes and "Elastic" motion. While still technical, it feels "human" and playful. It uses soft gradients and conversational copy to stand out from the "Vercel-core" crowd.
*   **Key Takeaway**: The "Vibe-Led" approach. Using large, soft-focus imagery and a less-rigid grid can make a tool feel like a personal companion rather than a cold enterprise utility.

---

## 3. Specific Recommendations for Edgeless "Mint Lab"

### Hero Section Approach: "The Technical Statement"
*   **Pattern**: Stripe's narrative flow + Vercel's clean typography.
*   **Execution**: Centered massive **Inter** headline on a neutral `#F0F2F4` base. Use a subtle, large-scale radial gradient in the background using the Mint accent (`#0D9668` at 5% opacity).
*   **CTA**: Primary button in Mint (`#0D9668`), Secondary ghost button in Blue (`#2563EB`).

### Featured Projects Grid: "The Lab Bento"
*   **Pattern**: Linear's Bento grid adapted for light mode.
*   **Execution**: Use white containers with a subtle 1px border (`#E5E7EB`). On hover, the border should transition to the Mint accent. Group related "AI/Claude Code" tools into these boxes with small, high-contrast labels.

### Capabilities Strip: "The Technical Foundation"
*   **Pattern**: Vercel's modular blocks.
*   **Execution**: A clean, full-width strip with a slightly darker neutral background. Use Monospace snippets to show CLI commands or API examples, reinforcing the "Lab" and "Technical" vibe.

### Lab Experiments Preview: "The Live Demo"
*   **Pattern**: Raycast's vertical interaction flow.
*   **Execution**: A series of vertical sections where scrolling triggers a "Live Terminal" or "Prompt Preview" animation. Keep the motion "snappy" and precise—no "Arc-style" bounce.

### Footer: "The Infrastructure Map"
*   **Pattern**: Vercel's multi-column structured footer.
*   **Execution**: 4-5 columns of links (Tools, Lab, Social, Legal). Include a "Lab Status" indicator (green dot) to reinforce the active, experimental nature of the studio.

---

## 4. Typography Recommendation
*   **Heading**: **Inter** (Weight: 600 or 700). 
    *   *Pro Tip*: Use `letter-spacing: -0.02em` for headlines above 40px to achieve the "Linear/Raycast" precision look.
*   **Body**: **System Sans-Serif Stack** (Inter, -apple-system, Segoe UI).
*   **Technical/Data**: **JetBrains Mono** or **Geist Mono**. Use this for code, version numbers, and "Lab Metadata" (e.g., "Build 0.4.2").

---

## 5. Motion Design Recommendation
*   **What should animate**: 
    *   **Entrance**: Subtle vertical translate + fade-in for Bento boxes on scroll.
    *   **Hover**: Border-trace or subtle shadow lift on cards.
    *   **Functional**: AI "streaming" text in prompt demos; terminal cursor blinking.
*   **What shouldn't**: 
    *   Avoid bouncy, "playful" easing (Arc style). Stick to `cubic-bezier(0.16, 1, 0.3, 1)` for a fast, technical feel.
    *   Avoid full-page parallax or heavy WebGL that might distract from the "Direct/Opinionated" tone.
