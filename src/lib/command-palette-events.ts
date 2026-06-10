// Global event bus for opening the command palette
// Used by Nav button to trigger CommandPalette without prop drilling

const COMMAND_PALETTE_EVENT = "edgeless:open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

export function onOpenCommandPalette(handler: () => void) {
  const wrapped = () => handler();
  window.addEventListener(COMMAND_PALETTE_EVENT, wrapped);
  return () => window.removeEventListener(COMMAND_PALETTE_EVENT, wrapped);
}
