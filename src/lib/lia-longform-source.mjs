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

  for (let workspace = resolve(); dirname(workspace) !== workspace; workspace = dirname(workspace)) {
    const source = join(workspace, manuscript);
    if (statSync(source, { throwIfNoEntry: false })?.isFile()) return source;
  }
  return undefined;
}
