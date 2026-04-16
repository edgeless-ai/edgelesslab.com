/**
 * Shared types for the dispatch system.
 */

export type TaskStatus =
  | "PENDING"
  | "CLAIMED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";

export interface TaskDefinition {
  id: string;
  type: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  priority: number; // 1 = highest, 10 = lowest
  createdAt: string; // ISO 8601
  dependsOn?: string[]; // IDs of tasks that must complete first
}

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  allowedTools: string[];
  maxTurns: number;
  model?: string; // defaults to claude-sonnet-4-20250514
  workingDirectory?: string;
  timeoutMs: number;
}

export interface TaskRecord {
  id: string;
  type: string;
  title: string;
  description: string;
  payload: string; // JSON-serialized
  priority: number;
  status: TaskStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  result: string | null; // JSON-serialized output or error
  attempts: number;
  maxAttempts: number;
  leaseExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchResult {
  taskId: string;
  agentName: string;
  status: "COMPLETED" | "FAILED" | "TIMEOUT";
  output: string | null;
  error: string | null;
  durationMs: number;
  attempts: number;
}

export interface AgentRegistry {
  [taskType: string]: AgentConfig;
}

export interface QueueStats {
  pending: number;
  claimed: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}
