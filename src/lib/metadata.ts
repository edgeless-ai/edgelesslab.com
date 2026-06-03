import type { Metadata } from "next";

const SITE_URL = "https://edgelesslab.com";
const SITE_NAME = "Edgeless Lab";
const OG_IMAGE = "/og-image.webp";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
};

function absoluteUrl(path: string) {
  // Ensure trailing slash for all pages except root (consistent with next.config trailingSlash: true)
  const canonicalPath = path === '/' ? path : (path.endsWith('/') ? path : `${path}/`);
  return new URL(canonicalPath, SITE_URL).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  keywords = [],
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: {
      absolute: fullTitle,
    },
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [OG_IMAGE],
    },
  };
}
