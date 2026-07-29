const SUBTITLE =
  "Free references and paid toolkits extracted from systems used inside the lab. Start with the open material, then choose a deeper implementation only when it solves a real problem.";

export function ProductsSubtitle() {
  return (
    <p className="text-lg leading-8" style={{ color: "var(--text-secondary)" }}>
      {SUBTITLE}
    </p>
  );
}
