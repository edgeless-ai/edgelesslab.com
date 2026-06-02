"use client";

import dynamic from "next/dynamic";

const CTASection = dynamic(
  () =>
    import("@/components/home-client").then((m) => {
      const Component: React.FC = () => (
        <>
          <m.ProductHighlight />
          <m.AboutBlurb />
        </>
      );
      return { default: Component };
    }),
  { ssr: false }
);

export default CTASection;
