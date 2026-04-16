/**
 * File-based Inbox System
 *
 * Each agent has a JSON file at inboxes/{agent-name}.json.
 * Messages are appended atomically using write-rename.
 * Agents poll their inbox, process messages, and write responses
 * to the sender's inbox.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  type: "request" | "response" | "broadcast" | "heartbeat";
  subject: string;
  body: unknown;
  replyTo?: string; // ID of the message this is responding to
  timestamp: string;
  read: boolean;
}

export interface InboxFile {
  agent: string;
  messages: InboxMessage[];
  lastUpdated: string;
}

const DEFAULT_INBOX_DIR = "inboxes";

export class Inbox {
  private dir: string;
  private agent: string;

  constructor(agentName: string, inboxDir: string = DEFAULT_INBOX_DIR) {
    this.agent = agentName;
    this.dir = inboxDir;
    mkdirSync(this.dir, { recursive: true });
    this.ensureInbox();
  }

  private inboxPath(agent?: string): string {
    return join(this.dir, `${agent || this.agent}.json`);
  }

  private ensureInbox(): void {
    const path = this.inboxPath();
    if (!existsSync(path)) {
      const empty: InboxFile = {
        agent: this.agent,
        messages: [],
        lastUpdated: new Date().toISOString(),
      };
      writeFileSync(path, JSON.stringify(empty, null, 2));
    }
  }

  /** Read all messages from this agent's inbox. */
  read(): InboxMessage[] {
    const path = this.inboxPath();
    if (!existsSync(path)) return [];
    const data: InboxFile = JSON.parse(readFileSync(path, "utf-8"));
    return data.messages;
  }

  /** Read only unread messages. */
  readUnread(): InboxMessage[] {
    return this.read().filter((m) => !m.read);
  }

  /** Mark specific messages as read. */
  markRead(messageIds: string[]): void {
    const path = this.inboxPath();
    const data: InboxFile = JSON.parse(readFileSync(path, "utf-8"));
    const idSet = new Set(messageIds);

    data.messages = data.messages.map((m) =>
      idSet.has(m.id) ? { ...m, read: true } : m
    );
    data.lastUpdated = new Date().toISOString();

    this.atomicWrite(path, data);
  }

  /**
   * Send a message to another agent's inbox.
   * Uses write-to-temp-then-rename for atomicity.
   */
  send(
    to: string,
    subject: string,
    body: unknown,
    type: InboxMessage["type"] = "request",
    replyTo?: string
  ): string {
    const targetPath = this.inboxPath(to);

    // Ensure target inbox exists
    let data: InboxFile;
    if (existsSync(targetPath)) {
      data = JSON.parse(readFileSync(targetPath, "utf-8"));
    } else {
      data = { agent: to, messages: [], lastUpdated: new Date().toISOString() };
    }

    const message: InboxMessage = {
      id: randomUUID(),
      from: this.agent,
      to,
      type,
      subject,
      body,
      replyTo,
      timestamp: new Date().toISOString(),
      read: false,
    };

    data.messages.push(message);
    data.lastUpdated = message.timestamp;

    this.atomicWrite(targetPath, data);
    return message.id;
  }

  /** Remove processed messages to keep the inbox small. */
  purgeRead(): number {
    const path = this.inboxPath();
    const data: InboxFile = JSON.parse(readFileSync(path, "utf-8"));
    const before = data.messages.length;
    data.messages = data.messages.filter((m) => !m.read);
    data.lastUpdated = new Date().toISOString();
    this.atomicWrite(path, data);
    return before - data.messages.length;
  }

  /**
   * Atomic write: write to a temp file, then rename.
   * Prevents partial reads if another process is reading simultaneously.
   */
  private atomicWrite(path: string, data: InboxFile): void {
    const tmpPath = `${path}.${randomUUID()}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    renameSync(tmpPath, path);
  }
}
