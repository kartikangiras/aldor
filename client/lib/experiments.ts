'use client';

/*
 * Flagsmith Experimentation for aldor.
 *
 * Off unless NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT is set: then nothing is loaded and everyone sees the
 * control version. When it is on, each browser gets one anonymous ID kept in localStorage, so a
 * visitor always lands in the same version. useExperiment() records the exposure, trackEvent()
 * records a conversion. Experiment Guard reads these call sites in pull requests, so keep the flag
 * key and event names literal strings.
 */
import { useEffect, useState } from 'react';

interface Flag { enabled: boolean; value: unknown; variant?: string }
interface Sdk {
  getExperimentFlag(name: string): Flag | null;
  trackEvent(event: string): void;
  flushEvents(): Promise<void>;
}

const ENVIRONMENT = process.env.NEXT_PUBLIC_FLAGSMITH_ENVIRONMENT;
const VISITOR_KEY = 'aldor-visitor';
/** How long a screen waits for Flagsmith before showing the control version. */
const ASSIGN_TIMEOUT_MS = 2500;

let memoryId: string | undefined;
export function visitorId(): string {
  try {
    const saved = localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return (memoryId ??= crypto.randomUUID());
  }
}

let started: Promise<Sdk | null> | undefined;
export function startExperiments(): Promise<Sdk | null> {
  started ??= (async () => {
    if (!ENVIRONMENT || typeof window === 'undefined') return null;
    try {
      const { default: flagsmith } = await import('@flagsmith/flagsmith');
      await flagsmith.init({
        environmentID: ENVIRONMENT,
        identity: visitorId(),
        enableEvents: true,
        // keepalive lets the last batch of events outlive the page.
        fetch: (url: RequestInfo, init?: RequestInit) => fetch(url, { ...init, keepalive: true }),
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void flagsmith.flushEvents();
      });
      window.addEventListener('pagehide', () => void flagsmith.flushEvents());
      return flagsmith as unknown as Sdk;
    } catch (err) {
      console.warn('[experiments] Flagsmith is unavailable, so the control version is shown.', err);
      return null;
    }
  })();
  return started;
}

const timeout = <T,>(p: Promise<T>, ms: number, fallback: T) =>
  Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

// One assignment per flag per page load, so remounts record one exposure.
const assignments = new Map<string, Promise<string | null>>();

/** The visitor's variation key for an experiment, or null for the control version. */
export function useExperiment(flag: string): { ready: boolean; variant: string | null } {
  const [state, setState] = useState<{ ready: boolean; variant: string | null }>({ ready: false, variant: null });
  useEffect(() => {
    let live = true;
    let assignment = assignments.get(flag);
    if (!assignment) {
      assignment = timeout(startExperiments(), ASSIGN_TIMEOUT_MS, null).then((sdk) => {
        const f = sdk?.getExperimentFlag(flag);
        return f?.enabled && f.variant && f.variant !== 'control' ? f.variant : null;
      });
      assignments.set(flag, assignment);
    }
    void assignment.then((variant) => { if (live) setState({ ready: true, variant }); });
    return () => { live = false; };
  }, [flag]);
  return state;
}

/** Records a conversion event for this visitor. Does nothing when experiments are off. */
export function trackEvent(event: string): void {
  void startExperiments().then((sdk) => sdk?.trackEvent(event));
}
