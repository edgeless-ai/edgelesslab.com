/** Two visible desktop rows fit; never preload a third row of runtimes. */
export const MAX_MARIMO_PREVIEWS = 6;
export const PREVIEW_SETTLE_MS = 200;

export interface PreviewCandidate {
  id: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Prefer the most visible previews, then the row nearest the viewport center. */
export function admitMarimoPreviews(
  candidates: PreviewCandidate[],
  width: number,
  height: number,
): string[] {
  return candidates
    .map((candidate, order) => {
      const visibleHeight = Math.max(0, Math.min(candidate.bottom, height) - Math.max(candidate.top, 0));
      const visibleWidth = Math.max(0, Math.min(candidate.right, width) - Math.max(candidate.left, 0));
      const area = (candidate.bottom - candidate.top) * (candidate.right - candidate.left);
      return {
        id: candidate.id,
        ratio: area > 0 ? visibleHeight * visibleWidth / area : 0,
        distance: Math.abs((candidate.top + candidate.bottom) / 2 - height / 2),
        order,
      };
    })
    .filter((candidate) => candidate.ratio > 0)
    .sort((a, b) => b.ratio - a.ratio || a.distance - b.distance || a.order - b.order)
    .slice(0, MAX_MARIMO_PREVIEWS)
    .map((candidate) => candidate.id);
}
