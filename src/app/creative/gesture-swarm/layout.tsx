import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Gesture Swarm';
const description =
  'An interactive multi-armed bandit visualization: steer a swarm of exploring agents and watch exploration versus exploitation resolve in real time.';
const url = 'https://edgelesslab.com/creative/gesture-swarm/';

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url, type: 'website' },
  twitter: { card: 'summary_large_image', title, description },
  alternates: { canonical: url },
};

export default function GestureSwarmLayout({ children }: { children: ReactNode }) {
  return children;
}
