/**
 * Kinetic Type Physics
 * ====================
 * Technique: Matter.js physics engine + inline Lottie JSON generation.
 * Each keystroke spawns a letter (DOM element + physics body). Letters fall,
 * bounce, and collide. On impact, a Lottie animation plays. A "Rogue Glyph"
 * every 10 seconds ignores gravity and can temporarily swap its animation with
 * a neighbor when it touches the cursor.
 *
 * Hybrid: Animography modular animated typeface pipeline x Resn Matter.js
 * physics playground.
 */

// --- Matter.js module aliases ---
const Engine = Matter.Engine;
const Bodies = Matter.Bodies;
const Body = Matter.Body;
const Composite = Matter.Composite;
const Events = Matter.Events;
const Mouse = Matter.Mouse;
const MouseConstraint = Matter.MouseConstraint;
const Query = Matter.Query;

// --- Config ---
const LETTER_SIZE = 60;
const COLORS = ['#FFFFFF', '#FF00FF', '#FFFF00'];
const ROGUE_COLOR = '#FF6B6B';
const WALL_THICKNESS = 100;

// --- State ---
let width = window.innerWidth;
let height = window.innerHeight;
const letters = []; // { body, wrapper, lottieContainer, textSpan, anim, color, char, isRogue, hasSwapped, originalColor }
let rogue = null;
let rogueTimer = 0;
let mouseX = 0;
let mouseY = 0;
let swapTimeoutId = null;

// --- Engine Setup ---
const engine = Engine.create();
engine.world.gravity.y = 1.0;

// Static boundaries (floor + walls)
const floor = Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2, width + 200, WALL_THICKNESS, { isStatic: true });
const leftWall = Bodies.rectangle(-WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, { isStatic: true });
const rightWall = Bodies.rectangle(width + WALL_THICKNESS / 2, height / 2, WALL_THICKNESS, height * 2, { isStatic: true });
Composite.add(engine.world, [floor, leftWall, rightWall]);

// MouseConstraint enables drag-to-throw on any body
const mouse = Mouse.create(document.body);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: { stiffness: 0.2, render: { visible: false } }
});
Composite.add(engine.world, mouseConstraint);

