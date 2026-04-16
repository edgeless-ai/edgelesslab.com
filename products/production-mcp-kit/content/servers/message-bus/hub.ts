/**
 * Message Bus Hub — Central Broker
 *
 * A lightweight HTTP server that routes messages between Claude Code sessions.
 * Uses SQLite for persistence (Bun's built-in driver, zero dependencies).
 *
 * Architecture:
 *   - Mailboxes: permanent per-session storage (survives hub restarts)
 *   - Presence: ephemeral connectivity tracking (pruned after TTL)
 *   - Messages: lease-based delivery with automatic retry
 *
 * Message lifecycle: pending -> leased (on poll) -> acked (confirmed delivery)
 *   If ack fails, lease expires after 30s and message re-enters pending.
 *
 * Run:
 *   bun run hub.ts
 *
 * Environment:
 *   AGENT_BUS_PORT         — HTTP port (default: 9800)
 *   AGENT_BUS_DB           — SQLite path (default: ./message-bus.db)
 *   AGENT_BUS_PRESENCE_TTL_MS — Presence timeout (default: 1800000 = 30min)
 *   AGENT_BUS_LEASE_MS     — Message lease timeout (default: 30000 = 30s)
 */

import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";

const PORT = parseInt(process.env.AGENT_BUS_PORT ?? "9800");
const DB_PATH = process.env.AGENT_BUS_DB ?? "./message-bus.db";
const PRESENCE_TTL = parseInt(process.env.AGENT_BUS_PRESENCE_TTL_MS ?? "1800000");
const LEASE_MS = parseInt(process.env.AGENT_BUS_LEASE_MS ?? "30000");

// Message expiry: direct 24h, broadcast 1h
const DIRECT_EXPIRY_MS = 24 * 60 * 60 * 1000;
const BROADCAST_EXPIRY_MS = 60 * 60 * 1000;

