export interface DailyRow {
  day: string;
  runs: number;
  crashed: number;
  done: number;
}

export interface DailySnapshot {
  schemaVersion: 1;
  source: string;
  observedAt: string;
  query: string;
  cohort: string;
  rows: DailyRow[];
}

const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseDailySnapshot(input: unknown): DailySnapshot {
  if (!input || typeof input !== "object") throw new Error("Snapshot is missing.");
  const data = input as Record<string, unknown>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.rows) || data.rows.length === 0 ||
    ![data.source, data.observedAt, data.query, data.cohort].every((value) => typeof value === "string" && value.length > 0)) {
    throw new Error("Snapshot metadata or rows are invalid.");
  }
  let previous = "";
  for (const item of data.rows) {
    const row = item as DailyRow;
    if (!item || typeof item !== "object" || !dayPattern.test(row.day) ||
      Number.isNaN(Date.parse(`${row.day}T00:00:00Z`)) ||
      new Date(`${row.day}T00:00:00Z`).toISOString().slice(0, 10) !== row.day || row.day <= previous ||
      ![row.runs, row.crashed, row.done].every((count) => Number.isSafeInteger(count) && count >= 0) ||
      row.runs === 0 || row.crashed + row.done > row.runs) {
      throw new Error("Snapshot contains an invalid daily aggregate.");
    }
    previous = row.day;
  }
  return data as unknown as DailySnapshot;
}

export function crashShare(row: DailyRow): number {
  return row.crashed / row.runs;
}

export function chartPath(rows: DailyRow[], selected: number): string {
  return rows.slice(0, selected + 1).map((row, index) => {
    const x = 48 + (index * 448) / Math.max(1, rows.length - 1);
    const y = 224 - crashShare(row) * 184;
    return `${index ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(" ");
}
