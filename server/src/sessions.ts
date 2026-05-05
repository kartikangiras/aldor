import { EventEmitter } from 'node:events';

const SESSION_TTL_MS = 30 * 60 * 1000;

interface SessionEntry {
  emitter: EventEmitter;
  touchedAt: number;
}

const sessions = new Map<string, SessionEntry>();

function now(): number {
  return Date.now();
}

function cleanupExpiredSessions() {
  const cutoff = now() - SESSION_TTL_MS;
  for (const [id, entry] of sessions.entries()) {
    if (entry.touchedAt < cutoff) {
      sessions.delete(id);
    }
  }
}

export function getSessionEmitter(sessionId: string): EventEmitter {
  cleanupExpiredSessions();
  const id = sessionId.trim() || 'default';
  const existing = sessions.get(id);
  if (existing) {
    existing.touchedAt = now();
    return existing.emitter;
  }

  const emitter = new EventEmitter();
  sessions.set(id, { emitter, touchedAt: now() });
  return emitter;
}
