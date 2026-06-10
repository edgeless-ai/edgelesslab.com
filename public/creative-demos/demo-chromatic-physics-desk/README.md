# Chromatic Physics Desk

**Technique**: Webcam color sampling + vanilla JS physics engine + CSS difference-blend cursor

**Domains**: Colour Mapper (camera + HSL polar mapping) × SavoirFaire.nyc (physics stickers + difference cursor)

**What it does**
Your webcam's dominant color becomes a draggable physics body on a black desk. The difference cursor inverts everything it touches, and frozen video-frame stickers bounce with real mass, friction, and viewport-edge collision.

**Key features**
- `getUserMedia` center-crop color sampling every 500ms
- Custom physics engine: velocity, friction (0.92), restitution (0.7), circle-circle collision
- Frozen 50×50 camera snapshots baked into each sticker via `canvas.toDataURL()`
- 64px SVG star cursor with `mix-blend-mode: difference`
- High-velocity collision triggers `#cdfd50` lime flash
- Idle gravity well: after 10s, stickers drift toward center

**Attribution**
- Palette and sticker physics concept derived from SavoirFaire.nyc
- Live color sampling technique inspired by Colour Mapper (Michael Norman)

**Run**
Open `index.html` in a browser. Camera permission required.
