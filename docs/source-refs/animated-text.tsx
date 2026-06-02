// Moved keyframes to globals.css to avoid re-injecting duplicate \` on every
// \`AnimatedText\` / \`AnimatedFadeIn\` render — with 20+ uses on the homepage that added
// 20+ redundant style blocks (~800B each) to the 98 KB index.html.

interface AnimatedTextProps {
 text: string;
 className?: string;
 delay?: number;
}

export function AnimatedText({ text, className, delay = 0 }: AnimatedTextProps) {
 const words = text.split(" ");

 return (

 {words.map((word, i) => (

 {word}

 ))}

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


{children}


 );
}