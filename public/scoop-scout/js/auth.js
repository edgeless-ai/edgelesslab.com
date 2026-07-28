/* Scoop Scout preview gate — must be the first script on every page except gate.html */
(function () {
  'use strict';
  var HASH = 'a8d60cfe02a79ea93e57df66843c0a8208f7d37a8c111e21f88845c879d8bbf9';
  var ok = false;
  try { ok = localStorage.getItem('ss_auth') === HASH; } catch (e) { ok = false; }
  if (!ok) location.replace('./gate.html');
})();
