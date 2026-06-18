import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import { PostHogProvider } from "@/components/posthog-provider";
import { PerformancePreload } from "@/components/performance-preload";
import { CommandPalette } from "@/components/command-palette";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = localFont({
  src: "../fonts/Geist[wght].woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
  preload: true,
  crossOrigin: "anonymous",
});

const geistMono = localFont({
  src: "../fonts/GeistMono[wght].woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  preload: true,
  crossorigin: "anonymous",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://edgelesslab.com'),
  title: {
    default: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
    template: '%s | Edgeless Lab',
  },
  description: 'One person shipping autonomous agents, generative art, and developer tools. Built in production, released in the open.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://edgelesslab.com',
    siteName: 'Edgeless Lab',
    title: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
    description: 'One person shipping autonomous agents, generative art, and developer tools. Built in production, released in the open.',
    images: [
      {
        url: '/og-image.webp',
        width: 1200,
        height: 630,
        alt: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
    description: 'One person shipping autonomous agents, generative art, and developer tools.',
    images: ['/og-image.webp'],
  },
  alternates: {
    canonical: 'https://edgelesslab.com',
    types: {
      'application/rss+xml': 'https://edgelesslab.com/feed.xml',
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <PerformancePreload />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' us.i.posthog.com us-assets.i.posthog.com gumroad.com; connect-src 'self' us.i.posthog.com us-assets.i.posthog.com gumroad.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-src 'self' gumroad.com;" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        {/* Preconnect hints moved to PerformancePreload component for centralized management */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('edgeless-theme');
                  const resolved = theme === 'light' || theme === 'dark' ? theme
                    : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
                  document.documentElement.setAttribute('data-theme', resolved);
                  document.documentElement.style.colorScheme = resolved;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Edgeless Lab",
          "url": "https://edgelesslab.com",
          "description": "Creative technology lab building AI agents, MCP servers, generative art pipelines, and developer tools",
          "founder": {
            "@type": "Person",
            "name": "David Murray"
          },
          "sameAs": [
            "https://github.com/edgeless-ai",
            "https://edgelessai.gumroad.com"
          ]
        }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-full focus:text-sm focus:font-medium focus:text-white"
          style={{ background: "var(--accent)" }}
        >
          Skip to main content
        </a>
        <PostHogProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </PostHogProvider>
        <CommandPalette />
      </body>
    </html>
  );
}
