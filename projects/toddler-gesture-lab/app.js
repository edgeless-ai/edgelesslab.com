(() => {
  "use strict";

  const canvas = document.getElementById("garden");
  const ctx = canvas.getContext("2d", { alpha: false });
  const parentPanel = document.getElementById("parent-panel");
  const gateProgress = document.getElementById("gate-progress");

  const palettes = {
    electric: ["#ff4f9a", "#ffb000", "#d8ff57", "#44d7ff", "#825cff", "#ff6757"],
    ocean: ["#061b3a", "#075985", "#0891b2", "#22d3ee", "#99f6e4", "#7c3aed"],
    sherbet: ["#ff8fab", "#ffc2d1", "#ffe5a5", "#caffbf", "#a0c4ff", "#bdb2ff"],
    forest: ["#092c25", "#0f766e", "#22c55e", "#a3e635", "#facc15", "#fb7185"],
    sunrise: ["#4c1d4f", "#9f1239", "#f97316", "#fbbf24", "#fde68a", "#fb7185"]
  };

  const state = {
    width: 0,
    height: 0,
    ratio: 1,
    pointers: new Map(),
    particles: [],
    blooms: [],
    ribbons: [],
    stars: [],
    scene: "flow",
    paletteName: "electric",
    paletteOffset: 0,
    backgroundHue: 232,
    energy: 1,
    calm: false,
    sound: false,
    audio: null,
    lastFrame: performance.now(),
    gateTimer: 0,
    gateActive: false,
    lastPair: null,
    gestureCooldown: 0
  };

  function palette() {
    return palettes[state.paletteName];
  }

  function colorAt(index, alpha = 1) {
    const colors = palette();
    const hex = colors[(Math.floor(index) + state.paletteOffset + colors.length) % colors.length];
    if (alpha >= 1) return hex;
    const clean = hex.slice(1);
    const value = parseInt(clean, 16);
    return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  function randomColor(alpha = 1) {
    return colorAt(Math.floor(Math.random() * palette().length), alpha);
  }

  function resize() {
    state.ratio = Math.min(window.devicePixelRatio || 1, 2);
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = Math.round(state.width * state.ratio);
    canvas.height = Math.round(state.height * state.ratio);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.ratio, 0, 0, state.ratio, 0, 0);
    clear(true);
    seedStars();
  }

  function clear(immediate = false) {
    state.particles.length = 0;
    state.blooms.length = 0;
    state.ribbons.length = 0;
    const hue = state.backgroundHue + state.paletteOffset * 13;
    ctx.fillStyle = `hsl(${hue} 48% ${state.calm ? 8 : 6}%)`;
    ctx.fillRect(0, 0, state.width, state.height);
    if (!immediate) burst(state.width / 2, state.height / 2, 18, 0.6);
  }

  function seedStars() {
    state.stars = Array.from({ length: Math.round((state.width * state.height) / 9000) }, () => ({
      x: Math.random() * state.width,
      y: Math.random() * state.height,
      size: 0.5 + Math.random() * 2,
      phase: Math.random() * Math.PI * 2,
      color: randomColor(0.25 + Math.random() * 0.35)
    }));
  }

  function pressure(event) {
    return event.pressure > 0 ? event.pressure : 0.5;
  }

  function makePointer(event) {
    return {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      previousX: event.clientX,
      previousY: event.clientY,
      downX: event.clientX,
      downY: event.clientY,
      downAt: performance.now(),
      movedAt: performance.now(),
      velocityX: 0,
      velocityY: 0,
      speed: 0,
      distance: 0,
      pressure: pressure(event),
      holdBloomed: false,
      history: [{ x: event.clientX, y: event.clientY }]
    };
  }

  function addParticle(x, y, options = {}) {
    const angle = options.angle ?? Math.random() * Math.PI * 2;
    const speed = options.speed ?? (0.4 + Math.random() * 2.5) * state.energy;
    state.particles.push({
      x,
      y,
      previousX: x,
      previousY: y,
      vx: Math.cos(angle) * speed + (options.vx || 0),
      vy: Math.sin(angle) * speed + (options.vy || 0),
      life: 1,
      decay: options.decay ?? (0.007 + Math.random() * 0.012),
      radius: options.radius ?? (2 + Math.random() * 8),
      color: options.color || randomColor(0.72),
      curl: (Math.random() - 0.5) * 0.08,
      shape: options.shape || state.scene
    });
    const limit = state.calm ? 900 : 1900;
    if (state.particles.length > limit) state.particles.splice(0, state.particles.length - limit);
  }

  function trail(pointer) {
    const count = state.calm ? 2 : Math.min(12, 3 + Math.round(pointer.speed * 0.6));
    const direction = Math.atan2(pointer.velocityY, pointer.velocityX);
    for (let i = 0; i < count; i += 1) {
      addParticle(
        pointer.x + (Math.random() - 0.5) * 18,
        pointer.y + (Math.random() - 0.5) * 18,
        {
          angle: direction + Math.PI + (Math.random() - 0.5) * 1.4,
          speed: 0.5 + Math.random() * (1.2 + pointer.speed * 0.2),
          radius: 3 + pointer.pressure * 13 + Math.min(10, pointer.speed),
          vx: pointer.velocityX * 0.11,
          vy: pointer.velocityY * 0.11,
          color: colorAt(pointer.id + pointer.speed * 0.12, 0.58 + pointer.pressure * 0.3)
        }
      );
    }

    state.ribbons.push({
      x1: pointer.previousX,
      y1: pointer.previousY,
      x2: pointer.x,
      y2: pointer.y,
      width: 7 + pointer.pressure * 22 + Math.min(20, pointer.speed * 0.7),
      color: colorAt(pointer.id + pointer.distance * 0.012, 0.28),
      life: 1
    });
    if (state.ribbons.length > 420) state.ribbons.splice(0, state.ribbons.length - 420);
  }

  function bloom(x, y, strength = 1) {
    const petals = 5 + Math.floor(Math.random() * 8);
    state.blooms.push({
      x,
      y,
      radius: 3,
      target: (48 + Math.random() * 120) * strength * state.energy,
      petals,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.014,
      life: 1,
      color: randomColor(0.55),
      core: randomColor(0.8)
    });
    tone(160 + petals * 22, 0.12, 0.06);
  }

  function burst(x, y, count = 38, strength = 1) {
    const actualCount = state.calm ? Math.round(count * 0.55) : count;
    for (let i = 0; i < actualCount; i += 1) {
      const angle = (i / actualCount) * Math.PI * 2 + Math.random() * 0.25;
      addParticle(x, y, {
        angle,
        speed: (1.4 + Math.random() * 7) * strength,
        radius: 3 + Math.random() * 13,
        decay: 0.004 + Math.random() * 0.008,
        color: colorAt(i * 0.7, 0.8)
      });
    }
    tone(90 + Math.random() * 180, 0.18, 0.08);
  }

  function drawBridge(first, second) {
    const distance = Math.hypot(second.x - first.x, second.y - first.y);
    const steps = Math.max(4, Math.min(36, Math.round(distance / 22)));
    const midX = (first.x + second.x) / 2;
    const midY = (first.y + second.y) / 2;
    const bend = Math.sin(performance.now() * 0.004) * Math.min(80, distance * 0.22);
    const normalX = -(second.y - first.y) / Math.max(1, distance);
    const normalY = (second.x - first.x) / Math.max(1, distance);

    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const curve = Math.sin(t * Math.PI) * bend;
      const x = first.x + (second.x - first.x) * t + normalX * curve;
      const y = first.y + (second.y - first.y) * t + normalY * curve;
      addParticle(x, y, {
        speed: 0.3 + Math.random() * 0.8,
        radius: 4 + Math.sin(t * Math.PI) * 9,
        decay: 0.013,
        color: colorAt(i * 0.45 + distance * 0.01, 0.72)
      });
    }
  }

  function multiTouchGesture() {
    const points = [...state.pointers.values()];
    if (points.length === 2) {
      const [first, second] = points;
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const angle = Math.atan2(second.y - first.y, second.x - first.x);
      drawBridge(first, second);
      if (state.lastPair) {
        const distanceChange = distance - state.lastPair.distance;
        let angleChange = angle - state.lastPair.angle;
        while (angleChange > Math.PI) angleChange -= Math.PI * 2;
        while (angleChange < -Math.PI) angleChange += Math.PI * 2;
        state.energy = Math.max(0.55, Math.min(2.2, state.energy + distanceChange * 0.002));
        if (Math.abs(angleChange) > 0.035) {
          state.paletteOffset = (state.paletteOffset + (angleChange > 0 ? 1 : -1) + palette().length) % palette().length;
        }
      }
      state.lastPair = { distance, angle };
    } else {
      state.lastPair = null;
    }

    if (points.length === 3 && performance.now() > state.gestureCooldown) {
      const center = points.reduce((sum, point) => ({ x: sum.x + point.x / 3, y: sum.y + point.y / 3 }), { x: 0, y: 0 });
      state.paletteOffset = (state.paletteOffset + 1) % palette().length;
      bloom(center.x, center.y, 1.55);
      burst(center.x, center.y, 28, 0.75);
      state.gestureCooldown = performance.now() + 650;
    }

    if (points.length >= 4 && performance.now() > state.gestureCooldown) {
      const center = points.reduce((sum, point) => ({
        x: sum.x + point.x / points.length,
        y: sum.y + point.y / points.length
      }), { x: 0, y: 0 });
      burst(center.x, center.y, 74, 1.35);
      state.backgroundHue = (state.backgroundHue + 47) % 360;
      state.gestureCooldown = performance.now() + 900;
    }
  }

  function updateHoldBlooms(now) {
    for (const pointer of state.pointers.values()) {
      if (!pointer.holdBloomed && now - pointer.downAt > 470 && pointer.distance < 34) {
        pointer.holdBloomed = true;
        bloom(pointer.x, pointer.y, 1.15);
      }
      if (pointer.holdBloomed && Math.random() < 0.075) {
        addParticle(pointer.x, pointer.y, {
          speed: 0.4,
          radius: 7 + Math.random() * 8,
          decay: 0.012,
          color: colorAt(pointer.id + now * 0.001, 0.62)
        });
      }
    }
  }

  function updateGate() {
    const points = [...state.pointers.values()];
    const topBand = Math.max(110, state.height * 0.16);
    const cornerBand = Math.max(120, state.width * 0.18);
    const left = points.some((point) => point.x < cornerBand && point.y < topBand);
    const right = points.some((point) => point.x > state.width - cornerBand && point.y < topBand);

    if (left && right && !parentPanel.classList.contains("open")) {
      if (!state.gateActive) {
        state.gateActive = true;
        gateProgress.classList.add("active");
        state.gateTimer = window.setTimeout(openParentPanel, 2200);
      }
    } else {
      cancelGate();
    }
  }

  function cancelGate() {
    state.gateActive = false;
    window.clearTimeout(state.gateTimer);
    gateProgress.classList.remove("active");
  }

  function openParentPanel() {
    cancelGate();
    parentPanel.classList.add("open");
    parentPanel.setAttribute("aria-hidden", "false");
    state.pointers.clear();
  }

  function closeParentPanel() {
    parentPanel.classList.remove("open");
    parentPanel.setAttribute("aria-hidden", "true");
  }

  function ensureAudio() {
    if (!state.sound) return null;
    if (!state.audio) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      state.audio = new AudioContext();
    }
    if (state.audio.state === "suspended") state.audio.resume();
    return state.audio;
  }

  function tone(frequency, duration, volume) {
    const audio = ensureAudio();
    if (!audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.72), audio.currentTime + duration);
    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration + 0.02);
  }

  function pointerDown(event) {
    if (parentPanel.classList.contains("open")) return;
    event.preventDefault();
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Synthetic tests and older WebViews may not register an active pointer.
    }
    const pointer = makePointer(event);
    state.pointers.set(event.pointerId, pointer);
    bloom(pointer.x, pointer.y, 0.55 + pointer.pressure * 0.45);
    for (let i = 0; i < 12; i += 1) addParticle(pointer.x, pointer.y);
    updateGate();
    multiTouchGesture();
  }

  function pointerMove(event) {
    const pointer = state.pointers.get(event.pointerId);
    if (!pointer) return;
    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(8, now - pointer.movedAt);
    const nextX = event.clientX;
    const nextY = event.clientY;
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.velocityX = ((nextX - pointer.previousX) / elapsed) * 16;
    pointer.velocityY = ((nextY - pointer.previousY) / elapsed) * 16;
    pointer.speed = Math.hypot(pointer.velocityX, pointer.velocityY);
    pointer.distance += Math.hypot(nextX - pointer.previousX, nextY - pointer.previousY);
    pointer.pressure = pressure(event);
    pointer.movedAt = now;
    pointer.history.push({ x: nextX, y: nextY });
    if (pointer.history.length > 20) pointer.history.shift();
    trail(pointer);
    updateGate();
    multiTouchGesture();
  }

  function pointerUp(event) {
    const pointer = state.pointers.get(event.pointerId);
    if (!pointer) return;
    event.preventDefault();
    const duration = performance.now() - pointer.downAt;
    if (pointer.speed > 11) {
      burst(pointer.x, pointer.y, 42, Math.min(1.8, pointer.speed * 0.08));
    } else if (duration < 260 && pointer.distance < 24) {
      bloom(pointer.x, pointer.y, 0.9);
    }
    state.pointers.delete(event.pointerId);
    state.lastPair = null;
    updateGate();
  }

  function drawBackground(delta) {
    const hue = (state.backgroundHue + state.paletteOffset * 13) % 360;
    ctx.fillStyle = `hsla(${hue} 48% ${state.calm ? 8 : 6}% / ${state.calm ? 0.12 : 0.075})`;
    ctx.fillRect(0, 0, state.width, state.height);

    if (state.scene === "stars") {
      const now = performance.now() * 0.001;
      for (const star of state.stars) {
        const pulse = 0.45 + Math.sin(now * 1.8 + star.phase) * 0.25;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (1 + state.energy * 0.18), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawRibbons(delta) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = state.ribbons.length - 1; i >= 0; i -= 1) {
      const ribbon = state.ribbons[i];
      ribbon.life -= delta * 0.00038;
      if (ribbon.life <= 0) {
        state.ribbons.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = ribbon.life;
      ctx.strokeStyle = ribbon.color;
      ctx.lineWidth = ribbon.width * ribbon.life;
      ctx.beginPath();
      ctx.moveTo(ribbon.x1, ribbon.y1);
      ctx.quadraticCurveTo(
        (ribbon.x1 + ribbon.x2) / 2 + Math.sin(ribbon.life * 8) * 8,
        (ribbon.y1 + ribbon.y2) / 2 + Math.cos(ribbon.life * 7) * 8,
        ribbon.x2,
        ribbon.y2
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(delta) {
    ctx.lineCap = "round";
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const particle = state.particles[i];
      particle.previousX = particle.x;
      particle.previousY = particle.y;
      const angle = Math.atan2(particle.vy, particle.vx) + particle.curl;
      const speed = Math.hypot(particle.vx, particle.vy) * 0.996;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.x += particle.vx * (delta / 16.67);
      particle.y += particle.vy * (delta / 16.67);
      particle.life -= particle.decay * (delta / 16.67);
      if (particle.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.strokeStyle = particle.color;
      ctx.fillStyle = particle.color;
      const radius = particle.radius * (0.3 + particle.life * 0.7);

      if (particle.shape === "stars") {
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(angle);
        ctx.beginPath();
        for (let point = 0; point < 8; point += 1) {
          const r = point % 2 === 0 ? radius : radius * 0.36;
          const a = (point / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (particle.shape === "bloom") {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.lineWidth = Math.max(1, radius * 0.8);
        ctx.beginPath();
        ctx.moveTo(particle.previousX, particle.previousY);
        ctx.lineTo(particle.x, particle.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawBlooms(delta) {
    for (let i = state.blooms.length - 1; i >= 0; i -= 1) {
      const item = state.blooms[i];
      item.radius += (item.target - item.radius) * 0.035 * (delta / 16.67);
      item.rotation += item.spin * (delta / 16.67);
      item.life -= 0.0018 * (delta / 16.67);
      if (item.life <= 0.02) {
        state.blooms.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);
      ctx.globalAlpha = Math.min(0.72, item.life * 0.72);
      ctx.fillStyle = item.color;
      for (let petal = 0; petal < item.petals; petal += 1) {
        ctx.rotate((Math.PI * 2) / item.petals);
        ctx.beginPath();
        ctx.ellipse(item.radius * 0.48, 0, item.radius * 0.5, item.radius * 0.19, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = item.life * 0.8;
      ctx.fillStyle = item.core;
      ctx.beginPath();
      ctx.arc(0, 0, item.radius * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  function animate(now) {
    const delta = Math.min(40, now - state.lastFrame);
    state.lastFrame = now;
    updateHoldBlooms(now);
    drawBackground(delta);
    drawRibbons(delta);
    drawBlooms(delta);
    drawParticles(delta);
    requestAnimationFrame(animate);
  }

  function bindParentControls() {
    document.getElementById("scene").addEventListener("change", (event) => {
      state.scene = event.target.value;
      clear();
    });
    document.getElementById("palette").addEventListener("change", (event) => {
      state.paletteName = event.target.value;
      state.paletteOffset = 0;
      seedStars();
      clear();
    });
    document.getElementById("sound").addEventListener("click", (event) => {
      state.sound = !state.sound;
      event.currentTarget.textContent = `Sound: ${state.sound ? "on" : "off"}`;
      event.currentTarget.setAttribute("aria-pressed", String(state.sound));
      if (state.sound) tone(220, 0.15, 0.05);
    });
    document.getElementById("calm").addEventListener("click", (event) => {
      state.calm = !state.calm;
      event.currentTarget.textContent = `Calm mode: ${state.calm ? "on" : "off"}`;
      event.currentTarget.setAttribute("aria-pressed", String(state.calm));
    });
    document.getElementById("clear").addEventListener("click", () => clear());
    document.getElementById("fullscreen").addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch {}
    });
    document.getElementById("close-panel").addEventListener("click", closeParentPanel);
  }

  canvas.addEventListener("pointerdown", pointerDown, { passive: false });
  canvas.addEventListener("pointermove", pointerMove, { passive: false });
  canvas.addEventListener("pointerup", pointerUp, { passive: false });
  canvas.addEventListener("pointercancel", pointerUp, { passive: false });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    state.lastFrame = performance.now();
    if (document.hidden) state.pointers.clear();
  });

  bindParentControls();
  resize();
  requestAnimationFrame(animate);
})();
