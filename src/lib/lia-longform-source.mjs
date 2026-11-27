import { statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const manuscript = "projects/latent-information-archaeology/docs/longform-v2/lia-longform-v2.md";

export function findLiaLongformSource() {
  const configured = process.env.LIA_LONGFORM_SOURCE;
  if (configured) {
    const source = resolve(configured);
    if (!statSync(source, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`LIA_LONGFORM_SOURCE must be a Markdown file: ${source}`);
    }
    return source;
  }

  const vendoredFirst = resolve("content/lia/lia-longform-v2.md");
  if (statSync(vendoredFirst, { throwIfNoEntry: false })?.isFile()) return vendoredFirst;

  for (let workspace = resolve(); dirname(workspace) !== workspace; workspace = dirname(workspace)) {
    const source = join(workspace, manuscript);
    if (statSync(source, { throwIfNoEntry: false })?.isFile()) return source;
  }
  const vendored = resolve("content/lia/lia-longform-v2.md");
  if (statSync(vendored, { throwIfNoEntry: false })?.isFile()) return vendored;
  return undefined;
}
