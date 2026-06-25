// /.well-known/security.txt — RFC 9116 vulnerability disclosure contact.
// Re-rendered at build time, served as text/plain with 1h cache.
// Next.js routes the literal segment after .well-known as a normal route.

export const dynamic = "force-static";

// The disclosure channel moved to a public GitHub issue tracker that any
// security researcher can open (no auth, no rate limit, no PII required).
//
// `Expires` is mandatory per RFC 9116 §2.4. We use the ISO date one year in
// the future from build time. When this expires the file 404s and we rotate
// the policy before then.
const EXPIRES = (() => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  // RFC 3339 / ISO 8601 in UTC, with full date+time as recommended.
  return d.toISOString();
})();

const body = `# Edgeless Lab security disclosure (RFC 9116)
Contact: https://github.com/edgeless-ai/edgelesslab.com/security/advisories/new
Contact: mailto:security@edgelesslab.com
Expires: ${EXPIRES}
Preferred-Languages: en, de
Canonical: https://edgelesslab.com/.well-known/security.txt

# We acknowledge valid reports within 72 hours and aim to ship a fix or
# mitigation within 14 days for high-severity issues. We coordinate disclosure
# timelines with reporters and credit them in the changelog unless asked to stay anonymous.
`;

export async function GET(): Promise<Response> {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
