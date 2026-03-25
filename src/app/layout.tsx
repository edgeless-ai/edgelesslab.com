import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import { PostHogProvider } from "@/components/posthog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://edgelesslab.com'),
  title: {
    default: 'Edgeless Labs - Tools for AI-Native Developers',
    template: '%s | Edgeless Labs',
  },
  description: 'Creative technology lab building AI agents, MCP servers, generative art pipelines, and developer tools. One-person studio shipping production infrastructure.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://edgelesslab.com',
    siteName: 'Edgeless Labs',
    title: 'Edgeless Labs - Tools for AI-Native Developers',
    description: 'AI agents, MCP servers, generative art, and developer tools built by a solo creative technology lab.',
    images: [{
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'Edgeless Labs - Tools for AI-Native Developers',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Edgeless Labs - Tools for AI-Native Developers',
    description: 'AI agents, MCP servers, generative art, and developer tools.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://edgelesslab.com',
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
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' us.i.posthog.com; connect-src 'self' us.i.posthog.com; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; font-src 'self' fonts.gstatic.com;" />
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
        <meta httpEquiv="Permissions-Policy" content="camera=(), microphone=(), geolocation=()" />
        <link rel="preconnect" href="https://us.i.posthog.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://edgelessai.gumroad.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://github.com" />
      </head>
      <body className="min-h-full flex flex-col">
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Edgeless Labs",
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
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
