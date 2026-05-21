// Edgeless Lab — Reaction Diffusion Demo (CPU Gray-Scott)
// Renders into a canvas injected into: <div class="shader-embed" id="gray-scott-demo" ...></div>
// No external deps; intended to work under strict CSP (self-only).

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function makeEl(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "style") el.setAttribute("style", v);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

function initState(N) {
  const size = N * N;
  const U = new Float32Array(size);
  const V = new Float32Array(size);
  for (let i = 0; i < size; i++) U[i] = 1;

  const cx = (N / 2) | 0;
  const cy = (N / 2) | 0;
  const r = (N * 0.12) | 0;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) {
        const idx = y * N + x;
        U[idx] = 0.5;
        V[idx] = 0.25;
      }
    }
  }
  return { U, V };
}

function laplacian(arr, x, y, N) {
  // 8-neighbor stencil (common Gray-Scott demo weights)
  const idx = y * N + x;
  const c = arr[idx];
  const n = arr[((y - 1 + N) % N) * N + x];
  const s = arr[((y + 1) % N) * N + x];
  const w = arr[y * N + ((x - 1 + N) % N)];
  const e = arr[y * N + ((x + 1) % N)];

  const nw = arr[((y - 1 + N) % N) * N + ((x - 1 + N) % N)];
  const ne = arr[((y - 1 + N) % N) * N + ((x + 1) % N)];
  const sw = arr[((y + 1) % N) * N + ((x - 1 + N) % N)];
  const se = arr[((y + 1) % N) * N + ((x + 1) % N)];

  return (
    (n + s + e + w) * 0.2 +
    (ne + nw + se + sw) * 0.05 -
    c
  );
}

function renderToCanvas(U, V, N, ctx, imgData) {
  const data = imgData.data;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const v = clamp01(V[i]);
      // Edgeless-ish palette: deep bg -> hot pink -> cyan highlights
      const a = Math.pow(v, 0.85);
      const b = Math.pow(v, 2.2);

      const r = (0.06 * (1 - a) + 1.0 * a) * (1 - b) + 0.55 * b;
      const g = (0.03 * (1 - a) + 0.65 * a) * (1 - b) + 0.88 * b;
      const bl = (0.10 * (1 - a) + 0.80 * a) * (1 - b) + 1.00 * b;

      const p = i * 4;
      data[p + 0] = (r * 255) | 0;
      data[p + 1] = (g * 255) | 0;
      data[p + 2] = (bl * 255) | 0;
      data[p + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);
}

