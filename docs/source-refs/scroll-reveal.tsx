"use client";

import { useInView } from "@/hooks/use-in-view";

interface ScrollRevealProps {
 children: React.ReactNode;
 className?: string;
 delay?: number;
}

export function ScrollReveal({ children, className = "", delay = 0 }: ScrollRevealProps) {
 const \[ref, inView\] = useInView(0.12);

 return (


{children}


 );
}