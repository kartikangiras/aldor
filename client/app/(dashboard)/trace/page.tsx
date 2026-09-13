'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createEventSource } from '@/lib/api';
import type { StepEvent } from '@/lib/types';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Square,
  Loader2,
} from 'lucide-react';

export default function TracePage() {
  const [sessionId, setSessionId] = useState('');
  const [steps, setSteps] = useState<StepEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!sessionId.trim() || esRef.current) return;
    const es = createEventSource(sessionId.trim());
    esRef.current = es;
    setIsConnected(true);
    setSteps([]);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StepEvent;
        setSteps((prev) => [...prev, data]);
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      // Auto-reconnect is handled by browser, but we can show disconnected
      setIsConnected(false);
    };
  }, [sessionId]);

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  const getStatus = (step: StepEvent): 'success' | 'error' | 'pending' => {
    if (step.type.includes('FAILED') || step.type.includes('EXCEEDED')) return 'error';
    if (step.type === 'WALLET_SIGN_REQUESTED') return 'pending';
    return 'success';
  };

  // Extract unique session IDs from steps
  const sessionIds = Array.from(new Set(steps.map((s) => s.sessionId).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Execution Trace</h1>
        <p className="text-sm text-aldor-text-secondary">Agent execution observability</p>
      </div>

      {/* Connection controls */}
      <Card className="border-aldor-border bg-aldor-graphite/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Input
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              placeholder="Enter session ID..."
              className="max-w-sm bg-aldor-surface border-aldor-border"
              disabled={isConnected}
            />
            <Button
              onClick={handleConnect}
              className="gap-2"
              variant={isConnected ? 'destructive' : 'default'}
            >
              {isConnected ? (
                <>
                  <Square size={14} />
                  Disconnect
                </>
              ) : (
                <>
                  <Play size={14} />
                  Connect
                </>
              )}
            </Button>
            {isConnected && (
              <Badge variant="default" className="gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-aldor-emerald" />
                Live
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Session IDs */}
      {sessionIds.length > 0 && (
        <Card className="border-aldor-border bg-aldor-graphite/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-aldor-text-muted uppercase tracking-wider">
              Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {sessionIds.map((sid) => (
                <Badge
                  key={sid}
                  variant="outline"
                  className="font-mono text-[10px] text-aldor-emerald border-aldor-emerald/30"
                >
                  {sid}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="border-aldor-border bg-aldor-graphite/60">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity size={16} className="text-aldor-emerald" />
            Execution Timeline
            {steps.length > 0 && (
              <span className="text-xs text-aldor-text-muted font-normal ml-auto">
                {steps.length} events
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {steps.length === 0 && !isConnected && (
            <div className="text-center py-12 text-aldor-text-muted text-sm">
              Enter a session ID and click Connect to start monitoring execution.
            </div>
          )}

          {steps.length === 0 && isConnected && (
            <div className="flex items-center justify-center py-12 text-aldor-text-muted text-sm">
              <Loader2 size={16} className="animate-spin mr-2" />
              Waiting for events...
            </div>
          )}

          <div className="space-y-0">
            {steps.map((trace, i) => {
              const status = getStatus(trace);
              const time = new Date(trace.timestamp).toLocaleTimeString();
              return (
                <div key={i} className="flex gap-4 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        status === 'success'
                          ? 'bg-aldor-emerald'
                          : status === 'error'
                          ? 'bg-aldor-rose'
                          : 'bg-aldor-amber'
                      }`}
                    />
                    {i < steps.length - 1 && <div className="w-px h-full bg-aldor-border mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {trace.type}
                      </Badge>
                      <span className="text-xs text-aldor-text-muted font-mono">{time}</span>
                      <span className="text-xs text-aldor-text-muted">depth {trace.depth}</span>
                      {status === 'success' ? (
                        <CheckCircle2 size={12} className="text-aldor-emerald" />
                      ) : status === 'error' ? (
                        <XCircle size={12} className="text-aldor-rose" />
                      ) : (
                        <Clock size={12} className="text-aldor-amber" />
                      )}
                    </div>
                    {trace.agent && (
                      <p className="text-xs text-aldor-purple-bright mb-1">Agent: {trace.agent}</p>
                    )}
                    {trace.domain && (
                      <p className="text-xs text-aldor-cyan mb-1">{trace.domain}</p>
                    )}
                    {trace.txSignature && (
                      <a
                        href={`https://explorer.solana.com/tx/${trace.txSignature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-mono text-aldor-emerald hover:underline block mb-1"
                      >
                        {trace.txSignature.slice(0, 20)}...
                      </a>
                    )}
                    <p className="text-sm text-aldor-text-secondary">{trace.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
