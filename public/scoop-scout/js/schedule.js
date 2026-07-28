/* Scoop Scout — shared daily truck schedule + current-stop computation.
   Single source of truth for map.html and checkout.html. */
(function () {
  'use strict';

  /* Demo day schedule (repeats daily so the tracker is always live).
     The truck parks at events like a food truck; it is not continuously driving.
     Real N/NE Portland venues with real coordinates. */
  var SCHEDULE = [
    { name: 'Overlook Park Farmers Market',  lat: 45.5482, lng: -122.6846, start: 9 * 60,       end: 11 * 60 + 30, note: 'Morning-market crowd favorite' },
    { name: 'Dawson Park Pop-Up',            lat: 45.5444, lng: -122.6672, start: 12 * 60,      end: 13 * 60 + 45, note: 'Lunch scoops by the gazebo' },
    { name: 'Alberta Arts Street Fair',      lat: 45.5590, lng: -122.6449, start: 14 * 60 + 15, end: 17 * 60 + 30, note: 'NE Alberta St & 20th Ave' },
    { name: 'Peninsula Park Summer Concert', lat: 45.5672, lng: -122.6721, start: 18 * 60,      end: 19 * 60 + 30, note: 'Concerts-in-the-park series' },
    { name: 'Mississippi Ave Home Base',     lat: 45.5508, lng: -122.6757, start: 20 * 60,      end: 22 * 60,      note: 'Evening scoops outside the shop' }
  ];
  var HOME = SCHEDULE.length - 1; // the truck sleeps at home base

  /* Deterministic truck state from the clock: same minute-of-day => same
     state for every viewer. Returns either { parked, next, overnight } or
     { transit: {from, to, progress}, next }. */
  function truckState(m) {
    for (var i = 0; i < SCHEDULE.length; i++) {
      if (m >= SCHEDULE[i].start && m < SCHEDULE[i].end) {
        return { parked: SCHEDULE[i], next: SCHEDULE[(i + 1) % SCHEDULE.length], overnight: false };
      }
    }
    // Between windows: a short hop to the next stop…
    for (var j = 0; j < SCHEDULE.length - 1; j++) {
      if (m >= SCHEDULE[j].end && m < SCHEDULE[j + 1].start) {
        var p = (m - SCHEDULE[j].end) / (SCHEDULE[j + 1].start - SCHEDULE[j].end);
        return { transit: { from: SCHEDULE[j], to: SCHEDULE[j + 1], progress: p }, next: SCHEDULE[j + 1] };
      }
    }
    // …otherwise it's overnight: parked at home base until tomorrow's first stop.
    return { parked: SCHEDULE[HOME], next: SCHEDULE[0], overnight: true };
  }

  function nowMinutes() {
    var d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function fmt(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), mm = min % 60;
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + String(mm).padStart(2, '0') + ' ' + ap;
  }

  function countdown(nowMin, targetMin) {
    var d = (targetMin - nowMin + 1440) % 1440;
    if (d === 0) return 'now';
    var h = Math.floor(d / 60), m = d % 60;
    return 'in ' + (h ? h + 'h ' : '') + m + 'm';
  }

  window.ScoopSchedule = {
    SCHEDULE: SCHEDULE,
    HOME: HOME,
    truckState: truckState,
    nowMinutes: nowMinutes,
    fmt: fmt,
    countdown: countdown
  };
})();
