/**
 * SQLite-backed task queue with lease-based claiming.
 *
 * Prevents double-processing: when an agent claims a task, it gets a lease
 * that expires after a configurable duration. If the agent crashes before
 * completing, the lease expires and another agent can pick up the task.
 */

import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type {
  TaskDefinition,
  TaskRecord,
  TaskStatus,
  QueueStats,
} from "./types.js";

const DEFAULT_LEASE_MS = 300_000; // 5 minutes
const DEFAULT_MAX_ATTEMPTS = 3;

export class TaskQueue {
  private db: Database.Database;

  constructor(dbPath: string = "tasks.db") {
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("busy_timeout = 5000");
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        priority INTEGER NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'PENDING',
        claimed_by TEXT,
        claimed_at TEXT,
        started_at TEXT,
        completed_at TEXT,
        result TEXT,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT ${DEFAULT_MAX_ATTEMPTS},
        lease_expires_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
    `);
  }

  /** Add a new task to the queue. */
  enqueue(task: TaskDefinition): string {
    const id = task.id || randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO tasks (id, type, title, description, payload, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
      )
      .run(
        id,
        task.type,
        task.title,
        task.description,
        JSON.stringify(task.payload),
        task.priority,
        now,
        now
      );

    return id;
  }

  /**
   * Claim the highest-priority pending task of a given type.
   * Returns null if no tasks are available.
   * Uses a lease to prevent double-processing.
   */
  claim(
    agentName: string,
    taskType?: string,
    leaseMs: number = DEFAULT_LEASE_MS
  ): TaskRecord | null {
    const now = new Date().toISOString();
    const leaseExpiry = new Date(Date.now() + leaseMs).toISOString();

    // First, expire any stale leases
    this.db
      .prepare(
        `UPDATE tasks SET status = 'PENDING', claimed_by = NULL, claimed_at = NULL, lease_expires_at = NULL, updated_at = ?
       WHERE status = 'CLAIMED' AND lease_expires_at < ?`
      )
      .run(now, now);

    // Claim the highest-priority pending task (lowest priority number)
    const typeFilter = taskType ? `AND type = ?` : "";
    const params: unknown[] = ["CLAIMED", agentName, now, leaseExpiry, now, now];
    if (taskType) params.push(taskType);

    const result = this.db
      .prepare(
        `UPDATE tasks SET status = ?, claimed_by = ?, claimed_at = ?, lease_expires_at = ?, updated_at = ?
       WHERE id = (
         SELECT id FROM tasks
         WHERE status = 'PENDING' AND attempts < max_attempts ${typeFilter}
         ORDER BY priority ASC, created_at ASC
         LIMIT 1
       )
       RETURNING *`
      )
      .get(...params) as TaskRecord | undefined;

    return result ?? null;
  }

  /** Mark a claimed task as actively running. */
  markRunning(taskId: string): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE tasks SET status = 'RUNNING', started_at = ?, attempts = attempts + 1, updated_at = ?
       WHERE id = ? AND status = 'CLAIMED'`
      )
      .run(now, now, taskId);
  }

  /** Mark a task as completed with its result. */
  complete(taskId: string, result: unknown): void {
    const now = new Date().toISOString();
    this.db
      .prepare(
        `UPDATE tasks SET status = 'COMPLETED', result = ?, completed_at = ?, lease_expires_at = NULL, updated_at = ?
       WHERE id = ? AND status = 'RUNNING'`
      )
      .run(JSON.stringify(result), now, now, taskId);
  }

  /** Mark a task as failed. If under max attempts, it returns to PENDING. */
  fail(taskId: string, error: string): void {
    const now = new Date().toISOString();
    const task = this.get(taskId);
    if (!task) return;

    const nextStatus: TaskStatus =
      task.attempts + 1 >= task.maxAttempts ? "FAILED" : "PENDING";

    this.db
      .prepare(
        `UPDATE tasks SET status = ?, result = ?, claimed_by = NULL, claimed_at = NULL,
       lease_expires_at = NULL, updated_at = ?
       WHERE id = ?`
      )
      .run(nextStatus, JSON.stringify({ error }), now, taskId);
  }

  /** Get a single task by ID. */
  get(taskId: string): TaskRecord | null {
    const row = this.db
      .prepare("SELECT * FROM tasks WHERE id = ?")
      .get(taskId) as TaskRecord | undefined;
    return row ?? null;
  }

  /** Get queue statistics. */
  stats(): QueueStats {
    const rows = this.db
      .prepare(
        "SELECT status, COUNT(*) as count FROM tasks GROUP BY status"
      )
      .all() as Array<{ status: TaskStatus; count: number }>;

    const counts: QueueStats = {
      pending: 0,
      claimed: 0,
      running: 0,
      completed: 0,
      failed: 0,
      total: 0,
    };

    for (const row of rows) {
      const key = row.status.toLowerCase() as keyof Omit<QueueStats, "total">;
      counts[key] = row.count;
      counts.total += row.count;
    }

    return counts;
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }
}
