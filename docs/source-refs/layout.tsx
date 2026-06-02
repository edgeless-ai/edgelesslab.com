import type { Metadata } from "next";
import { Geist, Geist\_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import { PostHogProvider } from "@/components/posthog-provider";
import { PerformancePreload } from "@/components/performance-preload";

const geistSans = Geist({
 variable: "--font-geist-sans",
 subsets: \["latin"\],
});

const geistMono = Geist\_Mono({
 variable: "--font-geist-mono",
 subsets: \["latin"\],
});

export const metadata: Metadata = {
 metadataBase: new URL('https://edgelesslab.com'),
 title: {
 default: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
 template: '%s \| Edgeless Lab',
 },
 description: 'One person shipping autonomous agents, generative art, and developer tools. Built in production, released in the open.',
 openGraph: {
 type: 'website',
 locale: 'en\_US',
 url: 'https://edgelesslab.com',
 siteName: 'Edgeless Lab',
 title: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
 description: 'One person shipping autonomous agents, generative art, and developer tools. Built in production, released in the open.',
 images: \[{\
 url: '/og-image.webp',\
 width: 1200,\
 height: 630,\
 alt: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',\
 }\],
 },
 twitter: {
 card: 'summary\_large\_image',
 title: 'Edgeless Lab - AI Agents, Generative Art, Developer Tools',
 description: 'One person shipping autonomous agents, generative art, and developer tools.',
 images: \['/og-image.webp'\],
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







 {/\\* Preconnect hints moved to PerformancePreload component for centralized management \*/}


 [Skip to main content](https://raw.githubusercontent.com/edgeless-ai/edgelesslab.com/main/src/app/layout.tsx#main-content)
 {children}



 );
}