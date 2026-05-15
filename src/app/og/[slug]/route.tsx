import { ImageResponse } from "next/og";
import { posts } from "@/lib/blog";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamicParams = false;

export async function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

// Load fonts synchronously from public directory for static export compatibility
function loadFont(filename: string): ArrayBuffer {
  const fontPath = join(process.cwd(), "public", "pen-plotter", "assets", "fonts", filename);
  return readFileSync(fontPath).buffer;
}

// Color palette per tag category
const TAG_COLORS: Record<string, string> = {
  "AI Agents": "#00e5ff",
  "Automation": "#00e5ff",
  "Edgeless": "#a855f7",
  "Design": "#a855f7",
  "AI": "#00e5ff",
  "Machine Learning": "#22c55e",
  "LLMs": "#22c55e",
  "Agents": "#00e5ff",
  "Trading": "#f59e0b",
  "Finance": "#f59e0b",
  "Productivity": "#ec4899",
  "Knowledge": "#ec4899",
  "Self-Improvement": "#ec4899",
  "Knowledge Management": "#ec4899",
  "Rust": "#f97316",
  "Web": "#a855f7",
};

function getAccentColor(tags: string[]): string {
  for (const tag of tags) {
    if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  }
  return "#00e5ff"; // default cyan
}

function wordWrap(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars && current) {
      lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // max 3 lines for title
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);

  if (!post) {
    return new Response("Post not found", { status: 404 });
  }

  const accent = getAccentColor(post.tags);
  const titleLines = wordWrap(post.title, 42);

  const boskaMediumData = loadFont("Boska-Medium.ttf");
  const jetbrainsMonoData = loadFont("JetBrainsMono-Regular.ttf");

  const description =
    post.description.length > 120
      ? post.description.slice(0, 117) + "..."
      : post.description;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: '"Boska"',
          padding: "60px",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />

        {/* Decorative grid pattern */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "40%",
            height: "100%",
            opacity: 0.03,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Site header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12", marginBottom: "40" }}>
          <div
            style={{
              width: "36",
              height: "36",
              borderRadius: "50%",
              background: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20",
              fontWeight: 700,
              color: "#0a0a0f",
            }}
          >
            E
          </div>
          <span
            style={{
              fontFamily: '"JetBrainsMono"',
              fontSize: "18",
              color: "#888",
              letterSpacing: "0.05em",
            }}
          >
            edgelesslab.com
          </span>
        </div>

        {/* Title */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {titleLines.map((line, i) => (
            <div
              key={i}
              style={{
                fontSize: line.length > 35 ? 48 : 54,
                fontWeight: 500,
                lineHeight: 1.2,
                color: "#f5f5f5",
                marginBottom: titleLines.length > 1 ? "4" : "0",
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "22",
            color: "#888",
            fontFamily: '"Boska"',
            lineHeight: 1.4,
            marginBottom: "30",
            maxWidth: "90%",
          }}
        >
          {description}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: "10", flexWrap: "wrap" }}>
          {post.tags.slice(0, 3).map((tag) => {
            const tagColor = TAG_COLORS[tag] || accent;
            return (
              <div
                key={tag}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "6px 14px",
                  borderRadius: "6",
                  border: `1px solid ${tagColor}40`,
                  backgroundColor: `${tagColor}15`,
                }}
              >
                <span
                  style={{
                    fontFamily: '"JetBrainsMono"',
                    fontSize: "14",
                    color: tagColor,
                    letterSpacing: "0.03em",
                  }}
                >
                  {tag}
                </span>
              </div>
            );
          })}
        </div>

        {/* Date + read time */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "16",
            fontFamily: '"JetBrainsMono"',
            fontSize: "14",
            color: "#555",
          }}
        >
          <span>
            {new Date(post.date + "T00:00:00").toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
          <span>{post.readTime}</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Boska", data: boskaMediumData, style: "normal", weight: 500 },
        { name: "JetBrainsMono", data: jetbrainsMonoData, style: "normal", weight: 400 },
      ],
    }
  );
}
