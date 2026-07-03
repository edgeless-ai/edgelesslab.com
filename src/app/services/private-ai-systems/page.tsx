import { ArrowRight, Check, Cpu, KeyRound, Mail, Server, ShieldCheck, Wrench } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { ServiceCtaLink } from "@/components/service-cta-link";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Private AI Agent Systems",
  description:
    "Custom private AI agent systems for Portland professionals and small businesses. Built around your workflow, using your API keys or local LLMs.",
  path: "/services/private-ai-systems",
  keywords: [
    "private AI agents",
    "Portland AI consultant",
    "local LLM setup",
    "business automation",
    "custom AI workflows",
    "Hermes agents",
  ],
});

const useCases = [
  "Inbox assistants that draft replies, sort leads, and flag urgent items",
  "Overnight research and reporting that lands in your inbox each morning",
  "Content pipelines that turn notes into draft posts, emails, or docs",
  "Private knowledge bases that remember your documents and answer questions",
  "Automations that connect email, calendar, documents, and spreadsheets",
];

const tiers = [
  {
    name: "Diagnostic Session",
    price: "$250-$500",
    scope: "One focused workflow, clear recommendation, lightweight prototype when useful.",
    bestFor: "A first automation, stuck setup, or deciding whether local AI is worth it.",
  },
  {
    name: "Personal Workflow",
    price: "$750-$1,500",
    scope: "One private assistant or automation installed, configured, documented, and handed off.",
    bestFor: "Consultants, creators, solo operators, and high-friction admin work.",
  },
  {
    name: "Small Business Stack",
    price: "$2,500-$6,000",
    scope: "Three to five automations, shared knowledge base, API key setup, team handoff, and training.",
    bestFor: "Agencies, shops, and small teams with repeatable intake, reporting, or operations.",
  },
  {
    name: "Private Hardware Build",
    price: "$3,500+",
    scope: "Local LLM setup on your existing hardware, or sourcing and setup for a dedicated machine.",
    bestFor: "Sensitive data, predictable workloads, GPU hardware, or API-cost control.",
  },
  {
    name: "Custom / Full Service",
    price: "$7,500+",
    scope: "Complex integrations, multi-user environments, dedicated infrastructure, and managed service.",
    bestFor: "Businesses that want the system sourced, deployed, monitored, and improved over time.",
  },
];

const deploymentOptions = [
  {
    title: "Your API Keys",
    icon: KeyRound,
    body: "You keep accounts with OpenAI, Anthropic, or other providers. I wire the system to your keys, recommend the cost-effective model mix, and show you how to monitor usage.",
  },
  {
    title: "Your Local LLM",
    icon: Cpu,
    body: "I can set up a local model on hardware you already own, tune the workflow around its limits, and keep private work off third-party model APIs where practical.",
  },
  {
    title: "Dedicated Hardware",
    icon: Server,
    body: "If you need full service, I can help source the machine, configure the models, connect storage, and document what is running.",
  },
];

const fit = [
  "Consultants drowning in admin and client follow-up",
  "Creators who want to publish more without hiring a VA",
  "Shop or agency owners with repetitive inventory, customer, or reporting work",
  "Operators who tried generic AI tools and need someone to make the real workflow work",
];

