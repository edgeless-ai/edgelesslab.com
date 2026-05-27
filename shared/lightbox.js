/* Edgeless shared lightbox — self-injecting, zero-dependency.
 * Usage: <script src="/shared/lightbox.js" defer></script> before </body>.
 * Click any <img>/<video> to view full size; ‹/› buttons + ArrowLeft/Right
 * navigate, Esc / background / [ESC] close. Counter shows N / total.
 * Canonical source for the vanilla lightbox used across edgelesslab.com static
 * pages (tartanism/total-serialism field-notes, pen-plotter/kandinsky-to-canvas).
 * The pen-plotter React galleries use their own component; the standalone
 * design-system showcase carries its own synced copy (separate repo/origin). */
(function () {
  function init() {
    if (window.__edgelessLightbox) return;
    window.__edgelessLightbox = true;

    var css =
      '.lb-overlay{display:none;position:fixed;inset:0;z-index:99999;background:rgba(8,8,8,.94);' +
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);align-items:center;justify-content:center;cursor:zoom-out}' +
      '.lb-overlay.active{display:flex}' +
      '.lb-overlay img,.lb-overlay video{max-width:92vw;max-height:90vh;object-fit:contain;' +
      'border:1px solid rgba(255,255,255,.15);background:#000;cursor:default}' +
      '.lb-btn{position:absolute;background:none;border:none;color:rgba(255,255,255,.65);cursor:pointer;' +
      'font-family:ui-monospace,Menlo,monospace;user-select:none;line-height:1}.lb-btn:hover{color:#fff}' +
      '.lb-close{top:1.25rem;right:1.5rem;font-size:1.4rem;letter-spacing:.1em}' +
      '.lb-nav{top:50%;transform:translateY(-50%);font-size:2.5rem;padding:1rem}.lb-prev{left:.5rem}.lb-next{right:.5rem}' +
      '.lb-counter{position:absolute;bottom:1.25rem;left:50%;transform:translateX(-50%);' +
      'color:rgba(255,255,255,.6);font-family:ui-monospace,Menlo,monospace;font-size:.8rem;letter-spacing:.12em}' +
      '@media(max-width:520px){.lb-nav{font-size:1.8rem;padding:.5rem}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var ov = document.createElement('div');
    ov.className = 'lb-overlay';
    ov.innerHTML =
      '<button class="lb-btn lb-close" aria-label="Close">[ESC]</button>' +
      '<button class="lb-btn lb-nav lb-prev" aria-label="Previous">&lsaquo;</button>' +
      '<button class="lb-btn lb-nav lb-next" aria-label="Next">&rsaquo;</button>' +
      '<img alt="Full size">' +
      '<video muted loop playsinline controls style="display:none"></video>' +
      '<div class="lb-counter"></div>';
    document.body.appendChild(ov);

    var img = ov.querySelector('img'),
      vid = ov.querySelector('video'),
      prev = ov.querySelector('.lb-prev'),
      next = ov.querySelector('.lb-next'),
      counter = ov.querySelector('.lb-counter'),
      closeBtn = ov.querySelector('.lb-close');
    var items = [], idx = 0;

    function render() {
      var el = items[idx], src = el.currentSrc || el.src || el.getAttribute('src');
      if (el.tagName === 'VIDEO') {
        img.style.display = 'none'; img.removeAttribute('src');
        vid.src = src; vid.style.display = ''; if (vid.play) vid.play().catch(function () {});
      } else {
        if (vid.pause) vid.pause(); vid.removeAttribute('src'); vid.style.display = 'none';
        img.src = src; img.style.display = '';
      }
      var multi = items.length > 1;
      prev.style.display = next.style.display = multi ? '' : 'none';
      counter.textContent = multi ? (idx + 1) + ' / ' + items.length : '';
    }
    function openAt(i) { idx = i; render(); ov.classList.add('active'); }
    function step(d) { if (items.length < 2) return; idx = (idx + d + items.length) % items.length; render(); }
    function close() { ov.classList.remove('active'); if (vid.pause) vid.pause(); }

    items = [].slice.call(document.querySelectorAll('img,video')).filter(function (el) { return el !== img && el !== vid; });
    items.forEach(function (el, i) {
      el.style.cursor = 'zoom-in';
      el.addEventListener('click', function (e) { e.stopPropagation(); openAt(i); });
    });
    prev.addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); step(1); });
    closeBtn.addEventListener('click', function (e) { e.stopPropagation(); close(); });
    ov.addEventListener('click', function (e) { if (e.target === img || e.target === vid) return; close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (!ov.classList.contains('active')) return;
      if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
