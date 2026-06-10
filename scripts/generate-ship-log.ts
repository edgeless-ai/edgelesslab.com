import fs from "fs";
import path from "path";

interface ShipItem {
  id: string;
  kind: "pr" | "paperclip" | "post" | "commit";
  date: string;
  title: string;
  href: string;
  meta: string;
  kindLabel: string;
}

const items: ShipItem[] = [
  {
    id: "dashboard-v1",
    kind: "post",
    date: new Date().toISOString().slice(0, 10),
    title: "Add living content dashboard to edgelesslab.com",
    href: "/blog/living-content-dashboard",
    meta: "EDGA-8210",
    kindLabel: "launch",
  },
  {
    id: "commerce-core-2026-06-05",
    kind: "commit",
    date: new Date().toISOString().slice(0, 10),
    title: "Add commerce product listing + checkout state to homepage flow",
    href: "https://github.com/edgeless-ai/edgelesslab.com/commit/HEAD",
    meta: "dev",
    kindLabel: "commit",
  },
];

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  commitsSince: "2026-06-01",
  items,
};

const outPath = path.join(process.cwd(), "public", "ship-log.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`Wrote ${outPath}`);
