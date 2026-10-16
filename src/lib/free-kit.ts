// Direct zero-price checkout skips Gumroad's pay-what-you-want product-page prompt.
export const FREE_KIT_URL = "https://edgelessai.gumroad.com/l/edgeless-free-kit?wanted=true&price=0&utm_source=edgelesslab&utm_medium=website&utm_campaign=free_kit&utm_content=products_hero";

export const freeKitContents = [
  { name: "CLAUDE.md Template Pack", description: "Project instructions you can adapt to your own codebase." },
  { name: "Claude Code Cheat Sheet", description: "A browser-readable command reference." },
  { name: "Quick Reference Cards", description: "Compact references for common development tasks." },
  { name: "The Agent Cookbook", description: "Agent workflow patterns and examples." },
  { name: "AI Code Review Playbook", description: "Checklists and prompts for reviewing changes." },
  { name: "Hooks Library", description: "Hook examples to inspect and adapt." },
  { name: "Claude Code Hooks Deep Dive", description: "A guide to hook design, with example scripts." },
  { name: "Obsidian + Claude Code Setup Kit", description: "Examples for connecting notes with a coding workflow." },
  { name: "MCP Server Starter Kit", description: "Starter code for exploring MCP servers." },
  { name: "Production MCP Server Kit", description: "Server templates and supporting test examples." },
  { name: "n8n AI Workflow Templates", description: "Workflow examples to import into a test instance." },
  { name: "Prompt Testing Framework", description: "Example harnesses for comparing prompt behavior." },
  { name: "The Prompt Engineering OS", description: "The complete team reference edition, included free." },
  { name: "Multi-Agent Orchestration Blueprint", description: "Reference patterns for coordinating agent work." },
  { name: "Autonomous Agent Safety Patterns", description: "Examples of constraints, checks, and safer execution." },
  { name: "Generative Art Starter Kit", description: "Browser sketches and visual experiments." },
  { name: "Digital Product Launch Toolkit", description: "Planning templates and launch checklists." },
] as const;
