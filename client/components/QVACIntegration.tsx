'use client';

import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface QvacStatus {
  ok: boolean;
  detail: string;
  vectors?: number;
  dimensions?: number;
}

export default function QVACIntegration() {
  const [status, setStatus] = useState<QvacStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/integrations/diagnostics')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const probe = data.probes?.find((p: any) => p.name === 'qvac');
        if (probe) {
          const vecMatch = probe.detail?.match(/vectors=(\d+)/);
          const dimMatch = probe.detail?.match(/dim=(\d+)/);
          setStatus({
            ok: probe.ok,
            detail: probe.detail,
            vectors: vecMatch ? Number(vecMatch[1]) : undefined,
            dimensions: dimMatch ? Number(dimMatch[1]) : undefined,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setStatus({ ok: false, detail: 'Failed to reach diagnostics endpoint' });
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <div className="p-5 border border-aldor-border bg-aldor-graphite/60 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold">QVAC Embeddings</h3>
            <p className="text-[10px] text-aldor-text-muted">Local on-device vector similarity routing</p>
          </div>
        </div>
        {loading ? (
          <Loader2 size={14} className="animate-spin text-aldor-text-muted" />
        ) : status?.ok ? (
          <CheckCircle2 size={16} className="text-aldor-emerald" />
        ) : (
          <AlertCircle size={16} className="text-aldor-rose" />
        )}
      </div>

      <div className="space-y-3">
        <div className="p-3 rounded-md bg-aldor-black border border-aldor-border">
          <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-1">How it works</p>
          <p className="text-xs text-aldor-text-secondary leading-relaxed">
            QVAC (Quantum Vector Agent Compute) runs entirely on-device. When a user query arrives,
            it generates an embedding vector locally and compares it against pre-computed vectors
            for each agent&apos;s description using cosine similarity. The best-matching agent is selected
            without sending any data to external LLM providers — fully sovereign inference.
          </p>
        </div>

        {status && (
          <div className="p-3 rounded-md bg-aldor-black border border-aldor-border">
            <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-2">Live Probe</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-aldor-text-secondary">Status</span>
                <span className={status.ok ? 'text-aldor-emerald' : 'text-aldor-rose'}>
                  {status.ok ? 'Active' : 'Disabled / Error'}
                </span>
              </div>
              {typeof status.vectors === 'number' && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-aldor-text-secondary">Vectors</span>
                  <span className="text-aldor-purple-bright font-mono">{status.vectors}</span>
                </div>
              )}
              {typeof status.dimensions === 'number' && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-aldor-text-secondary">Dimensions</span>
                  <span className="text-aldor-cyan font-mono">{status.dimensions}</span>
                </div>
              )}
              <div className="text-[10px] text-aldor-text-muted mt-1 truncate" title={status.detail}>
                {status.detail}
              </div>
            </div>
          </div>
        )}

        <div className="p-3 rounded-md bg-aldor-black border border-aldor-border">
          <p className="text-[10px] text-aldor-text-muted uppercase tracking-wider mb-1">Integration Path</p>
          <code className="text-[10px] text-aldor-emerald font-mono block leading-relaxed">
            User Query → runQvacEmbedding([query, ...agentDescriptions])<br />
            → cosineSimilarity(queryVec, agentVecs)<br />
            → bestMatch = max(score) → route to agent
          </code>
        </div>
      </div>

      <a
        href="https://github.com/aldorhq/qvac"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-1.5 text-[10px] text-purple-400 hover:text-purple-300 transition-colors"
      >
        <ExternalLink size={9} />
        QVAC Documentation
      </a>
    </div>
  );
}
