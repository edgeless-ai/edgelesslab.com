/**
 * Etsy listing data for LineFields shop links on edgelesslab.com.
 *
 * Listing IDs verified against the Etsy API / shop LineFields.
 * UTM tags: utm_source=edgelesslab (not etsy — the loop direction).
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
  return `${SHOP_URL}/listing/${id}?${UTM}&utm_content=${page}`;
}

/** Pen plotter originals — shown on /projects/pen-plotter-art/ */
export const PLOTTER_ORIGINALS: EtsyListing[] = [
  {
    id: 4535392785,
    title: "Custom Pen Plotter Commission",
    price: "$375",
    url: listingUrl(4535392785, "pen-plotter-art"),
  },
  {
    id: 4535423190,
    title: "Electric Tartan — Plotter Original",
    price: "$185",
    url: listingUrl(4535423190, "pen-plotter-art"),
  },
  {
    id: 4535410927,
    title: "Jewel Tone — Plotter Original",
    price: "$185",
    url: listingUrl(4535410927, "pen-plotter-art"),
  },
  {
    id: 4535408813,
    title: "Strange Attractor — Plotter Original",
    price: "$165",
    url: listingUrl(4535408813, "pen-plotter-art"),
  },
];

/** Loop packs — shown on /lab/tartanism/ and tartan blog posts */
export const LOOP_PACKS: EtsyListing[] = [
  {
    id: 4535423190,
    title: "Electric Tartan Loop Pack",
    price: "$29",
    url: listingUrl(4535423190, "tartanism"),
  },
  {
    id: 4535410927,
    title: "Jewel Tone Loop Pack",
    price: "$29",
    url: listingUrl(4535410927, "tartanism"),
  },
];

/** Shop link — shown on /products/ and shop.edgelesslab.com */
export const SHOP_LINK = {
  url: `${SHOP_URL}?${UTM}&utm_content=products-page`,
  title: "LineFields on Etsy",
};