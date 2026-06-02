import { ArrowRight } from "lucide-react";
import Link from "next/link";
import {
 HeroSection,
 RecentActivity,
 FeaturedGrid,
 CapabilitiesGrid,
 StackFlow,
 ExperimentsGrid,
 ProductHighlight,
 AboutBlurb,
 SubscribeSection,
} from "@/components/home-client";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { experiments, projects } from "@/lib/data";

const featured = \[\
 { slug: "safety-hooks", span: "md:col-span-2 md:row-span-2" },\
 { slug: "mcp-servers", span: "" },\
 { slug: "pen-plotter-art", span: "" },\
\].map(({ slug, span }) => {
 const project = projects.find((item) => item.slug === slug);
 if (!project) {
 throw new Error(\`Missing homepage featured project: ${slug}\`);
 }

 return {
 title: project.title,
 description: project.description,
 tags: project.tags.slice(0, 3),
 snippet: project.snippet,
 href: \`/projects/${project.slug}\`,
 span,
 };
});

const capabilities = \[\
 {\
 label: "Multi-Agent Orchestration",\
 snippet: \`POST /api/agents/router/generate\
{ "messages": \[{ "role": "user",\
 "content": "dispatch research to gemini-1" }\] }\`,\
 },\
 {\
 label: "MCP Tool Servers",\
 snippet: \`server.tool("search", {\
 query: z.string(),\
 collection: z.enum(\["vault", "memory"\])\
})\`,\
 },\
 {\
 label: "Agent Safety Hooks",\
 snippet: \`$ hook: damage-control\
 blocked: rm -rf /\
 reason: destructive operation\
✓ 0 incidents this week\`,\
 },\
 {\
 label: "Knowledge Pipelines",\
 snippet: \`qmd search "agent orchestration"\
 --collection claude-vault\
 --top-k 10 --min-score 0.6\`,\
 },\
\];

const homepageExperiments = \[\
 "strange-attractors",\
 "knowledge-graph",\
 "total-serialism",\
 "tartanism",\
\].map((slug) => {
 const experiment = experiments.find((item) => item.slug === slug);
 if (!experiment) {
 throw new Error(\`Missing homepage experiment: ${slug}\`);
 }

 return {
 title: experiment.title,
 category: experiment.category,
 href: experiment.href ?? \`/lab/${experiment.slug}\`,
 external: Boolean(experiment.href),
 description: experiment.description,
 stack: experiment.stack.slice(0, 3),
 status: experiment.status,
 };
});

const stackNodes = \[\
 { label: "Claude Code", sublabel: "AI agent layer", color: "var(--accent)" },\
 { label: "MCP Servers", sublabel: "tool protocol", color: "var(--accent)" },\
 { label: "ChromaDB", sublabel: "vector memory", color: "var(--green)" },\
 { label: "Obsidian", sublabel: "knowledge vault", color: "var(--green)" },\
 { label: "VPS / Hermes", sublabel: "always-on runtime", color: "var(--green)" },\
\];

export default function Home() {
 return (


 );
}