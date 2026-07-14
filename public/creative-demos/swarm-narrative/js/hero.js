/**
 * HeroRenderer — Particle swarm hero. IIFE attaching to window.HeroRenderer.
 * 350 particles drift via Perlin noise, connected by faint lines when
 * within ~100px. Dark bg with #b51670 / #ed12ed particles.
 * Scroll-responsive via updateScroll(progress).
 */
(function () {
  'use strict';

  // ── Compact Perlin Noise ───────────────────────────────────────────
  var GRAD3 = [
    1,1,0,-1,1,0,1,-1,0,-1,-1,0,
    1,0,1,-1,0,1,1,0,-1,-1,0,-1,
    0,1,1,0,-1,1,0,1,-1,0,-1,-1
  ];
  var perm = [];
  (function () {
    var a = [];
    for (var i = 0; i < 256; i++) a[i] = i;
    for (var i = 255; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    perm = a.concat(a);
  })();

  function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function _lerp(a, b, t) { return a + t * (b - a); }
  function _dot(i, x, y) { var o = i * 3; return GRAD3[o] * x + GRAD3[o + 1] * y; }

  function noise(x, y) {
    var X = Math.floor(x) & 255;
    var Y = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = _fade(xf), v = _fade(yf);
    var aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1];
    var ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return _lerp(_lerp(_dot(aa % 12, xf, yf), _dot(ba % 12, xf - 1, yf), u),
                 _lerp(_dot(ab % 12, xf, yf - 1), _dot(bb % 12, xf - 1, yf - 1), u), v);
  }

  // ── Particle ──────────────────────────────────────────────────────
  function Particle(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.size = 1.2 + Math.random() * 2.8;
    this.colorMix = Math.random();
    this.nx = Math.random() * 200;
    this.ny = Math.random() * 200;
    this.nz = Math.random() * 200;
    this.speed = 0.15 + Math.random() * 0.35;
    this.dx = (Math.random() - 0.5) * 0.4;
    this.dy = (Math.random() - 0.5) * 0.4;
  }

  // ── Renderer ──────────────────────────────────────────────────────
  var R = {
    _c: null, _ctx: null, _pts: [], _N: 350, _s: 0, _run: false,
    _id: null, _w: 0, _h: 0, _onResize: null, _bg: null,
    _cA: {r:181,g:22,b:112}, _cB: {r:237,g:18,b:237},

    init: function (el) {
      this._c = el;
      this._ctx = el.getContext('2d');
      this._resize();
      this._onResize = this._resize.bind(this);
      window.addEventListener('resize', this._onResize);
      for (var i = 0; i < this._N; i++) this._pts.push(new Particle(this._w, this._h));
      this._run = true;
      this._anim();
    },

    _resize: function () {
      var r = this._c.parentElement.getBoundingClientRect();
      this._c.width = r.width;
      this._c.height = r.height;
      this._w = r.width;
      this._h = r.height;
      this._bg = null;
    },

    updateScroll: function (p) { this._s = Math.max(0, Math.min(1, p)); },

    destroy: function () {
      this._run = false;
      if (this._id) { cancelAnimationFrame(this._id); this._id = null; }
      if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }
      this._pts = []; this._ctx = null; this._c = null;
    },

    _anim: function () {
      if (!this._run) return;
      this._tick();
      this._draw();
      this._id = requestAnimationFrame(this._anim.bind(this));
    },

    _tick: function () {
      var s = this._s, mul = 1 - s * 0.75, t = Date.now() * 0.00012;
      for (var i = 0; i < this._pts.length; i++) {
        var p = this._pts[i];
        var nx = noise(p.nx + t, p.ny) * 1.6;
        var ny = noise(p.nx, p.nz + t) * 1.6;
        p.x += (p.dx + nx * 0.6) * p.speed * mul;
        p.y += (p.dy + ny * 0.6) * p.speed * mul;
        if (p.x < -30) p.x = this._w + 30;
        else if (p.x > this._w + 30) p.x = -30;
        if (p.y < -30) p.y = this._h + 30;
        else if (p.y > this._h + 30) p.y = -30;
      }
    },

    _draw: function () {
      var ctx = this._ctx, w = this._w, h = this._h;
      if (!w || !h) return;

      // Radial gradient bg
      if (!this._bg || this._bg._w !== w || this._bg._h !== h) {
        var g = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, Math.max(w,h)*0.7);
        g.addColorStop(0, '#0d0d1a');
        g.addColorStop(1, '#050510');
        this._bg = g; this._bg._w = w; this._bg._h = h;
      }
      ctx.fillStyle = this._bg;
      ctx.fillRect(0, 0, w, h);

      var pts = this._pts, s = this._s;
      var maxD = 100 + s * 40, maxDSq = maxD * maxD;

      // Batched connection lines
      ctx.beginPath();
      for (var i = 0; i < pts.length; i++) {
        var pi = pts[i];
        for (var j = i + 1; j < pts.length; j++) {
          var pj = pts[j];
          var dx = pi.x - pj.x, dy = pi.y - pj.y;
          if (dx * dx + dy * dy < maxDSq) { ctx.moveTo(pi.x, pi.y); ctx.lineTo(pj.x, pj.y); }
        }
      }
      ctx.strokeStyle = 'rgba(181,22,112,' + (0.08 + s * 0.06) + ')';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Particles
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var c = this._cA, c2 = this._cB, m = p.colorMix;
        var r = Math.round(c.r + (c2.r - c.r) * m);
        var g = Math.round(c.g + (c2.g - c.g) * m);
        var b = Math.round(c.b + (c2.b - c.b) * m);
        var a = 0.5 + 0.5 * (0.5 + 0.5 * noise(p.nx * 0.3, p.ny * 0.3));
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  window.HeroRenderer = R;
})();
