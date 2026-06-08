#!/usr/bin/env python3
"""Generate blog-meta.ts from blog.ts by stripping content fields."""

import re
import pathlib

ROOT = pathlib.Path("/Users/djm/claude-projects/edgeless-website/src/lib")
BLOG = ROOT / "blog.ts"
META = ROOT / "blog-meta.ts"

content = BLOG.read_text()

def strip_content(text: str) -> str:
    result = []
    i = 0
    while i < len(text):
        match = re.search(r'content:\s*`', text[i:])
        if not match:
            result.append(text[i:])
            break
        start = i + match.start()
        result.append(text[i:start])
        # Find the end of the template literal (unescaped backtick)
        j = start + match.end()  # position after opening backtick
        while j < len(text):
            if text[j] == '`' and text[j-1] != '\\':
                # Found closing backtick that is not escaped
                # Consume optional .trim() after the closing backtick
                k = j + 1
                while k < len(text) and text[k].isspace():
                    k += 1
                if k < len(text) and text[k:k+7] == '.trim()':
                    k += 7
                    # Consume optional trailing comma after .trim()
                    while k < len(text) and text[k].isspace():
                        k += 1
                    if k < len(text) and text[k] == ',':
                        k += 1
                # Also consume any trailing comma directly after backtick
                elif k < len(text) and text[k] == ',':
                    k += 1
                result.append('content: "",')
                i = k
                break
            j += 1
        else:
            # No closing backtick found
            result.append(text[start:])
            i = len(text)
            break
    return "".join(result)

stripped = strip_content(content)

# Source the shared type from blog-types.ts (single source of truth) rather than
# redeclaring the interface. blog.ts imports + re-exports BlogPost; mirror that
# here as BlogPostMeta (a structural alias defined in blog-types.ts).
stripped = stripped.replace(
    'import type { BlogPost } from "./blog-types";',
    'import type { BlogPostMeta } from "./blog-types";',
)
stripped = stripped.replace("export type { BlogPost };", "export type { BlogPostMeta };")
stripped = stripped.replace("export const posts: BlogPost[]", "export const postsMeta: BlogPostMeta[]")

# Remove the blog-new-posts import (meta is derived from blog.ts only) and the
# trailing `...newPosts` spread that referenced it.
stripped = re.sub(r'^import \{ newPosts \} from "\.\/blog-new-posts";\n', '', stripped, flags=re.MULTILINE)
stripped = re.sub(r'^\s*\.\.\.newPosts.*\n', '', stripped, flags=re.MULTILINE)

META.write_text(stripped)
print(f"Generated {META} ({len(stripped)} bytes)")
print(f"Original {BLOG} ({len(content)} bytes)")
print(f"Reduction: {len(content) - len(stripped)} bytes ({(len(content) - len(stripped)) / len(content) * 100:.1f}%)")