// --- Utilities ---
function hexToRgbNormalized(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/**
 * Generates a lightweight inline Lottie JSON object for a given character.
 * The animation signature varies by character index to create modular,
 * Animography-style per-letter motion (bounce, spin, wobble, pulse).
 * Each letter gets a unique combination of shape (ellipse/rect/rounded-rect)
 * and animation template, so swapping animations between letters produces
 * visible variety.
 */
function generateLottieData(char, colorHex) {
  const i = char.charCodeAt(0) - 65;
  const rgb = hexToRgbNormalized(colorHex);
  const shapeType = i % 3; // 0 = ellipse, 1 = rect, 2 = rounded rect
  const animTemplate = i % 4;

  // Base shape (centered at origin inside a 60x60 canvas)
  let shape;
  if (shapeType === 0) {
    // Circle
    shape = { ty: 'el', d: 1, s: { a: 0, k: [26, 26] }, p: { a: 0, k: [0, 0] } };
  } else if (shapeType === 1) {
    // Square
    shape = { ty: 'rc', d: 1, s: { a: 0, k: [46, 46] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 } };
  } else {
    // Rounded rect
    shape = { ty: 'rc', d: 1, s: { a: 0, k: [40, 50] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 10 } };
  }

  // Scale keyframes: four templates create distinct motion signatures
  const bounceIn = { i: { x: [0.667, 0.667], y: [1, 1] }, o: { x: [0.333, 0.333], y: [0, 0] } };
  let scaleK;
  if (animTemplate === 0) {
    // Bounce
    scaleK = [
      { t: 0, s: [0, 0], ...bounceIn },
      { t: 30, s: [130, 130], ...bounceIn },
      { t: 60, s: [100, 100] }
    ];
  } else if (animTemplate === 1) {
    // Spin + Bounce
    scaleK = [
      { t: 0, s: [0, 0], ...bounceIn },
      { t: 25, s: [140, 140], ...bounceIn },
      { t: 60, s: [100, 100] }
    ];
  } else if (animTemplate === 2) {
    // Wobble
    scaleK = [
      { t: 0, s: [0, 0], ...bounceIn },
      { t: 20, s: [150, 80], ...bounceIn },
      { t: 40, s: [80, 140], ...bounceIn },
      { t: 60, s: [100, 100] }
    ];
  } else {
    // Pulse
    scaleK = [
      { t: 0, s: [0, 0], ...bounceIn },
      { t: 15, s: [120, 120], ...bounceIn },
      { t: 30, s: [90, 90], ...bounceIn },
      { t: 45, s: [110, 110], ...bounceIn },
      { t: 60, s: [100, 100] }
    ];
  }

  // Rotation keyframes
  const rotEase = { i: { x: [0.667], y: [1] }, o: { x: [0.333], y: [0] } };
  let rotProp;
  if (animTemplate === 1) {
    rotProp = { a: 1, k: [{ t: 0, s: [0], ...rotEase }, { t: 60, s: [360] }] };
  } else if (animTemplate === 2) {
    rotProp = { a: 1, k: [{ t: 0, s: [-15], ...rotEase }, { t: 30, s: [15], ...rotEase }, { t: 60, s: [0] }] };
  } else {
    rotProp = { a: 0, k: 0 };
  }

  // Fill using the letter's palette color
  const fill = { ty: 'fl', c: { a: 0, k: [...rgb, 1] }, o: { a: 0, k: 100 } };

  // Group transform (static)
  const groupTransform = {
    ty: 'tr',
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 }
  };

  // Layer definition
  const layer = {
    ddd: 0,
    ind: 1,
    ty: 4,
    nm: 'Shape',
    sr: 1,
    ks: {
      o: { a: 0, k: 100 },
      r: rotProp,
      p: { a: 0, k: [30, 30, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: scaleK }
    },
    shapes: [{ ty: 'gr', it: [shape, fill, groupTransform] }]
  };

  return {
    v: '5.5.2',
    fr: 60,
    ip: 0,
    op: 60,
    w: 60,
    h: 60,
    nm: 'Letter ' + char,
    ddd: 0,
    assets: [],
    layers: [layer]
  };
}

// --- Letter Spawning ---
function spawnLetter(key) {
  const colorIndex = (key.charCodeAt(0) - 65) % 3;
  const color = COLORS[colorIndex];

  // DOM wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'letter-wrapper';
  wrapper.style.color = color;
  document.body.appendChild(wrapper);

  // Lottie container (background animation)
  const lottieContainer = document.createElement('div');
  lottieContainer.className = 'lottie-container';
  wrapper.appendChild(lottieContainer);

  // Text glyph (foreground)
  const textSpan = document.createElement('span');
  textSpan.className = 'letter-text';
  textSpan.textContent = key;
  wrapper.appendChild(textSpan);

  // Inline Lottie animation instance
  const animData = generateLottieData(key, color);
  const anim = lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: animData
  });

  // Physics body: 60x60 rectangle, bouncy, with slight air friction
  const x = width / 2 + (Math.random() * 200 - 100);
  const y = 60;
  const body = Bodies.rectangle(x, y, LETTER_SIZE, LETTER_SIZE, {
    restitution: 0.6,
    friction: 0.1,
    frictionAir: 0.01
  });
  Composite.add(engine.world, body);

  letters.push({
    body,
    wrapper,
    lottieContainer,
    textSpan,
    anim,
    color,
    char: key,
    isRogue: false,
    hasSwapped: false,
    originalColor: color
  });
}

// --- Collision Effects ---
Events.on(engine, 'collisionStart', (event) => {
  for (const pair of event.pairs) {
    const bodyA = pair.bodyA;
    const bodyB = pair.bodyB;

    const letterA = letters.find(l => l.body === bodyA);
    const letterB = letters.find(l => l.body === bodyB);

    if (letterA) {
      letterA.anim.goToAndPlay(0);
      spawnCollisionFlash(letterA.body.position.x, letterA.body.position.y);
    }
    if (letterB) {
      letterB.anim.goToAndPlay(0);
      spawnCollisionFlash(letterB.body.position.x, letterB.body.position.y);
    }
  }
});

function spawnCollisionFlash(x, y) {
  const flash = document.createElement('div');
  flash.className = 'collision-flash';
  flash.style.left = (x - 8) + 'px';
  flash.style.top = (y - 8) + 'px';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 100);
}

// --- Reset ---
function resetWorld() {
  if (swapTimeoutId) {
    clearTimeout(swapTimeoutId);
    swapTimeoutId = null;
  }
  for (const l of letters) {
    l.anim.destroy();
    l.wrapper.remove();
    Composite.remove(engine.world, l.body);
  }
  letters.length = 0;
  rogue = null;
  rogueTimer = 0;
}

