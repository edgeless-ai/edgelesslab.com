// Ambient types for js-yaml (present in node_modules as a transitive dep,
// but @types/js-yaml is not installed in this repo). Mirrors the real v4 API
// for the subset the blog loader uses: `load` returns `unknown`, so callers
// must narrow the parsed frontmatter explicitly.
declare module "js-yaml" {
  export interface LoadOptions {
    filename?: string;
    onWarning?: (warning: Error) => void;
    json?: boolean;
  }
  export function load(input: string, options?: LoadOptions): unknown;
}
