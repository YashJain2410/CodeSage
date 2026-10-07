'use client';
import { useState } from 'react';
import { ArrowUp, ChevronRight, FileCode2, GitBranch, Search, ShieldCheck } from 'lucide-react';
import { Logo } from './UI';
export function CodeMap({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`code-map ${compact ? 'compact' : ''}`}
      aria-label="Illustration of authentication call relationships"
    >
      <svg className="map-connections" viewBox="0 0 520 400" fill="none" aria-hidden="true">
        <path
          d="M85 55C85 125 270 75 270 155M435 60C435 125 270 80 270 155M270 185C270 270 100 200 100 305M270 185v135M270 185c0 85 175 20 175 125"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <circle
          cx="270"
          cy="160"
          r="85"
          stroke="currentColor"
          strokeDasharray="3 8"
          opacity=".25"
        />
      </svg>
      <div className="map-node node-a">
        <span className="file-dot orange" />
        login_handler<span className="node-path">app.py</span>
      </div>
      <div className="map-node node-b">
        <span className="file-dot green" />
        test_auth<span className="node-path">tests/test_auth.py</span>
      </div>
      <div className="map-node node-center">
        <span className="file-dot" />
        authenticate_user<span className="node-path">auth/service.py:25</span>
      </div>
      <div className="map-node node-c">
        <span className="file-dot" />
        validate_login<span className="node-path">auth/validators.py</span>
      </div>
      <div className="map-node node-d">
        <span className="file-dot blue" />
        lookup_user<span className="node-path">users/service.py</span>
      </div>
      <div className="map-node node-e">
        <span className="file-dot orange" />
        create_access_token<span className="node-path">auth/tokens.py:23</span>
      </div>
      <span className="map-caption">SOURCE → RELATIONSHIPS → CONTEXT</span>
    </div>
  );
}
export default function ProductPreview() {
  const [tab, setTab] = useState('Ask');
  return (
    <section className="product-preview" aria-label="Illustrative CodeSage product preview">
      <div className="preview-top">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>
          sample-app <ChevronRight size={12} /> Workspace
        </span>
        <span className="preview-label">Interactive preview</span>
      </div>
      <div className="preview-body">
        <aside className="preview-sidebar">
          <Logo compact />
          <small>WORKSPACE</small>
          {[
            ['Ask', Search],
            ['Call graph', GitBranch],
            ['Quality', ShieldCheck],
          ].map(([label, Icon]) => {
            const Component = Icon as typeof Search;
            return (
              <button
                key={String(label)}
                className={tab === label ? 'active' : ''}
                onClick={() => setTab(String(label))}
              >
                <Component size={15} />
                {String(label)}
              </button>
            );
          })}
          <div className="preview-repo">
            <span className="file-dot green" />
            sample-app
            <br />
            <small>Python · sample repository</small>
          </div>
        </aside>
        <div className="preview-content">
          {tab === 'Ask' ? (
            <>
              <div className="preview-question">How does authentication work here?</div>
              <div className="preview-answer">
                <span className="mini-sage">
                  <Logo compact />
                </span>
                <h3>A clear path from login to request.</h3>
                <p>
                  Credentials are validated, the user is resolved, and a signed access token is
                  issued. Middleware checks that token on subsequent requests.
                </p>
                <div className="preview-citations">
                  <span>
                    <FileCode2 size={12} />
                    service.py:25
                  </span>
                  <span>
                    <FileCode2 size={12} />
                    tokens.py:23
                  </span>
                </div>
                <div className="preview-code">
                  <code>
                    <span>def</span> authenticate_user(payload):
                    <br />
                    &nbsp;&nbsp;credentials = validate_login_payload(payload)
                    <br />
                    &nbsp;&nbsp;user = lookup_user_for_auth(credentials)
                    <br />
                    &nbsp;&nbsp;<span>return</span> create_access_token(user)
                  </code>
                  <small>Illustrative excerpt</small>
                </div>
              </div>
              <div className="preview-composer">
                Ask a follow-up question… <ArrowUp size={14} />
              </div>
            </>
          ) : tab === 'Call graph' ? (
            <CodeMap compact />
          ) : (
            <div className="preview-quality">
              <span className="eyebrow">ILLUSTRATIVE QUALITY REPORT</span>
              <h3>Confidence, with evidence.</h3>
              {[
                ['Faithfulness', 92],
                ['Topology recall', 86],
                ['Intent accuracy', 95],
              ].map(([l, v]) => (
                <div key={l}>
                  <span>{l}</span>
                  <b>{v}%</b>
                  <div className="meter">
                    <i style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