// --- Rogue Glyph Logic ---
function activateRogue() {
  if (letters.length === 0 || rogue) return;
  const candidate = letters[Math.floor(Math.random() * letters.length)];
  rogue = candidate;
  rogue.isRogue = true;
  rogue.hasSwapped = false;
  rogue.body.gravityScale = 0; // ignore gravity
  rogue.wrapper.style.filter = 'drop-shadow(0 0 12px rgba(255,107,107,0.6))';
  rogue.wrapper.style.color = ROGUE_COLOR;
  rogueTimer = 0;
}

function deactivateRogue() {
  if (!rogue) return;
  rogue.isRogue = false;
  rogue.hasSwapped = false;
  rogue.body.gravityScale = 1;
  rogue.wrapper.style.color = rogue.originalColor;
  rogue.wrapper.style.filter = 'none';
  rogue = null;
  rogueTimer = 0;
}

function performSwap(rogueObj, targetObj) {
  // Destroy current animation instances
  rogueObj.anim.destroy();
  targetObj.anim.destroy();

  // Create swapped animations: rogue gets target's signature, target gets rogue's
  const rogueData = generateLottieData(targetObj.char, targetObj.originalColor);
  const targetData = generateLottieData(rogueObj.char, rogueObj.originalColor);

  rogueObj.anim = lottie.loadAnimation({
    container: rogueObj.lottieContainer,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: rogueData
  });
  targetObj.anim = lottie.loadAnimation({
    container: targetObj.lottieContainer,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: targetData
  });

  rogueObj.anim.goToAndPlay(0);
  targetObj.anim.goToAndPlay(0);

  // After 3 seconds, revert both animations and deactivate the rogue
  swapTimeoutId = setTimeout(() => {
    if (rogueObj.anim) rogueObj.anim.destroy();
    if (targetObj.anim) targetObj.anim.destroy();
    rogueObj.anim = lottie.loadAnimation({
      container: rogueObj.lottieContainer,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: generateLottieData(rogueObj.char, rogueObj.originalColor)
    });
    targetObj.anim = lottie.loadAnimation({
      container: targetObj.lottieContainer,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: generateLottieData(targetObj.char, targetObj.originalColor)
    });
    if (rogue === rogueObj) {
      deactivateRogue();
    }
  }, 3000);
}

// --- Interaction Handlers ---
window.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase();
  if (key >= 'A' && key <= 'Z') {
    spawnLetter(key);
  }
});

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// Click on empty space resets the world
// Matter.js MouseConstraint tracks its own mouse; we use Query.point to check
// whether any dynamic body sits under the pointer.
document.body.addEventListener('click', (e) => {
  const allBodies = Composite.allBodies(engine.world);
  const hits = Query.point(allBodies, mouse.position);
  const dynamicHits = hits.filter(b => !b.isStatic);
  if (dynamicHits.length === 0) {
    resetWorld();
  }
});

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  Body.setPosition(floor, { x: width / 2, y: height + WALL_THICKNESS / 2 });
  Body.setPosition(rightWall, { x: width + WALL_THICKNESS / 2, y: height / 2 });
  // leftWall stays at x = -50
});

// --- Main Loop ---
function animate() {
  Engine.update(engine, 1000 / 60);
  const t = performance.now() / 1000;

  // Sync DOM element positions to physics body transforms
  for (const l of letters) {
    const x = l.body.position.x - LETTER_SIZE / 2;
    const y = l.body.position.y - LETTER_SIZE / 2;
    const angle = l.body.angle;
    l.wrapper.style.transform = 'translate(' + x + 'px, ' + y + 'px) rotate(' + angle + 'rad)';
  }

  // Rogue timer: only ticks when no rogue is active
  if (!rogue) {
    rogueTimer++;
    if (rogueTimer > 600) {
      activateRogue();
    }
  }

  // Rogue behavior: Lissajous orbit + cursor-proximity swap
  if (rogue) {
    Body.setVelocity(rogue.body, {
      x: Math.sin(t * 2) * 3,
      y: Math.cos(t * 1.5) * 3
    });

    if (!rogue.hasSwapped) {
      const dx = mouseX - rogue.body.position.x;
      const dy = mouseY - rogue.body.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40) {
        let nearest = null;
        let nearestDist = Infinity;
        for (const l of letters) {
          if (l !== rogue) {
            const ddx = l.body.position.x - rogue.body.position.x;
            const ddy = l.body.position.y - rogue.body.position.y;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = l;
            }
          }
        }
        if (nearest && nearestDist < 60) {
          rogue.hasSwapped = true;
          performSwap(rogue, nearest);
        }
      }
    }
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
