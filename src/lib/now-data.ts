export type Ship = {
  id: string;
  title: string;
  source: string;
  completed?: string;
  url?: string;
};

export type FleetAgent = {
  name: string;
  status: string;
  role: string;
};

export type RecentWork = {
  id: string;
  title: string;
  priority: string;
  updated: string;
  agent?: string;
};

export type NowData = {
  generated_at: string;
  summary: {
    total_agents: number;
    agents_active: number;
    agents_idle: number;
    agents_error: number;
    health_score: number;
  };
  fleet: FleetAgent[];
  ships: Ship[];
  recent_work: RecentWork[];
};

type RawShip = {
  id?: string;
  title?: string;
  source?: string;
  completed?: string;
  url?: string;
};

type RawWork = {
  id?: string;
  title?: string;
  priority?: string;
  updated?: string;
  agent_name?: string;
};

// Read a JSON data file from the filesystem at build time. Under
// `output: 'export'` there is no origin to resolve a relative `fetch('/data/…')`
// against at prerender, so an HTTP fetch throws `Failed to parse URL` and bakes
// empty data into the static HTML. Reading from disk relative to `process.cwd()`
// inlines the real values at build; a missing file falls back to null (same
// graceful behavior as the previous `res.ok ? … : null`).
// Boundary-typed JSON read: the caller declares the expected shape; the single
// `as T` sits at the JSON.parse boundary where the shape of external data is
// asserted (not an `any` escape hatch — callers below stay fully type-checked).
async function readDataFile<T>(name: string): Promise<T | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const filePath = path.join(process.cwd(), 'public', 'data', name);
    return JSON.parse(await fs.readFile(filePath, 'utf-8')) as T;
  } catch {
    return null;
  }
}

export async function getNowData(): Promise<NowData> {
  try {
    const [shipLog, wall] = await Promise.all([
      readDataFile<{ ships?: RawShip[] }>('ship_log.json'),
      readDataFile<{
        recent_work?: RawWork[];
        summary?: Partial<NowData['summary']>;
        metrics?: { health_score?: number };
      }>('content_wall.json'),
    ]);

    const ships: Ship[] = (shipLog?.ships || []).slice(0, 10).map((s: RawShip) => ({
      id: s.id || '',
      title: s.title || '',
      source: s.source || 'paperclip',
      completed: s.completed || undefined,
      url: s.url || undefined,
    }));

    const recentWork: RecentWork[] = (wall?.recent_work || [])
      .slice(0, 30)
      .map((w: RawWork) => ({
        id: w.id || '',
        title: w.title || '',
        priority: w.priority || 'low',
        updated: w.updated || '',
        agent: w.agent_name || undefined,
      }));

    const agentsRaw = new Set<string>();
    ships.forEach((s) => {
      const raw = s.id;
      if (raw && raw.includes('-')) agentsRaw.add(raw.split('-')[1] || raw);
    });

    const names: Record<string, string> = {
      '0b779ab3': 'Anomaly',
      '575260e2': 'Beau',
      '97898794': 'Edgeless CC',
      '7778155c': 'Kilo',
      '7f8aa3c8': 'Scribe',
    };

    const fleet: FleetAgent[] = Array.from(agentsRaw).slice(0, 10).map((k) => ({
      name: names[k] || `agent-${k}`,
      status: 'active',
      role: 'worker',
    }));

    const summary = wall?.summary || {};
    const health = wall?.metrics?.health_score ?? 0;

    return {
      generated_at: new Date().toISOString(),
      summary: {
        total_agents: summary.total_agents || fleet.length || 0,
        agents_active: summary.agents_active || 0,
        agents_idle: summary.agents_idle || 0,
        agents_error: summary.agents_error || 0,
        health_score: Math.min(100, Math.max(0, health || 0)),
      },
      fleet,
      ships,
      recent_work: recentWork,
    };
  } catch (error) {
    return {
      generated_at: new Date().toISOString(),
      summary: {
        total_agents: 0,
        agents_active: 0,
        agents_idle: 0,
        agents_error: 0,
        health_score: 0,
      },
      fleet: [],
      ships: [],
      recent_work: [],
    } as NowData;
  }
}
