# Color Garden

A local, full-screen iPad touch-art app for open-ended play. It has no
accounts, analytics, ads, external assets, or reading required in the child
interface.

## Gestures

- One finger paints ribbons and flow particles.
- A short tap grows a flower.
- Holding a finger grows a larger bloom.
- A fast swipe releases a comet burst.
- Two fingers create a curved bridge.
- Pinching changes the energy and scale of the field.
- Twisting two fingers rotates through the active palette.
- Three fingers shift the color atmosphere and create a bloom.
- Four or more touches create a large burst.

## Parent controls

Hold one finger in each top corner for 2.2 seconds. The parent panel controls
the scene, palette, optional synthesized sound, calm mode, canvas reset, and
full screen.

## Run locally

From this directory:

```bash
python3 -m http.server 4180
```

Open `http://127.0.0.1:4180` on the Mac for testing. To use it on an iPad on
the same Wi-Fi network, replace `127.0.0.1` with the Mac's local network
address.

For a true offline Home Screen install, the app must be served from HTTPS.
The service worker and manifest are already included. A LAN HTTP session is
fine for local play while the Mac server is running, but iPadOS will not grant
offline service-worker storage to an insecure LAN origin.

## Design constraints

- No visible controls during child play.
- No navigation targets or destructive gestures.
- All interaction is forgiving. Gesture thresholds overlap on purpose.
- Audio is off by default.
- Visual density is capped in calm mode.
- The parent gate requires two separated touches held in opposite corners.
