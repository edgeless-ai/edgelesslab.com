import manifest from "../../../../public/tldraw/3.15.6/manifest.json";

// Keep fonts same-origin under font-src 'self', including SDK image preloads.
export const specimenAssetUrls = {
  translations: { en: `/tldraw/${manifest.version}/translations/en.json` },
  icons: manifest.icons,
  embedIcons: manifest.embedIcons,
  fonts: Object.fromEntries(
    Object.entries(manifest.fonts).map(([key, asset]) => [key, asset.url]),
  ),
};
