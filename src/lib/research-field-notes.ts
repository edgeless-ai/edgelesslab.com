import { findLiaLongformSource } from "./lia-longform-source.mjs";

// Long-form research notes outside the interactive creative-demo inventory.
// Archive DOM, structured data, sitemap, and agent index consume this registry.
export const researchFieldNotes = [{
  title: "Building an Instrument That Can Say No",
  href: "/lia/building-an-instrument-that-can-say-no/",
  description: "A research-method field note about reading artifacts without turning a pattern into an unsupported story.",
  date: "2026-11-18",
  section: "Latent Information Archaeology",
  kind: "methodological field note",
}, ...(findLiaLongformSource() ? [{
  title: "Latent Information Archaeology",
  href: "/lia/read/",
  description: "The long-form expansion of the founding text, with case studies, an excavation method, and a research agenda.",
  date: "2026-11-27",
  section: "Latent Information Archaeology",
  kind: "long-form field note",
}] : [])];
