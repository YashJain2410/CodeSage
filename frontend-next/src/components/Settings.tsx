'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { ArrowUpRight, Check, RefreshCw, Settings2 } from 'lucide-react';
import { api, planned, supports } from '@/lib/api';
import { useCodeSageStore } from '@/store/useCodeSageStore';
import { Badge, ErrorNotice, PageHeader, Spinner } from './UI';
import { useToast } from './Providers';
const features = [
  ['ZIP ingestion', '/repositories/upload', 'post'],
  ['Local indexing', '/index', 'post'],
  ['AI code chat', '/query', 'post'],
  ['Call graph', '/graph', 'get'],
  ['GitHub import', '/repositories/github', 'post'],
  ['Source content', '/file', 'get'],
  ['Run evaluation', '/eval', 'post'],
  ['Evaluation history', '/eval', 'get'],
  ['Service health', '/health', 'get'],
  ['Prometheus metrics', '/metrics', 'get'],
];
export default function Settings() {
  const store = useCodeSageStore(),
    { theme, setTheme } = useTheme(),
    [provider, setProvider] = useState(store.provider),
    [model, setModel] = useState(store.model),
    [links, setLinks] = useState({ grafana: '', langsmith: '', mlflow: '' }),
    [error, setError] = useState<unknown>(null);
  const toast = useToast(),
    caps = useQuery({ queryKey: ['capabilities'], queryFn: api.capabilities });
  useEffect(() => {
    try {
      const saved = localStorage.getItem('codesage-monitoring-links');
      if (saved) setLinks(JSON.parse(saved));
    } catch {}
  }, []);
  const apiDisplay =
    process.env.NEXT_PUBLIC_API_URL || 'Same-origin proxy → configured Python backend';
  function saveLinks(e: React.FormEvent) {
    e.preventDefault();
    try {
      Object.values(links)
        .filter(Boolean)
        .forEach((l) => {
          const u = new URL(l);
          if (!['https:', 'http:'].includes(u.protocol))
            throw new Error('Dashboard links must use http:// or https://.');
        });
      localStorage.setItem('codesage-monitoring-links', JSON.stringify(links));
      setError(null);
      toast('Monitoring links saved.');
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="page-content settings-page">
      <PageHeader
        eyebrow="MAKE IT YOUR WORKSPACE"
        title="A few thoughtful defaults."
        description="Manage the connection, model, and appearance of your personal workspace."
      />
      <section className="settings-section">
        <div>
          <h2>Backend connection</h2>
          <p>One API. A clear contract.</p>
        </div>
        <div className="surface">
          <div className="section-row">
            <h3>Python API</h3>
            <Badge tone={caps.data?.online ? 'green' : 'muted'}>
              {caps.isFetching ? 'Checking' : caps.data?.online ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          <code className="settings-code">{apiDisplay}</code>
          <p>
            Set <code>CODESAGE_BACKEND_URL</code> in <code>.env.local</code> and restart the
            frontend to change the proxy target. Direct browser access uses{' '}
            <code>NEXT_PUBLIC_API_URL</code>.
          </p>
          <div className="button-row">
            <Badge tone="purple">{planned ? 'Planned' : 'Current'} API contract</Badge>
            <button className="button small secondary" onClick={() => caps.refetch()}>
              {caps.isFetching ? <Spinner /> : <RefreshCw size={14} />}Test connection
            </button>
          </div>
          <details className="capabilities-list">
            <summary>Available features</summary>
            {features.map(([label, path, method]) => {
              const effective =
                planned && path === '/graph'
                  ? '/graph/{repo_id}'
                  : planned && path === '/repositories/upload'
                    ? '/repositories/zip'
                    : path;
              return (
                <div key={label}>
                  <span>{label}</span>
                  <Badge tone={supports(caps.data, effective, method) ? 'green' : 'muted'}>
                    {supports(caps.data, effective, method) ? 'Available' : 'Not reported'}
                  </Badge>
                </div>
              );
            })}
          </details>
          {!caps.data?.online && caps.data?.error && (
            <p className="fine-print">{caps.data.error}</p>
          )}
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Answer generation</h2>
          <p>Use the provider configured on your backend.</p>
        </div>
        <form
          className="surface"
          onSubmit={(e) => {
            e.preventDefault();
            if (!model.trim()) return;
            store.setModel(provider, model.trim());
            toast('Model preference saved.');
          }}
        >
          <label className="field-label" htmlFor="model-provider">
            Provider
          </label>
          <select
            id="model-provider"
            className="input"
            value={provider}
            onChange={(e) => {
              setProvider(e.target.value);
              setModel(
                e.target.value === 'gemini'
                  ? 'gemini-3.5-flash'
                  : e.target.value === 'openai'
                    ? 'gpt-4.1'
                    : '',
              );
            }}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI</option>
            {planned && <option value="anthropic">Anthropic</option>}
          </select>
          <label className="field-label" htmlFor="model-name">
            Model identifier
          </label>
          <input
            id="model-name"
            className="input mono"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
          <p className="fine-print">
            The model identifier must be supported by your provider. Provider API keys stay in the
            Python backend environment.
          </p>
          <button className="button primary small" type="submit">
            <Check size={14} />
            Save model
          </button>
        </form>
      </section>
      <section className="settings-section">
        <div>
          <h2>Appearance & environment</h2>
          <p>A comfortable place to read and think.</p>
        </div>
        <div className="surface">
          <h3>Color theme</h3>
          <div className="appearance-options">
            {['light', 'dark', 'system'].map((t) => (
              <button
                className={`appearance-option ${theme === t ? 'active' : ''}`}
                key={t}
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
              >
                <span className={`theme-swatch ${t}`}>
                  <i />
                  <i />
                  <i />
                </span>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <h3>Workspace mode</h3>
          <div className="mode-options">
            <button
              className={`button ${store.mode === 'live' ? 'primary' : 'secondary'}`}
              onClick={() => store.setMode('live')}
            >
              Live backend
            </button>
            <button
              className={`button ${store.mode === 'demo' ? 'primary' : 'secondary'}`}
              onClick={() => store.setMode('demo')}
            >
              Sample workspace
            </button>
          </div>
          <p className="fine-print">
            Live and demo repositories, conversations, and evaluations are stored separately.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div>
          <h2>Monitoring dashboards</h2>
          <p>Keep your debugging tools one click away.</p>
        </div>
        <form className="surface" onSubmit={saveLinks}>
          {Object.entries(links).map(([name, value]) => (
            <div key={name}>
              <label className="field-label" htmlFor={`monitor-${name}`}>
                {name === 'langsmith' ? 'LangSmith' : name === 'mlflow' ? 'MLflow' : 'Grafana'}
              </label>
              <div className="monitoring-field">
                <input
                  className="input"
                  id={`monitor-${name}`}
                  type="url"
                  placeholder="https://your-dashboard.example.com"
                  value={value}
                  onChange={(e) => setLinks((s) => ({ ...s, [name]: e.target.value }))}
                />
                {/^https?:\/\//.test(value) && (
                  <a
                    className="icon-button"
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${name} dashboard`}
                  >
                    <ArrowUpRight size={18} />
                  </a>
                )}
              </div>
            </div>
          ))}
          {error != null && <ErrorNotice error={error} />}
          <button className="button primary small" type="submit">
            Save dashboard links <Check size={14} />
          </button>
        </form>
      </section>
      <section className="settings-section">
        <div>
          <h2>Keyboard shortcuts</h2>
          <p>Stay in the flow.</p>
        </div>
        <div className="surface keyboard-settings">
          <div>
            <span>Find a page or conversation</span>
            <kbd>⌘ / Ctrl + K</kbd>
          </div>
          <div>
            <span>Switch between chat and source</span>
            <kbd>⌘ / Ctrl + /</kbd>
          </div>
          <div>
            <span>Close panels or search</span>
            <kbd>Esc</kbd>
          </div>
          <div>
            <span>Send a question</span>
            <kbd>Enter</kbd>
          </div>
          <div>
            <span>Add a line in your question</span>
            <kbd>Shift + Enter</kbd>
          </div>
        </div>
      </section>
    </div>
  );
}
