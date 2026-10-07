'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, Download, RefreshCw } from 'lucide-react';
import { api, supports } from '@/lib/api';
import { parseMetrics, meanMetric, sumMetric, histogramQuantile } from '@/lib/metrics.mjs';
import { useCodeSageStore } from '@/store/useCodeSageStore';
import { Badge, ErrorNotice, PageHeader, Skeleton, download } from './UI';
import Link from 'next/link';
const demoRaw = `# Sample metrics, not production telemetry\ncodesage_queries_total 128\nrequest_count_total{method="POST",endpoint="/query",status="200"} 124\nrequest_count_total{method="POST",endpoint="/query",status="500"} 4\ncodesage_retrieval_latency_ms_sum 28160\ncodesage_retrieval_latency_ms_count 128\ncodesage_rerank_latency_ms_sum 14976\ncodesage_rerank_latency_ms_count 128\ncodesage_llm_latency_ms_sum 171520\ncodesage_llm_latency_ms_count 128\ncodesage_context_tokens_sum 451328\ncodesage_context_tokens_count 128\ncodesage_agent_retries_total 6\ncodesage_intent_total{intent="EXPLAIN"} 58\ncodesage_intent_total{intent="BUG"} 28\ncodesage_intent_total{intent="IMPACT"} 22\ncodesage_intent_total{intent="TEST"} 20\nrequest_latency_seconds_bucket{le="0.5"} 11\nrequest_latency_seconds_bucket{le="1"} 43\nrequest_latency_seconds_bucket{le="2.5"} 124\nrequest_latency_seconds_bucket{le="+Inf"} 128\n`;
export default function Observability() {
  const mode = useCodeSageStore((s) => s.mode),
    [auto, setAuto] = useState(true);
  const caps = useQuery({ queryKey: ['capabilities'], queryFn: api.capabilities }),
    raw = useQuery({
      queryKey: ['metrics', mode],
      queryFn: ({ signal }) => (mode === 'demo' ? demoRaw : api.metrics(signal)),
      refetchInterval: auto && mode === 'live' ? 15_000 : false,
      retry: false,
    }),
    health = useQuery({
      queryKey: ['health'],
      queryFn: ({ signal }) => api.health(signal),
      enabled: mode === 'live' && supports(caps.data, '/health'),
      refetchInterval: auto ? 15_000 : false,
    });
  const rows = useMemo(() => parseMetrics(raw.data || ''), [raw.data]),
    requests = sumMetric(rows, 'request_count_total'),
    queries = sumMetric(rows, 'codesage_queries_total'),
    p95 = histogramQuantile(rows, 'request_latency_seconds', 0.95),
    errors = rows
      .filter((r) => r.name === 'request_count_total' && Number(r.labels.status) >= 500)
      .reduce((s, r) => s + r.value, 0);
  const stats = [
    [
      'Queries served',
      queries != null ? queries.toLocaleString() : '—',
      'Total queries since process startup',
    ],
    [
      'Request p95',
      p95 != null ? `${(p95 * 1000).toFixed(0)} ms` : '—',
      'Estimated from histogram buckets',
    ],
    [
      'Server error rate',
      requests ? `${((errors / requests) * 100).toFixed(1)}%` : '—',
      '5xx responses / recorded requests',
    ],
    [
      'Agent retries',
      sumMetric(rows, 'codesage_agent_retries_total')?.toLocaleString() ?? '—',
      'Retries since process startup',
    ],
  ];
  const pipeline = [
    ['Retrieval', 'codesage_retrieval_latency_ms'],
    ['Reranking', 'codesage_rerank_latency_ms'],
    ['Generation', 'codesage_llm_latency_ms'],
  ];
  const intents = rows.filter((r) => r.name === 'codesage_intent_total'),
    intentTotal = intents.reduce((s, r) => s + r.value, 0);
  return (
    <div className="page-content">
      <PageHeader
        eyebrow="UNDERSTAND THE SYSTEM"
        title="A pulse on your platform."
        description="Latency, intent, and service signals from the connected backend."
        action={
          <div className="button-row">
            <button
              className="button secondary"
              disabled={!raw.data}
              onClick={() => download('codesage-metrics.prom', raw.data || '', 'text/plain')}
            >
              <Download size={16} />
              Export
            </button>
            <button
              className="button primary"
              onClick={() => {
                raw.refetch();
                caps.refetch();
                if (supports(caps.data, '/health')) health.refetch();
              }}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        }
      />
      <div className="observability-status">
        <Badge tone={mode === 'demo' ? 'purple' : caps.data?.online ? 'green' : 'red'}>
          <Activity size={13} />
          {mode === 'demo'
            ? 'Sample telemetry'
            : caps.data?.online
              ? 'API connected'
              : 'API disconnected'}
        </Badge>
        <span className="muted">
          {raw.dataUpdatedAt
            ? `Last sampled ${new Date(raw.dataUpdatedAt).toLocaleTimeString()}`
            : 'Awaiting first sample'}
        </span>
        <label className="checkbox-label">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          Refresh every 15 seconds
        </label>
      </div>
      {raw.error && <ErrorNotice error={raw.error} retry={() => raw.refetch()} />}
      <div className="metric-grid">
        {stats.map(([label, value, description]) => (
          <section className="metric-card" key={label}>
            <span>{label}</span>
            <strong className="telemetry-number">{value}</strong>
            <p>{description}</p>
          </section>
        ))}
      </div>
      <div className="observability-grid">
        <section className="surface">
          <div className="section-row">
            <h2>Time spent understanding</h2>
            <Badge>Mean latency</Badge>
          </div>
          {raw.isLoading ? (
            <Skeleton rows={4} />
          ) : (
            pipeline.map(([label, key]) => {
              const value = meanMetric(rows, key);
              return (
                <div className="pipeline-row" key={key}>
                  <span>{label}</span>
                  <div className="meter">
                    <i
                      style={{
                        width: `${value != null ? Math.min((value / 2000) * 100, 100) : 0}%`,
                      }}
                    />
                  </div>
                  <b>{value != null ? `${Math.round(value)} ms` : 'No samples'}</b>
                </div>
              );
            })
          )}
          <div className="context-token-stat">
            <span>Average context size</span>
            <b>{meanMetric(rows, 'codesage_context_tokens')?.toFixed(0) ?? '—'} tokens</b>
          </div>
          <p className="fine-print">
            Statistics are calculated from backend histogram sums and counts.
          </p>
        </section>
        <section className="surface">
          <div className="section-row">
            <h2>What developers are asking</h2>
            <Badge>Intent distribution</Badge>
          </div>
          {intents.length ? (
            intents.map((r) => (
              <div className="intent-row" key={r.labels.intent}>
                <Badge tone="purple">{r.labels.intent}</Badge>
                <div className="meter">
                  <i style={{ width: `${intentTotal ? (r.value / intentTotal) * 100 : 0}%` }} />
                </div>
                <b>{r.value}</b>
              </div>
            ))
          ) : (
            <div className="inline-empty">
              <p>No intent samples have been recorded yet.</p>
            </div>
          )}
        </section>
        <section className="surface">
          <div className="section-row">
            <h2>Service connections</h2>
            <Link className="text-link" href="/settings">
              Settings <ArrowUpRight size={13} />
            </Link>
          </div>
          {[
            ['FastAPI', mode === 'demo' ? undefined : caps.data?.online],
            ['Qdrant', health.data?.qdrant],
            ['Redis', health.data?.redis],
            ['PostgreSQL', health.data?.postgres],
          ].map(([name, online]) => (
            <div className="service-row" key={String(name)}>
              <span className={`status-dot ${online === true ? 'online' : ''}`} />
              <b>{name}</b>
              <Badge tone={online === true ? 'green' : 'muted'}>
                {mode === 'demo'
                  ? 'Sample workspace'
                  : online === true
                    ? 'Connected'
                    : online === false
                      ? 'Disconnected'
                      : 'Not reported'}
              </Badge>
            </div>
          ))}
          <p className="fine-print">
            Service health requires the planned health route. A missing route is shown as “Not
            reported”.
          </p>
        </section>
        <section className="surface monitoring-links">
          <span className="eyebrow">THE WIDER PICTURE</span>
          <h2>
            Follow a request.
            <br />
            Find the missing piece.
          </h2>
          <p>
            Connect your Grafana, LangSmith, and MLflow dashboards to inspect traces and historical
            runs.
          </p>
          <Link className="button secondary" href="/settings">
            Configure monitoring links <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <section className="surface raw-metrics">
        <details>
          <summary>
            Inspect the raw Prometheus sample <Badge>{rows.length} values</Badge>
          </summary>
          <pre>{raw.data || 'No metrics available.'}</pre>
        </details>
      </section>
    </div>
  );
}
