// Moved keyframes to globals.css to avoid re-injecting duplicate <style> per mount.
// This file previously injected `<style>@keyframes fadeInUp{...}</style>` on every
// `AnimatedText` / `AnimatedFadeIn` render — with 20+ uses on the homepage that added
// 20+ redundant style blocks (~800B each) to the 98 KB index.html.

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function AnimatedText({ text, className, delay = 0 }: AnimatedTextProps) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block mr-[0.25em]"
          style={{
            animation: `fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) ${delay + i * 0.08}s both`,
          }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

export function AnimatedFadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={className}
      style={{
        animation: `fadeInUpSimple 0.6s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
      }}
    >
      {children}
    </div>
  );
}
