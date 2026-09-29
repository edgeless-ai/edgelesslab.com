/**
 * LineFields (Etsy) listings linked from edgelesslab.com.
 *
 * Source of truth: Etsy Open API v3, shop 66822827 (claude-projects
 * docs/projects/traffic-1000/etsy-listings-api.json, pulled 2026-09-24).
 * IDs, titles and prices must match that pull; re-pull before editing.
 * UTM: utm_source=edgelesslab (site → Etsy direction), utm_content = page the link sits on.
 */

export interface EtsyListing {
  id: number;
  title: string;
  price: string;
  url: string;
}

const SHOP_URL = "https://www.etsy.com/shop/LineFields";
const UTM = "utm_source=edgelesslab&utm_medium=site&utm_campaign=linefields";

export function listingUrl(id: number, page: string): string {
  return `https://www.etsy.com/listing/${id}?${UTM}&utm_content=${page}`;
}

const listing = (id: number, title: string, price: string, page: string): EtsyListing => ({
  id,
  title,
  price,
  url: listingUrl(id, page),
});

/** 1/1 pen-plotter originals, plotted to order, plus the custom commission. */
export const PLOTTER_ORIGINALS: EtsyListing[] = [
  listing(4535392785, "Custom pen-plotter commission", "$375", "pen-plotter-art"),
  listing(4535308274, "Flow Field No. 262 — original", "$425", "pen-plotter-art"),
  listing(4535296029, "Op Art No. 288 — original", "$345", "pen-plotter-art"),
  listing(4535308176, "Moiré No. 957 — original", "$365", "pen-plotter-art"),
  listing(4535296223, "Molnár Study No. 92 — original", "$325", "pen-plotter-art"),
  listing(4535308352, "LeWitt Field No. 111 — original", "$325", "pen-plotter-art"),
];

/** Seamless tartan video loop packs (digital downloads). */
export const LOOP_PACKS: EtsyListing[] = [
  listing(4535423190, "Electric Tartan Loop Pack", "$18", "tartanism"),
  listing(4535410927, "Jewel Tone Tartan Loop Pack", "$18", "tartanism"),
  listing(4534637127, "Tartan Plaid Loops — 20 videos", "$8.99", "tartanism"),
  listing(4535270298, "Christmas Tartan Loops", "$8.99", "tartanism"),
];

/** Whole-shop link. */
export const SHOP_LINK = {
  url: `${SHOP_URL}?${UTM}&utm_content=shop`,
  title: "LineFields on Etsy",
};