// ─── Database Setup ───

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA busy_timeout=5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS mailboxes (
    name TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS presence (
    name TEXT PRIMARY KEY REFERENCES mailboxes(name),
    connected_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now')),
    connection_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    mailbox TEXT NOT NULL,
    "from" TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    leased_at TEXT,
    leased_by TEXT,
    acked_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_messages_mailbox_status
    ON messages(mailbox, status);
  CREATE INDEX IF NOT EXISTS idx_messages_expires
    ON messages(expires_at);
`);

// ─── Prepared Statements ───

const stmts = {
  ensureMailbox: db.prepare(
    `INSERT OR IGNORE INTO mailboxes (name) VALUES (?)`
  ),
  upsertPresence: db.prepare(`
    INSERT INTO presence (name, connection_id) VALUES (?, ?)
    ON CONFLICT(name) DO UPDATE SET
      connected_at = datetime('now'),
      last_seen = datetime('now'),
      connection_id = excluded.connection_id
  `),
  touchPresence: db.prepare(
    `UPDATE presence SET last_seen = datetime('now') WHERE name = ?`
  ),
  removePresence: db.prepare(`DELETE FROM presence WHERE name = ?`),
  isOnline: db.prepare(`SELECT 1 FROM presence WHERE name = ?`),
  listOnline: db.prepare(`SELECT name, connected_at, last_seen FROM presence`),
  listMailboxes: db.prepare(`SELECT name, created_at FROM mailboxes`),
  insertMessage: db.prepare(`
    INSERT INTO messages (id, mailbox, "from", message, type, expires_at)
    VALUES (?, ?, ?, ?, ?, datetime('now', ?))
  `),
  pendingCount: db.prepare(
    `SELECT COUNT(*) as count FROM messages WHERE mailbox = ? AND status = 'pending'`
  ),
  leaseMessages: db.prepare(`
    UPDATE messages SET status = 'leased', leased_at = datetime('now'), leased_by = ?
    WHERE mailbox = ? AND status = 'pending'
    RETURNING id, "from", message, type, created_at
  `),
  ackMessages: db.prepare(
    `UPDATE messages SET status = 'acked', acked_at = datetime('now')
     WHERE id = ? AND status = 'leased'`
  ),
  prunePresence: db.prepare(
    `DELETE FROM presence WHERE last_seen < datetime('now', ?)`
  ),
  unleaseExpired: db.prepare(
    `UPDATE messages SET status = 'pending', leased_at = NULL, leased_by = NULL
     WHERE status = 'leased' AND leased_at < datetime('now', ?)`
  ),
  expireMessages: db.prepare(
    `UPDATE messages SET status = 'expired'
     WHERE status IN ('pending', 'leased') AND expires_at < datetime('now')`
  ),
  cleanOld: db.prepare(
    `DELETE FROM messages WHERE status IN ('acked', 'expired')
     AND created_at < datetime('now', '-7 days')`
  ),
  messageStats: db.prepare(`
    SELECT status, COUNT(*) as count FROM messages GROUP BY status
  `),
};

// ─── Maintenance Loop ───

const startedAt = Date.now();

function runMaintenance() {
  const ttlSeconds = `-${Math.floor(PRESENCE_TTL / 1000)} seconds`;
  const leaseSeconds = `-${Math.floor(LEASE_MS / 1000)} seconds`;
  stmts.prunePresence.run(ttlSeconds);
  stmts.unleaseExpired.run(leaseSeconds);
  stmts.expireMessages.run();
  stmts.cleanOld.run();
}

setInterval(runMaintenance, 30_000);

// ─── HTTP Server ───

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function body(req: Request) {
  return req.json().catch(() => ({}));
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // Health
    if (path === "/health" && req.method === "GET") {
      const online = stmts.listOnline.all();
      const stats = Object.fromEntries(
        (stmts.messageStats.all() as any[]).map((r) => [r.status, r.count])
      );
      return json({
        status: "ok",
        uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
        sessions_online: online.length,
        message_stats: stats,
      });
    }

    // Register
    if (path === "/register" && req.method === "POST") {
      const { name } = await body(req);
      if (!name) return json({ error: "name required" }, 400);
      const connectionId = randomUUID();
      stmts.ensureMailbox.run(name);
      stmts.upsertPresence.run(name, connectionId);
      const pending = stmts.pendingCount.get(name) as any;
      return json({ ok: true, connection_id: connectionId, pending: pending.count });
    }

    // Send direct message
    if (path === "/send" && req.method === "POST") {
      const { to, from, message, type = "info" } = await body(req);
      if (!to || !from || !message) {
        return json({ error: "to, from, message required" }, 400);
      }
      stmts.ensureMailbox.run(to);
      const id = randomUUID();
      const expiry = `+${Math.floor(DIRECT_EXPIRY_MS / 1000)} seconds`;
      stmts.insertMessage.run(id, to, from, message, type, expiry);
      const online = stmts.isOnline.get(to);
      return json({ ok: true, id, recipient_online: !!online });
    }

    // Broadcast
    if (path === "/broadcast" && req.method === "POST") {
      const { from, message, type = "broadcast" } = await body(req);
      if (!from || !message) {
        return json({ error: "from, message required" }, 400);
      }
      const sessions = stmts.listOnline.all() as any[];
      const expiry = `+${Math.floor(BROADCAST_EXPIRY_MS / 1000)} seconds`;
      let sent = 0;
      for (const session of sessions) {
        if (session.name === from) continue;
        const id = randomUUID();
        stmts.insertMessage.run(id, session.name, from, message, type, expiry);
        sent++;
      }
      return json({ ok: true, sent });
    }

    // Poll for messages
    if (path.startsWith("/poll/") && req.method === "GET") {
      const name = path.slice(6);
      const online = stmts.isOnline.get(name);
      if (!online) return json({ error: "not registered" }, 404);
      stmts.touchPresence.run(name);
      const connectionId = url.searchParams.get("connection_id") ?? "";
      const messages = stmts.leaseMessages.all(connectionId, name);
      return json({ messages });
    }

    // Ack messages
    if (path === "/ack" && req.method === "POST") {
      const { ids } = await body(req);
      if (!Array.isArray(ids)) return json({ error: "ids array required" }, 400);
      for (const id of ids) {
        stmts.ackMessages.run(id);
      }
      return json({ ok: true, acked: ids.length });
    }

    // List online sessions
    if (path === "/sessions" && req.method === "GET") {
      return json({ sessions: stmts.listOnline.all() });
    }

    // Unregister
    if (path === "/unregister" && req.method === "POST") {
      const { name } = await body(req);
      if (name) stmts.removePresence.run(name);
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  },
});

console.error(`[message-bus-hub] listening on port ${PORT}`);
console.error(`[message-bus-hub] database: ${DB_PATH}`);
