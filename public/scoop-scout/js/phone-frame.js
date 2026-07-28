/* Scoop Scout desktop presentation — send desktop-width, top-level visits
   into the iPhone shell (phone.html). Inside the iframe or on mobile this
   script does nothing, so the app itself never changes. */
(function () {
  'use strict';
  if (window.self !== window.top) return; // already inside the phone frame
  if (!window.matchMedia || !window.matchMedia('(min-width: 768px)').matches) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  if (page === 'phone.html') return; // never frame the frame
  // Carry the query string (e.g. checkout.html?at=…) into the frame's hash.
  location.replace('phone.html#' + page + location.search);
})();
