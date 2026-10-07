'use client';
import { Fragment, memo, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowDownUp,
  ArrowUpRight,
  Check,
  ChevronDown,
  Download,
  Play,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { api, supports, thresholds } from '@/lib/api';
import { demoEvaluations } from '@/lib/demo';
import type { EvalMetrics, EvalRun, TestCase } from '@/lib/types';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import { Badge, EmptyState, ErrorNotice, PageHeader, Skeleton, Spinner, download } from './UI';
import { useToast } from './Providers';
const metrics = [
  {
    key: 'faithfulness',
    label: 'Faithfulness',
    color: '#7C65C1',
    description: 'Answers supported by retrieved context',
  },
  {
    key: 'topology_recall',
    label: 'Topology recall',
    color: '#B87726',
    description: 'Expected code relationships retrieved',
  },
  {
    key: 'intent_accuracy',
    label: 'Intent accuracy',
    color: '#218665',
    description: 'Questions classified correctly',
  },
  {
    key: 'citation_precision',
    label: 'Citation precision',
    color: '#487CBD',
    description: 'Citations that reference real code',
  },
] as const;
function Score({ value }: { value?: number }) {
  const [shown, setShown] = useState<number | undefined>(value == null ? undefined : 0);
  useEffect(() => {
    if (value == null) {
      setShown(undefined);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0,
      start = performance.now();
    const tick = (time: number) => {
      const p = Math.min(1, (time - start) / 650);
      setShown(value * (1 - (1 - p) ** 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <>
      {shown == null ? '—' : (shown * 100).toFixed(1)}
      {shown != null && <span>%</span>}
    </>
  );
}
const CaseRow = memo(function CaseRow({ c }: { c: TestCase }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr>
        <td>
          <button
            className="case-query"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown size={14} className={expanded ? 'rotated' : ''} />
            <span title={c.query}>{c.query}</span>
          </button>
        </td>
        <td>
          <Badge tone="purple">{c.intent}</Badge>
        </td>
        <td>
          <Badge tone={c.retrieval_pass ? 'green' : 'red'}>
            {c.retrieval_pass ? 'PASS' : 'FAIL'}
          </Badge>
        </td>
        <td>
          <Badge tone={c.answer_quality_pass ? 'green' : 'red'}>
            {c.answer_quality_pass ? 'PASS' : 'FAIL'}
          </Badge>
        </td>
        <td>
          <div className="latency-cell">
            <div>
              <i style={{ width: `${Math.min(100, c.latency_ms / 50)}%` }} />
            </div>
            {Math.round(c.latency_ms)} ms
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="case-expanded">
          <td colSpan={5}>
            <b>{c.query}</b>
            <h4>Answer</h4>
            <pre>{c.answer || 'The backend did not provide an answer for this case.'}</pre>
            <h4>Retrieved context</h4>
            {c.retrieved_chunks?.length ? (
              c.retrieved_chunks.map((chunk, i) => <pre key={i}>{chunk}</pre>)
            ) : (
              <p>No retrieved chunks were included in this report.</p>
            )}
          </td>
        </tr>
      )}
    </>
  );
});
export default function EvalDashboard() {
  const w = useWorkspace(),
    store = useCodeSageStore(),
    client = useQueryClient(),
    toast = useToast();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('query'),
    [desc, setDesc] = useState(false),
    [filter, setFilter] = useState('all'),
    [selected, setSelected] = useState('latest'),
    [page, setPage] = useState(0),
    [golden, setGolden] = useState('app/evaluation/golden_set.json');
  const controller = useRef<AbortController | null>(null);
  const caps = useQuery({ queryKey: ['capabilities'], queryFn: api.capabilities });
  const remote = useQuery({
    queryKey: ['evaluations', store.mode],
    queryFn: ({ signal }) => api.evaluations(signal),
    enabled: store.mode === 'live' && supports(caps.data, '/eval'),
    retry: false,
  });
  const dataset = store.mode === 'demo' ? demoEvaluations : remote.data;
  const combined = new Map<string, EvalRun>();
  (dataset?.runs || []).forEach((r) => combined.set(r.id, r));
  w.evalRuns.forEach((r) => combined.set(r.id, r));
  const runs = Array.from(combined.values()).slice(-20);
  const latest = runs[runs.length - 1],
    previous = runs[runs.length - 2],
    current = selected === 'latest' ? latest : runs.find((r) => r.id === selected);
  const scores = current?.metrics || dataset?.latest;
  const gates = dataset?.thresholds || thresholds;
  useEffect(() => {
    setSelected('latest');
    setPage(0);
    setError(null);
    controller.current?.abort();
  }, [store.mode]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => setPage(0), [search, sort, filter, desc, selected]);
  async function run() {
    setError(null);
    setBusy(true);
    const abort = new AbortController();
    controller.current = abort;
    try {
      if (store.mode === 'demo') {
        store.addEvalRun({
          ...demoEvaluations.runs[11],
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        });
        toast('Sample evaluation added. Metrics are illustrative.');
        return;
      }
      let result = await api.runEvaluation(golden, abort.signal);
      if ('job_id' in result) {
        const deadline = Date.now() + 10 * 60_000;
        while (Date.now() < deadline) {
          await new Promise<void>((resolve, reject) => {
            if (abort.signal.aborted) {
              reject(new DOMException('Cancelled', 'AbortError'));
              return;
            }
            const cancelled = () => {
              clearTimeout(t);
              reject(new DOMException('Cancelled', 'AbortError'));
            };
            const t = setTimeout(() => {
              abort.signal.removeEventListener('abort', cancelled);
              resolve();
            }, 2000);
            abort.signal.addEventListener('abort', cancelled, { once: true });
          });
          const status = await api.evalStatus(result.job_id, abort.signal);
          if (['error', 'failed'].includes(status.status))
            throw new Error(status.message || 'Evaluation failed');
          if (['done', 'ready', 'success'].includes(status.status)) {
            if (status.result || status.report) {
              const report = status.result || status.report;
              store.addEvalRun({
                id: result.job_id,
                timestamp: new Date().toISOString(),
                metrics: report.metrics || report,
                test_cases: report.test_cases || [],
                passed: report.passed,
              });
            } else if (!supports(caps.data, '/eval'))
              throw new Error(
                'Evaluation completed, but the backend did not include a result or a results endpoint.',
              );
            break;
          }
          if (Date.now() + 2000 >= deadline)
            throw new Error('Evaluation is still running. Refresh results later.');
        }
      } else store.addEvalRun(result);
      await client.invalidateQueries({ queryKey: ['evaluations'] });
      setSelected('latest');
      toast('Evaluation complete. Results updated.');
    } catch (e) {
      if (!abort.signal.aborted) setError(e);
    } finally {
      setBusy(false);
    }
  }
  const cases = (current?.test_cases || [])
    .filter(
      (c) =>
        (c.query + ' ' + c.intent).toLowerCase().includes(search.toLowerCase()) &&
        (filter === 'all' ||
          (filter === 'failed' && (!c.retrieval_pass || !c.answer_quality_pass)) ||
          (filter === 'passed' && c.retrieval_pass && c.answer_quality_pass)),
    )
    .sort((a, b) => {
      let d =
        sort === 'latency'
          ? a.latency_ms - b.latency_ms
          : sort === 'intent'
            ? a.intent.localeCompare(b.intent)
            : sort === 'retrieval'
              ? Number(a.retrieval_pass) - Number(b.retrieval_pass)
              : sort === 'quality'
                ? Number(a.answer_quality_pass) - Number(b.answer_quality_pass)
                : a.query.localeCompare(b.query);
      return desc ? -d : d;
    });
  const passed = scores ? metrics.every((m) => scores[m.key] >= gates[m.key]) : null;
  return (
    <div className="page-content eval-page">
      <PageHeader
        eyebrow="CONFIDENCE, WITH EVIDENCE"
        title="Keep quality in the picture."
        description="Understand what improved, what regressed, and where to look next."
        action={
          <div className="button-row">
            <button
              className="button secondary"
              disabled={!runs.length}
              onClick={() =>
                download(
                  'codesage-evaluation.json',
                  JSON.stringify({ mode: store.mode, runs, thresholds: gates }, null, 2),
                )
              }
            >
              <Download size={16} />
              Export
            </button>
            <button
              className="button primary"
              disabled={
                busy ||
                (store.mode === 'live' &&
                  caps.data?.online &&
                  !supports(caps.data, '/eval', 'post'))
              }
              onClick={run}
            >
              {busy ? <Spinner /> : <Play size={15} />} {busy ? 'Running…' : 'Run evaluation'}
            </button>
          </div>
        }
      />
      {store.mode === 'live' && !supports(caps.data, '/eval', 'post') && (
        <div className="availability-note">
          <b>Evaluation is ready for your API.</b>
          <p>
            The evaluation route exists in the backend code but is not registered in the FastAPI
            application. Connect it to enable live runs. The complete report interface is available
            in demo mode.
          </p>
          <button className="text-button" onClick={() => store.setMode('demo')}>
            Explore a sample report <ArrowUpRight size={14} />
          </button>
        </div>
      )}
      {error != null && <ErrorNotice error={error} />}
      <div className="eval-run-controls">
        <label>
          Run{' '}
          <select
            className="input"
            aria-label="Evaluation run"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="latest">Latest run</option>
            {runs
              .slice()
              .reverse()
              .map((r, i) => (
                <option key={r.id} value={r.id}>
                  Run {runs.length - i} · {new Date(r.timestamp).toLocaleDateString()}
                </option>
              ))}
          </select>
        </label>
        <label>
          Golden set{' '}
          <input
            aria-label="Golden set path on backend"
            className="input mono"
            value={golden}
            onChange={(e) => setGolden(e.target.value)}
            disabled={busy}
          />
        </label>
        {passed != null && (
          <Badge tone={passed ? 'green' : 'red'}>
            <ShieldCheck size={13} />
            {passed ? 'All display thresholds met' : 'Review quality thresholds'}
          </Badge>
        )}
      </div>
      <div className="metric-grid">
        {metrics.map((m) => {
          const value = scores?.[m.key],
            delta = value != null && previous ? (value - previous.metrics[m.key]) * 100 : null;
          return (
            <section
              key={m.key}
              className={`metric-card ${value == null ? '' : value >= gates[m.key] ? 'passing' : 'failing'}`}
            >
              <div>
                <span>{m.label}</span>
                <ShieldCheck size={16} />
              </div>
              <strong>
                <Score value={value} />
              </strong>
              <p>{m.description}</p>
              <footer>
                <span>Threshold ≥ {Math.round(gates[m.key] * 100)}%</span>
                {delta != null && selected === 'latest' && (
                  <Badge tone={delta >= 0 ? 'green' : 'red'}>
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(1)} pp
                  </Badge>
                )}
              </footer>
            </section>
          );
        })}
      </div>
      <section className="surface trend-panel">
        <div className="section-row">
          <div>
            <h2>The direction of quality</h2>
            <p className="muted">
              Last {runs.length} runs · dashed lines indicate display thresholds
            </p>
          </div>
          {current?.passed != null && (
            <Badge tone={current.passed ? 'green' : 'red'}>
              Backend gate: {current.passed ? 'passed' : 'failed'}
            </Badge>
          )}
        </div>
        {remote.isLoading ? (
          <Skeleton rows={4} />
        ) : runs.length ? (
          <div className="eval-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={runs.map((r, i) => ({ run: i + 1, ...r.metrics }))}
                margin={{ top: 20, right: 20, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="run"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => `${(v * 100).toFixed(1)}%`}
                  labelFormatter={(v) => `Run ${v}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
                {metrics.map((m) => (
                  <Fragment key={m.key}>
                    <ReferenceLine
                      y={gates[m.key]}
                      stroke={m.color}
                      strokeDasharray="4 6"
                      strokeOpacity={0.35}
                    />
                    <Line
                      name={m.label}
                      type="monotone"
                      dataKey={m.key}
                      stroke={m.color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                  </Fragment>
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            icon={<ShieldCheck size={26} />}
            title="Your quality story starts with a run."
            description="Run an evaluation to see scores and track changes over time."
          />
        )}
      </section>
      <section className="surface cases-panel">
        <div className="section-row">
          <h2>
            Look closer at each question <Badge>{cases.length}</Badge>
          </h2>
          <div className="case-filters">
            <label className="search-field">
              <Search size={14} />
              <input
                aria-label="Filter evaluation cases"
                placeholder="Find a question or intent…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              className="input"
              aria-label="Filter evaluation outcomes"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All outcomes</option>
              <option value="failed">Needs review</option>
              <option value="passed">Passed</option>
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  ['query', 'Question'],
                  ['intent', 'Intent'],
                  ['retrieval', 'Retrieval'],
                  ['quality', 'Answer quality'],
                  ['latency', 'Latency'],
                ].map(([key, label]) => (
                  <th
                    key={key}
                    aria-sort={sort === key ? (desc ? 'descending' : 'ascending') : 'none'}
                  >
                    <button
                      onClick={() => {
                        setSort(key);
                        setDesc(sort === key ? !desc : false);
                      }}
                    >
                      {label}
                      <ArrowDownUp size={11} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cases.slice(page * 50, (page + 1) * 50).map((c) => (
                <CaseRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
        {!cases.length && (
          <div className="inline-empty">
            <p>
              {scores
                ? 'The backend returned aggregate metrics without case-level details.'
                : 'Per-question results will appear after an evaluation.'}
            </p>
          </div>
        )}
        {cases.length > 50 && (
          <div className="pagination">
            <button
              className="button small secondary"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page + 1} of {Math.ceil(cases.length / 50)}
            </span>
            <button
              className="button small secondary"
              disabled={(page + 1) * 50 >= cases.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </section>
      {remote.error && <ErrorNotice error={remote.error} retry={() => remote.refetch()} />}
      <p className="fine-print">
        <Check size={13} /> Backend gate results are reported separately from frontend display
        thresholds. Run history is saved in this browser when the backend has no history endpoint.
      </p>
    </div>
  );
}
