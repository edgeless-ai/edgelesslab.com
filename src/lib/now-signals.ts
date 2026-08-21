import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

function readYamlDates(content: string): string[] {
  return (content.match(/date:\s*"([^"]+)"/g) || []).map((m) =>
    m.replace(/^.*"([^"]+)".*$/, "$1")
  );
}

function newestDate(content: string): string | null {
  const dates = readYamlDates(content);
  return dates.length ? dates.reduce<string>((a, b) => (b > a ? b : a), dates[0]) : null;
}

function newestFileDate(filename: string): string | null {
  const candidates = [
    path.join(process.cwd(), "src/lib", filename),
    path.join(process.cwd(), "lib", filename),
    path.join(BLOG_DIR, filename),
  ];
  let best: string | null = null;
  for (const file of Array.from(new Set(candidates))) {
    if (!fs.existsSync(file)) continue;
    const date = newestDate(fs.readFileSync(file, "utf8"));
    if (!date) continue;
    if (best === null || date > best) best = date;
  }
  return best;
}

function statBirthMs(file: string): number | null {
  try {
    const st = fs.statSync(file);
    const ms = typeof st.birthtimeMs === "number" ? st.birthtimeMs : new Date(st.birthtime).getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch {
    return null;
  }
}

function gitHeadCommitMs(): number | null {
  try {
    const head = path.join(process.cwd(), ".git", "HEAD");
    if (!fs.existsSync(head)) return null;
    const headContent = fs.readFileSync(head, "utf8").trim();
    const refMatch = headContent.match(/^ref:\s*(.+)/);
    if (!refMatch) return null;
    const refPath = path.join(process.cwd(), ".git", refMatch[1].trim());
    if (!fs.existsSync(refPath)) return null;
    const sha = fs.readFileSync(refPath, "utf8").trim();
    if (!/^[0-9a-f]{7,40}$/.test(sha)) return null;
    const objectPath = path.join(process.cwd(), ".git", "objects", sha.slice(0, 2), sha.slice(2));
    if (!fs.existsSync(objectPath)) return null;
    return statBirthMs(objectPath);
  } catch {
    return null;
  }
}

function resolveUptimeStartMs(): number {
  const candidates = [
    path.join(process.cwd(), ".git", "objects"),
    path.join(process.cwd(), ".git", "HEAD"),
    path.join(process.cwd(), "Dockerfile"),
    path.join(process.cwd(), "package.json"),
    path.join(process.cwd(), "pnpm-lock.yaml"),
    path.join(process.cwd(), "package-lock.json"),
  ];
  const found = candidates.map(statBirthMs).filter((ms): ms is number => ms !== null);
  if (!found.length) return Date.now() - 912 * 24 * 60 * 60 * 1000;
  const oldest = Math.min(...found);
  const head = gitHeadCommitMs();
  if (head !== null && head < oldest) return head;
  return oldest;
}

export function uptime(): string {
  const start = new Date(resolveUptimeStartMs());
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return `${days}d ${hours}h`;
}

function collectPostDates(content: string): string[] {
  return readYamlDates(content);
}

function latestPostDateFromContent(content: string): string | null {
  const dates = collectPostDates(content);
  return dates.length ? dates.reduce<string>((a, b) => (b > a ? b : a), dates[0]) : null;
}

function latestPostDateFromFile(file: string): string | null {
  try {
    return latestPostDateFromContent(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function latestMdxDate(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let best: string | null = null;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".mdx")) continue;
    const date = latestPostDateFromFile(path.join(dir, entry.name));
    if (!date) continue;
    if (best === null || date > best) best = date;
  }
  return best;
}

export function lastPostAge(label: string): string {
  const fileCandidates = [
    path.join(process.cwd(), "content/blog"),
    path.join(process.cwd(), "blog"),
    BLOG_DIR,
  ];
  let best: string | null = newestFileDate("blog-new-posts.ts") ?? newestFileDate("blog.ts");
  for (const dir of Array.from(new Set(fileCandidates))) {
    if (!fs.existsSync(dir)) continue;
    const date = latestMdxDate(dir);
    if (!date) continue;
    if (best === null || date > best) best = date;
  }
  const today = new Date(new Date().toISOString().slice(0, 10));
  const postDay = new Date(`${best ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.round((today.getTime() - postDay.getTime()) / 86400000);
  if (days <= 0) return `${label}: today`;
  if (days === 1) return `${label}: 1d ago`;
  return `${label}: ${days}d ago`;
}
