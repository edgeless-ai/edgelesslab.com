"use client";

import { useState, type FormEvent } from "react";

const INGEST_URL =
  process.env.NEXT_PUBLIC_INGEST_URL ||
  "https://edgeless-ingest.djm-claude-assistant.workers.dev";

type Status = "idle" | "submitting" | "success" | "error";

export function SubscribeForm({ source = "site" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!email || status === "submitting") return;

    if (company) {
      setStatus("success");
      return;
    }

    setStatus("submitting");
    try {
      const response = await fetch(`${INGEST_URL}?e=newsletter_signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          distinct_id: email,
          source,
          page_url: window.location.href,
          consent: "Edgeless Lab email updates",
        }),
      });

      if (!response.ok) throw new Error("Signup endpoint rejected the request");
      setEmail("");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor={`newsletter-${source}`}>
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          className="h-11 flex-1 border bg-transparent px-4 text-sm outline-none transition-colors"
          style={{
            borderColor: status === "error" ? "var(--oxide)" : "var(--border-focus)",
            color: "var(--text-primary)",
          }}
        />
        <label className="absolute -left-[10000px]" aria-hidden="true">
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={status === "submitting" || status === "success"}
          className="h-11 shrink-0 px-6 text-sm font-medium transition-[filter,opacity] hover:brightness-110 disabled:cursor-default disabled:opacity-70"
          style={{ background: "var(--accent)", color: "var(--accent-contrast)" }}
        >
          {status === "submitting"
            ? "Joining..."
            : status === "success"
              ? "You are on the list"
              : "Get new Field Notes"}
        </button>
      </form>
      <p className="mt-3 text-xs leading-5" style={{ color: "var(--text-tertiary)" }}>
        New Field Notes and useful build reports. No automated sales sequence.
        Unsubscribe by replying.
      </p>
      <p aria-live="polite" className="mt-2 min-h-5 font-mono text-xs">
        {status === "success" && (
          <span style={{ color: "var(--green)" }}>
            Added. The next update will arrive by email.
          </span>
        )}
        {status === "error" && (
          <span style={{ color: "var(--oxide)" }}>
            Signup could not be recorded. Use the RSS feed or email David.
          </span>
        )}
      </p>
    </div>
  );
}