export default function PrivateAiSystemsPage() {
  return (
    <div className="flex min-h-full flex-col" style={{ background: "var(--bg-base)" }}>
      <Nav />

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Private AI Agent Systems",
          provider: {
            "@type": "Organization",
            name: "Edgeless Lab",
            url: "https://edgelesslab.com",
          },
          areaServed: "Portland, Oregon",
          description:
            "Custom private AI agent systems and automations using client API keys, local LLMs, or dedicated hardware.",
          offers: tiers.map((tier) => ({
            "@type": "Offer",
            name: tier.name,
            priceSpecification: tier.price,
            description: tier.scope,
          })),
        }}
      />

      <main id="main-content" className="flex-1">
        <section className="px-6 pb-20 pt-36">
          <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start">
            <div>
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1.5"
                style={{
                  borderColor: "rgba(52, 211, 153, 0.28)",
                  background: "rgba(52, 211, 153, 0.07)",
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--green)" }} />
                <span
                  className="font-mono text-[11px] uppercase tracking-[0.14em]"
                  style={{ color: "var(--green)" }}
                >
                  Portland builds - remote available
                </span>
              </div>

              <h1
                className="mb-6 max-w-4xl text-[clamp(2.6rem,7vw,6rem)] font-bold leading-[0.9] tracking-tight"
                style={{ color: "var(--text-primary)" }}
              >
                Private AI systems for work that generic SaaS keeps missing.
              </h1>

              <p className="mb-8 max-w-3xl text-lg leading-8" style={{ color: "var(--text-secondary)" }}>
                I build custom agent systems for professionals and small businesses: private automations
                that run on your machine, your server, or dedicated hardware, using your API keys or local
                LLMs instead of another product dashboard.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <ServiceCtaLink
                  href="mailto:david@edgelesslab.com?subject=Private%20AI%20system"
                  name="private_ai_start_build"
                  className="inline-flex h-11 items-center gap-2 rounded-full border px-5 font-mono text-xs uppercase tracking-[0.1em] transition-all hover:brightness-110"
                  style={{
                    color: "var(--text-primary)",
                    borderColor: "rgba(255,255,255,0.18)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <Mail size={14} />
                  Start a build
                </ServiceCtaLink>
                <a
                  href="#pricing"
                  className="inline-flex h-11 items-center gap-2 rounded-full px-5 font-mono text-xs uppercase tracking-[0.1em] transition-colors hover:text-white"
                  style={{ color: "var(--text-secondary)" }}
                >
                  See pricing
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>

            <aside
              className="rounded-2xl border p-6"
              style={{
                background: "linear-gradient(180deg, rgba(17,17,19,0.98), rgba(9,9,11,0.98))",
                borderColor: "var(--border-subtle)",
              }}
            >
              <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>
                  System shape
                </span>
                <span className="rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: "var(--green)", background: "var(--green-muted)" }}>
                  Owned by you
                </span>
              </div>
              <div className="space-y-4">
                {[
                  ["01", "Private data boundary"],
                  ["02", "Workflow-specific agents"],
                  ["03", "API or local model routing"],
                  ["04", "Documentation and handoff"],
                ].map(([step, label]) => (
                  <div key={step} className="grid grid-cols-[42px_1fr] items-center gap-3">
                    <span className="font-mono text-xs" style={{ color: "var(--accent)" }}>{step}</span>
                    <span className="border-l pl-3 text-sm" style={{ borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-lg border p-4" style={{ borderColor: "rgba(198, 242, 78,0.24)", background: "rgba(198, 242, 78,0.07)" }}>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--accent)" }}>
                  Typical AI usage
                </p>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                  Provider bills are paid directly by you. Many API-backed systems land around $10-$100/month,
                  but local workloads can reduce recurring API spend when the hardware makes sense.
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="px-6 py-16" style={{ background: "var(--bg-surface)" }}>
          <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[320px_1fr]">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Actual work
              </p>
              <h2 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Useful automation, not a chatbot demo.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {useCases.map((item) => (
                <div key={item} className="flex gap-3 rounded-lg border p-4" style={{ borderColor: "var(--border-subtle)", background: "rgba(9,9,11,0.45)" }}>
                  <Check className="mt-0.5 shrink-0" size={16} style={{ color: "var(--green)" }} />
                  <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Deployment
              </p>
              <h2 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                You choose the model boundary.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {deploymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div key={option.title} className="rounded-xl border p-6" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
                    <Icon className="mb-5" size={22} style={{ color: "var(--accent)" }} />
                    <h3 className="mb-3 text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      {option.title}
                    </h3>
                    <p className="text-sm leading-7" style={{ color: "var(--text-secondary)" }}>{option.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 py-20" style={{ background: "var(--bg-surface)" }}>
          <div className="mx-auto max-w-[1280px]">
            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                  Pricing
                </p>
                <h2 className="text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Scoped build fees, no hidden SaaS markup.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6" style={{ color: "var(--text-tertiary)" }}>
                Ranges depend on integrations, data sensitivity, local model requirements, and whether hardware sourcing is included.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {tiers.map((tier) => (
                <article key={tier.name} className="rounded-xl border p-5" style={{ borderColor: "var(--border-subtle)", background: "rgba(9,9,11,0.55)" }}>
                  <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--text-tertiary)" }}>
                    {tier.name}
                  </p>
                  <p className="mb-4 text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                    {tier.price}
                  </p>
                  <p className="mb-4 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{tier.scope}</p>
                  <p className="border-t pt-4 text-xs leading-5" style={{ borderColor: "var(--border-subtle)", color: "var(--text-tertiary)" }}>
                    {tier.bestFor}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_420px]">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: "var(--accent)" }}>
                Fit
              </p>
              <h2 className="mb-6 text-3xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
                Best for people with repeatable work and real data constraints.
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {fit.map((item) => (
                  <div key={item} className="flex gap-3 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                    <ShieldCheck className="mt-0.5 shrink-0" size={16} style={{ color: "var(--green)" }} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border p-6" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
              <Wrench className="mb-5" size={22} style={{ color: "var(--accent)" }} />
              <h3 className="mb-3 text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
                How to start
              </h3>
              <p className="mb-6 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
                Send the task you want to automate, what tools it touches, and whether you prefer API models,
                local models, or a recommendation. I will tell you honestly if it is a fit or if a simpler
                tool is the better answer.
              </p>
              <ServiceCtaLink
                href="mailto:david@edgelesslab.com?subject=Private%20AI%20system&body=What%20I%20want%20to%20automate%3A%0A%0ATools%20involved%3A%0A%0AAPI%20keys%2C%20local%20LLM%2C%20or%20not%20sure%3A%0A"
                name="private_ai_email_workflow"
                className="inline-flex h-11 items-center gap-2 rounded-full border px-5 font-mono text-xs uppercase tracking-[0.1em]"
                style={{
                  color: "var(--green)",
                  borderColor: "rgba(52,211,153,0.35)",
                  background: "rgba(52,211,153,0.08)",
                }}
              >
                Email the workflow
                <ArrowRight size={14} />
              </ServiceCtaLink>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
