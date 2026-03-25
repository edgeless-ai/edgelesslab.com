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
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
      `}</style>
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
      <style>{`
        @keyframes fadeInUpSimple {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
