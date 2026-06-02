"use client";

import dynamic from "next/dynamic";

interface TechShowcaseProps {
  nodes: Array<{
    label: string;
    sublabel: string;
    color: string;
  }>;
  experiments: Array<{
    title: string;
    category: string;
    href: string;
    external: boolean;
    description: string;
    stack: string[];
    status: string;
  }>;
}

const TechShowcase = dynamic(
  () =>
    import("@/components/home-client").then((m) => {
      const Component: React.FC<TechShowcaseProps> = ({
        nodes,
        experiments,
      }) => (
        <>
          <m.StackFlow nodes={nodes} />
          <m.ExperimentsGrid experiments={experiments} />
        </>
      );
      return { default: Component };
    }),
  { ssr: false }
);

export default TechShowcase;
