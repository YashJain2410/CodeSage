'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Braces, GitBranch, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import AnimatedBackground from './AnimatedBackground';
import ProductPreview, { CodeMap } from './ProductPreview';
import { Logo } from './UI';
import { useCodeSageStore } from '@/store/useCodeSageStore';
const Reveal = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 22 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.5 }}
  >
    {children}
  </motion.div>
);
export default function Landing() {
  const router = useRouter(),
    repoRef = useRef<HTMLInputElement>(null);
  const startDemo = () => {
    useCodeSageStore.getState().setMode('demo');
    router.push('/chat');
  };
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        repoRef.current?.focus();
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return (
    <>
      <Navbar />
      <main id="main" className="landing">
        <section className="hero">
          <AnimatedBackground />
          <div className="hero-grid">
            <div className="hero-copy">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <span className="hero-kicker">
                  <span className="file-dot" /> CODEBASE INTELLIGENCE
                </span>
                <h1>
                  Your codebase,
                  <br />
                  finally <em>understood.</em>
                </h1>
                <p>
                  Go from unfamiliar code to a clear understanding.
                  <br className="desktop-only" /> Ask questions. Trace connections. Find your next
                  move.
                </p>
                <div className="hero-actions">
                  <Link className="button lavender large" href="/repositories">
                    Connect a repository <ArrowUpRight size={18} />
                  </Link>
                  <button className="button hero-secondary large" onClick={startDemo}>
                    Explore the demo <ArrowRight size={17} />
                  </button>
                </div>
                <span className="hero-footnote">Built for Python, JavaScript & TypeScript.</span>
              </motion.div>
            </div>
            <div className="hero-visual">
              <span className="visual-index">FIG. 01 / THE BIGGER PICTURE</span>
              <CodeMap />
              <div className="visual-source">
                <div>
                  <FileLabel /> <span>auth/service.py</span>
                  <span className="visual-source-status">Context found</span>
                </div>
                <code>
                  <span>def</span> authenticate_user(payload):
                  <br />
                  &nbsp;&nbsp;user = lookup_user_for_auth(payload)
                  <br />
                  &nbsp;&nbsp;<span>return</span> create_access_token(user)
                </code>
                <small>Illustrative source</small>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <span>Less searching. More understanding.</span>
            <a href="#product">
              See the whole picture <ArrowDown size={15} />
            </a>
          </div>
        </section>
        <div className="technology-strip">
          <span>BUILT ON A STRONG FOUNDATION</span>
          <b>tree-sitter</b>
          <b>LangGraph</b>
          <b>Qdrant</b>
          <b>NetworkX</b>
          <b>RAGAS</b>
        </div>
        <section id="product" className="landing-section">
          <Reveal className="section-intro">
            <span className="eyebrow">01 / THE PRODUCT</span>
            <h2>
              Code is connected.
              <br />
              Your understanding should be, too.
            </h2>
            <p>
              A function is only part of the story. CodeSage brings its callers, dependencies, and
              tests into the conversation.
            </p>
          </Reveal>
          <Reveal>
            <ProductPreview />
          </Reveal>
          <div className="feature-grid">
            <Reveal className="feature-card lavender-card">
              <Braces size={28} />
              <span className="feature-number">01</span>
              <h3>
                Answers that
                <br />
                show their work.
              </h3>
              <p>Ask in plain language. Follow citations straight to the code behind an answer.</p>
              <div className="feature-art">
                <span>“Where is this token validated?”</span>
                <code>auth/middleware.py:25 ↗</code>
              </div>
              <Link href="/chat">
                Explore code chat <ArrowUpRight size={17} />
              </Link>
            </Reveal>
            <Reveal className="feature-card dark-card">
              <GitBranch size={28} />
              <span className="feature-number">02</span>
              <h3>
                See beyond
                <br />a single function.
              </h3>
              <p>
                Trace callers, follow dependencies, and understand the ripple effect of a change.
              </p>
              <div className="feature-art mini-map">
                <span>authenticate_user</span>
                <i />
                <div>
                  <code>validate_login</code>
                  <code>create_token</code>
                </div>
              </div>
              <Link href="/graph">
                Explore the graph <ArrowUpRight size={17} />
              </Link>
            </Reveal>
            <Reveal className="feature-card cream-card">
              <ShieldCheck size={28} />
              <span className="feature-number">03</span>
              <h3>
                Quality you
                <br />
                can measure.
              </h3>
              <p>Inspect retrieval and answer quality, compare runs, and surface regressions.</p>
              <div className="feature-art quality-art">
                <span>
                  Faithfulness <b>92%</b>
                </span>
                <div className="meter">
                  <i style={{ width: '92%' }} />
                </div>
                <small>Illustrative evaluation</small>
              </div>
              <Link href="/eval">
                Explore evaluations <ArrowUpRight size={17} />
              </Link>
            </Reveal>
          </div>
        </section>
        <section id="how-it-works" className="landing-section how-section">
          <Reveal className="section-intro">
            <span className="eyebrow">02 / FROM SOURCE TO CLARITY</span>
            <h2>
              A shorter path
              <br />
              to “I get it.”
            </h2>
          </Reveal>
          <div className="steps">
            {[
              [
                'Bring your code',
                'Upload a repository archive or index a folder on your backend. GitHub import is ready for the planned API.',
              ],
              [
                'Connect the dots',
                'CodeSage parses symbols, builds call relationships, and retrieves context around your question.',
              ],
              [
                'Find your answer',
                'Read an explanation, inspect the evidence, and explore what happens next.',
              ],
            ].map(([title, body], i) => (
              <Reveal key={title} className="step">
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </Reveal>
            ))}
          </div>
        </section>
        <section className="landing-cta">
          <Reveal>
            <span className="eyebrow">YOUR NEXT GOOD QUESTION STARTS HERE</span>
            <h2>
              Make yourself at home
              <br />
              in any codebase.
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = repoRef.current?.value.trim();
                router.push(
                  value ? `/repositories?source=${encodeURIComponent(value)}` : '/repositories',
                );
              }}
              className="repo-quick-input"
            >
              <input
                ref={repoRef}
                aria-label="Repository URL or backend folder path"
                placeholder="GitHub URL or backend folder path"
              />
              <button className="button primary" type="submit">
                Get started <ArrowUpRight size={17} />
              </button>
            </form>
            <button className="text-button" onClick={startDemo}>
              Or take a look around the sample workspace <ArrowRight size={14} />
            </button>
          </Reveal>
        </section>
      </main>
      <footer className="landing-footer">
        <Link href="/">
          <Logo />
        </Link>
        <p>A little context changes everything.</p>
        <nav aria-label="Footer">
          <Link href="/docs">Documentation</Link>
          <Link href="/settings">Connection settings</Link>
          <Link href="/workspace">Workspace ↗</Link>
        </nav>
        <small>CodeSage · Codebase intelligence</small>
      </footer>
    </>
  );
}
function FileLabel() {
  return <Braces size={14} />;
}
