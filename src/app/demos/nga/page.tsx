import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NGA Art Analysis Demo | Edgeless Lab',
  description: 'Interactive analysis of 145,000 artworks from the National Gallery of Art — dimensional reduction, color clustering, and curatorial signal extraction.',
};

export const dynamic = 'force-static';

export default function NGADemo() {
  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050505' }}>
      <iframe
        src="/demos/nga/index.html"
        style={{ width: '100%', height: '100%', border: 'none' }}
        title="NGA Art Analysis"
      />
    </main>
  );
}