function attachDemo(root) {
  const feedInit = Number(root.getAttribute("data-feed-rate") || "0.054");
  const killInit = Number(root.getAttribute("data-kill-rate") || "0.064");

  // Keep it light: 220^2 is a good balance on mobile.
  const N = 220;
  let { U, V } = initState(N);
  let Un = new Float32Array(N * N);
  let Vn = new Float32Array(N * N);

  // Gray-Scott params (tweakable)
  let dU = 0.16;
  let dV = 0.08;
  let f = feedInit;
  let k = killInit;
  let dt = 1.0;
  let itersPerFrame = 4;

  const canvas = makeEl("canvas", { width: N, height: N, style: "width:100%;max-width:720px;aspect-ratio:1/1;display:block;border:1px solid rgba(255,255,255,0.12);background:#05050a;" });
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const imgData = ctx.createImageData(N, N);

  const labelStyle = "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; opacity: 0.9;";
  const controls = makeEl("div", { style: "display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:10px;" }, [
    makeSlider("feed f", 0.0, 0.1, f, 0.001, (v) => (f = v), labelStyle),
    makeSlider("kill k", 0.0, 0.1, k, 0.001, (v) => (k = v), labelStyle),
    makeSlider("speed", 1, 12, itersPerFrame, 1, (v) => (itersPerFrame = v | 0), labelStyle),
    makeButton("reset", () => { ({ U, V } = initState(N)); }, labelStyle),
    makeButton("magic seed", () => {
      // A couple of known-interesting presets.
      const presets = [
        { f: 0.0367, k: 0.0649 },
        { f: 0.0220, k: 0.0510 },
        { f: 0.0300, k: 0.0620 },
        { f: 0.0540, k: 0.0640 },
      ];
      const p = presets[(Math.random() * presets.length) | 0];
      f = p.f; k = p.k;
      feedSlider.value = String(f);
      killSlider.value = String(k);
      feedValue.textContent = f.toFixed(4);
      killValue.textContent = k.toFixed(4);
    }, labelStyle),
  ]);

  // Wiring for magic seed UI updates
  let feedSlider, killSlider, feedValue, killValue;
  for (const el of controls.querySelectorAll("input[type=range]")) {
    if (el.getAttribute("data-name") === "feed f") feedSlider = el;
    if (el.getAttribute("data-name") === "kill k") killSlider = el;
  }
  for (const el of controls.querySelectorAll("span[data-value]") ) {
    if (el.getAttribute("data-name") === "feed f") feedValue = el;
    if (el.getAttribute("data-name") === "kill k") killValue = el;
  }

  // Paint injection
  let painting = false;
  let px = 0, py = 0;
  function paintAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * N;
    const y = ((clientY - rect.top) / rect.height) * N;
    px = x; py = y;
    const bx = x | 0;
    const by = y | 0;
    const br = (N * 0.03) | 0;
    for (let j = -br; j <= br; j++) {
      for (let i = -br; i <= br; i++) {
        const xx = (bx + i + N) % N;
        const yy = (by + j + N) % N;
        if (i * i + j * j <= br * br) {
          const idx = yy * N + xx;
          V[idx] = 0.9;
          U[idx] = 0.1;
        }
      }
    }
  }

  canvas.addEventListener("mousedown", (e) => { painting = true; paintAt(e.clientX, e.clientY); });
  window.addEventListener("mouseup", () => (painting = false));
  window.addEventListener("mousemove", (e) => { if (painting) paintAt(e.clientX, e.clientY); });

  canvas.addEventListener("touchstart", (e) => {
    painting = true;
    const t = e.touches[0];
    paintAt(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchmove", (e) => {
    if (!painting) return;
    const t = e.touches[0];
    paintAt(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener("touchend", () => (painting = false));

  root.innerHTML = "";
  root.appendChild(canvas);
  root.appendChild(controls);

  function stepOnce() {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const u = U[i];
        const v = V[i];
        const Lu = laplacian(U, x, y, N);
        const Lv = laplacian(V, x, y, N);
        const uvv = u * v * v;
        const du = dU * Lu - uvv + f * (1 - u);
        const dv = dV * Lv + uvv - (f + k) * v;
        Un[i] = u + du * dt;
        Vn[i] = v + dv * dt;
      }
    }
    // swap
    let tmp = U; U = Un; Un = tmp;
    tmp = V; V = Vn; Vn = tmp;
  }

  function frame() {
    for (let n = 0; n < itersPerFrame; n++) stepOnce();
    renderToCanvas(U, V, N, ctx, imgData);
    requestAnimationFrame(frame);
  }

  frame();
}

function makeSlider(name, min, max, value, step, onInput, labelStyle) {
  const id = "rd-" + name.replace(/\s+/g, "-");
  const label = makeEl("label", { for: id, style: "display:flex;gap:8px;align-items:center;" + labelStyle });
  const title = makeEl("span", {}, [name]);
  const val = makeEl("span", { "data-value": "1", "data-name": name, style: "min-width:52px; text-align:right; font-variant-numeric: tabular-nums; opacity:0.8;" }, [Number(value).toFixed(4)]);
  const slider = makeEl("input", { id, type: "range", min, max, step, value, "data-name": name, style: "width:180px;" });
  slider.addEventListener("input", () => {
    const v = Number(slider.value);
    val.textContent = (step < 1 ? v.toFixed(4) : String(v | 0));
    onInput(v);
  });
  label.appendChild(title);
  label.appendChild(slider);
  label.appendChild(val);
  return label;
}

function makeButton(text, onClick, labelStyle) {
  const btn = makeEl("button", { type: "button", style: "padding:6px 10px; border:1px solid rgba(255,255,255,0.18); background:rgba(255,255,255,0.04); color:inherit; cursor:pointer;" + labelStyle }, [text]);
  btn.addEventListener("click", onClick);
  return btn;
}

function main() {
  const roots = document.querySelectorAll(".shader-embed#gray-scott-demo");
  for (const r of roots) {
    try {
      attachDemo(r);
    } catch (e) {
      // Fail closed: show a minimal error without breaking the page.
      r.textContent = "[demo error] " + (e && e.message ? e.message : String(e));
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
