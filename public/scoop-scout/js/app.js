/* Scoop Scout — shared app helpers: SW registration, cart (localStorage), nav */
(function () {
  'use strict';

  /* ---------- Service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) {
        console.warn('SW registration failed', e);
      });
    });
  }

  /* ---------- Install hint (Android; iOS gets a static hint on gate.html) ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    function show() {
      if (document.getElementById('install-hint')) return;
      var b = document.createElement('button');
      b.id = 'install-hint';
      b.textContent = 'Install Scoop Scout';
      b.style.cssText = 'position:fixed;bottom:88px;left:50%;transform:translateX(-50%);z-index:60;' +
        'background:#1D3557;color:#fff;border:none;border-radius:9999px;padding:10px 18px;' +
        'font:600 14px "Be Vietnam Pro",sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25);cursor:pointer;';
      b.onclick = function () { b.remove(); e.prompt(); };
      document.body.appendChild(b);
    }
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
  });

  /* ---------- Cart (localStorage) ---------- */
  var KEY = 'scoopscout_cart_v1';
  var TAX_RATE = 0.0; // Portland, OR has no sales tax; keep totals honest

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  }

  var Cart = {
    items: read,
    add: function (name, price, qty) {
      qty = qty || 1;
      var items = read();
      var row = items.find(function (i) { return i.name === name; });
      if (row) { row.qty += qty; }
      else { items.push({ name: name, price: Number(price), qty: qty }); }
      write(items);
      return items;
    },
    setQty: function (name, qty) {
      var items = read().map(function (i) {
        if (i.name === name) i.qty = Math.max(0, qty);
        return i;
      }).filter(function (i) { return i.qty > 0; });
      write(items);
      return items;
    },
    remove: function (name) {
      write(read().filter(function (i) { return i.name !== name; }));
    },
    clear: function () { write([]); },
    count: function () {
      return read().reduce(function (n, i) { return n + i.qty; }, 0);
    },
    subtotal: function () {
      return read().reduce(function (s, i) { return s + i.price * i.qty; }, 0);
    },
    tax: function () { return Cart.subtotal() * TAX_RATE; },
    total: function () { return Cart.subtotal() + Cart.tax(); }
  };

  window.ScoopCart = Cart;

  /* Convenience global used by inline menu markup */
  window.addToCart = function (name, price) { return Cart.add(name, price); };

  window.money = function (n) { return '$' + Number(n).toFixed(2); };
})();
