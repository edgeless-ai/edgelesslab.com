"use client";

import { useState, FormEvent } from "react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const subject = encodeURIComponent("Subscribe to Edgeless Lab updates");
    const body = encodeURIComponent(`Please add me to the newsletter: ${email}`);
    window.location.href = `mailto:david@edgelesslab.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 h-10 px-4 rounded-lg bg-transparent border text-sm outline-none focus:border-white/30 transition-colors"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <button
          type="submit"
          className="h-10 px-5 text-sm font-medium rounded-lg transition-all hover:brightness-110 shrink-0"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          Subscribe
        </button>
      </form>
      {submitted && (
        <p className="mt-3 text-xs font-mono" style={{ color: "var(--green)" }}>
          Thanks — your email client will open to confirm.
        </p>
      )}
    </>
  );
}
