'use client';

import { motion, useInView } from 'framer-motion';
import { ArrowUpRight, BarChart3, Bot, Check, ChevronDown, FolderOpen, GitBranch, Loader2, Search, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import { LlmProvider, useCodeSageStore } from '@/store/useCodeSageStore';

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-120px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} className={className}>
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [repo, setRepo] = useState('');
  const [sourceType, setSourceType] = useState<'git' | 'local'>('git');
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const { indexProgress, llmProvider, localFolderName, localFolderFileCount, setCurrentRepo, setLocalFolder, setLlmProvider, setRepoId, setIndexStatus, setIndexProgress } = useCodeSageStore();

  const providers: { value: LlmProvider; label: string; description: string }[] = [
    { value: 'openai', label: 'OpenAI', description: 'Best all-round code reasoning' },
    { value: 'anthropic', label: 'Anthropic', description: 'Long-context analysis' },
    { value: 'google', label: 'Google Gemini', description: 'Fast multimodal context' },
    { value: 'groq', label: 'Groq', description: 'Low-latency inference' },
    { value: 'ollama', label: 'Ollama', description: 'Local private models' }
  ];

  const selectedProvider = useMemo(() => providers.find((provider) => provider.value === llmProvider) || providers[0], [llmProvider]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const target = sourceType === 'git' ? repo.trim() : localFolderName ? `local://${localFolderName}` : '';
    if (!target) return;
    setLoading(true);
    setCurrentRepo(target);
    try {
      setIndexStatus('indexing');
      setIndexProgress({ status: 'indexing', files_indexed: 0, total_files: 0, current_phase: 'Building repository intelligence', progress_percent: 25, message: 'Indexing repository…' });
      const result = await api.indexRepository(target);
      setRepoId(result.repo_path);
      setIndexStatus('done');
      setIndexProgress({ status: 'done', files_indexed: result.nodes, total_files: result.nodes, current_phase: 'Ready', progress_percent: 100, message: `Indexed ${result.nodes} symbols and ${result.edges} relationships.` });
      router.push('/chat');
    } catch (error) {
      setIndexStatus('error');
      setIndexProgress({
        status: 'error',
        files_indexed: 0,
        total_files: 0,
        current_phase: 'Connection failed',
        progress_percent: 0,
        message: error instanceof Error ? error.message : 'Unable to start indexing'
      });
    } finally {
      setLoading(false);
    }
  };

  const onFolderSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setLocalFiles(files);
    const firstPath = files[0]?.webkitRelativePath || files[0]?.name || '';
    const folderName = firstPath.split('/')[0] || (files.length ? 'Selected folder' : null);
    setLocalFolder(folderName, files.length);
  };

  const words = ['Your', 'Codebase,', 'Finally', 'Understood.'];

  return (
    <div className="overflow-hidden bg-lavender-100 text-deep dark:bg-darkBg dark:text-offwhite">
      <section className="relative min-h-screen overflow-hidden bg-[#030018] px-5 pt-32 text-white">
        <img
          src="/images/spectral-hero.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col items-center justify-center text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-7 rounded-full border border-white/15 bg-white/10 px-5 py-2 text-sm font-bold text-lavender-200 backdrop-blur-md">
            AI-Powered Code Intelligence
          </motion.div>
          <h1 className="max-w-5xl text-balance text-6xl font-black leading-[0.95] tracking-[-0.03em] md:text-8xl">
            {words.map((word, index) => (
              <motion.span
                key={word}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.65 }}
                className="mr-4 inline-block"
              >
                {word}
              </motion.span>
            ))}
          </h1>
          <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mt-7 max-w-2xl text-lg font-medium leading-8 text-lavender-200 md:text-xl">
            Index any GitHub repo and chat with your code. Powered by RAG, call graph traversal, and semantic search.
          </motion.p>

          <motion.form initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }} onSubmit={onSubmit} className="mt-10 w-full max-w-4xl">
            <div className="mb-4 flex flex-col gap-3 rounded-4xl border border-white/15 bg-white/10 p-3 text-left shadow-2xl shadow-black/10 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex rounded-full bg-black/15 p-1 dark:bg-white/10">
                {[
                  { value: 'git', label: 'GitHub URL' },
                  { value: 'local', label: 'Local Folder' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSourceType(option.value as 'git' | 'local')}
                    className={`rounded-full px-4 py-2 text-sm font-bold ${sourceType === option.value ? 'bg-lavender-100 text-deep shadow-lg' : 'text-lavender-100 hover:bg-white/10'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <label className="relative flex min-w-[220px] items-center gap-3 rounded-full bg-lavender-100 px-4 py-2 text-deep shadow-sm">
                <span className="text-xs font-black uppercase tracking-widest text-primary">LLM</span>
                <select
                  value={llmProvider}
                  onChange={(event) => setLlmProvider(event.target.value as LlmProvider)}
                  className="w-full appearance-none bg-transparent pr-8 text-sm font-black outline-none"
                  aria-label="Choose LLM provider"
                >
                  {providers.map((provider) => (
                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-primary" />
              </label>
            </div>

            <div className="gradient-border-focus flex min-h-16 flex-col gap-3 rounded-[2rem] p-2 shadow-2xl shadow-black/20 sm:flex-row sm:items-center sm:rounded-full">
              {sourceType === 'git' ? (
                <>
                  <Search className="ml-4 hidden h-5 w-5 text-primary sm:block" />
                  <input
                    ref={inputRef}
                    value={repo}
                    onChange={(event) => setRepo(event.target.value)}
                    placeholder="https://github.com/username/repo"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 font-mono text-sm text-deep outline-none placeholder:text-deep/45 dark:text-white dark:placeholder:text-white/45 sm:px-2 sm:text-base"
                    aria-label="Repository URL"
                  />
                </>
              ) : (
                <>
                  <input ref={folderInputRef} type="file" multiple className="hidden" onChange={onFolderSelect} aria-label="Upload local code folder" {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} />
                  <button
                    type="button"
                    onClick={() => folderInputRef.current?.click()}
                    className="focus-ring ml-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-lavender-100 px-5 text-sm font-black text-deep hover:-translate-y-0.5 hover:shadow-lg dark:bg-white dark:text-deep"
                  >
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Choose Folder
                  </button>
                  <div className="min-w-0 flex-1 px-3 text-left">
                    <p className="truncate font-mono text-sm font-bold text-deep dark:text-white">{localFolderName || 'No local folder selected'}</p>
                    <p className="text-xs font-semibold text-deep/55 dark:text-white/55">{localFolderFileCount ? `${localFolderFileCount} files ready to index` : 'Select a project folder from local storage'}</p>
                  </div>
                </>
              )}
              <button
                type="submit"
                disabled={loading || (sourceType === 'git' ? !repo.trim() : !localFolderName)}
                className="shimmer-button focus-ring relative inline-flex h-12 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-5 text-sm font-bold text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 sm:px-7"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : sourceType === 'local' ? <Check className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                <span className="hidden sm:inline">{loading ? 'Indexing...' : sourceType === 'local' ? 'Upload & Index' : 'Index Repository'}</span>
              </button>
            </div>
            <p className="mt-3 text-center text-sm font-semibold text-lavender-200">
              Provider: {selectedProvider.label} · {selectedProvider.description}
            </p>
            {indexProgress ? (
              <div className="mt-5 rounded-3xl border border-white/15 bg-white/10 p-4 text-left backdrop-blur-md">
                <div className="mb-2 flex justify-between text-sm font-semibold text-lavender-100">
                  <span>{indexProgress.message}</span>
                  <span>{Math.round(indexProgress.progress_percent)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-lavender-300" style={{ width: `${indexProgress.progress_percent}%` }} />
                </div>
              </div>
            ) : null}
          </motion.form>
        </div>
      </section>

      <section className="bg-lavender-100 px-5 py-28 dark:bg-darkBg">
        <Reveal className="mx-auto max-w-5xl text-center">
          <h2 className="text-5xl font-black tracking-[-0.03em] md:text-7xl">Everything you need to understand any codebase.</h2>
        </Reveal>
        <div className="mx-auto mt-16 flex max-w-7xl snap-x gap-6 overflow-x-auto pb-6">
          <FeatureCard className="bg-cardPurple text-white" title="Semantic Code Search" icon={<Bot />} description="Ask natural-language questions and retrieve the exact files, functions, and snippets behind every answer.">
            <div className="mt-10 space-y-4 rounded-4xl bg-white/15 p-5 backdrop-blur">
              <div className="ml-auto w-4/5 rounded-full bg-white px-5 py-3 text-sm font-bold text-deep">Where is auth enforced?</div>
              <div className="w-5/6 rounded-3xl bg-deep/75 px-5 py-4 text-sm text-white">Start in src/auth/middleware.py:47, then inspect token renewal in services/session.ts:112.</div>
            </div>
          </FeatureCard>
          <FeatureCard className="bg-darkCard text-white" title="Call Graph Intelligence" icon={<GitBranch />} description="Map how functions, classes, and tests relate so impact analysis feels instant.">
            <div className="relative mt-12 h-44">
              {[['left-8 top-10'], ['left-40 top-3'], ['right-16 top-20'], ['left-56 bottom-2']].map(([pos], index) => (
                <span key={pos} className={`absolute ${pos} h-14 w-14 animate-float rounded-full bg-primary shadow-2xl shadow-primary/30`} style={{ animationDelay: `${index * 0.4}s` }} />
              ))}
              <svg className="absolute inset-0 h-full w-full opacity-60">
                <path d="M64 72 C150 20 180 40 250 92 M184 36 C250 130 280 100 350 102 M260 130 C220 180 170 170 120 150" stroke="#B8A9E0" strokeWidth="3" fill="none" strokeDasharray="9 10" />
              </svg>
            </div>
          </FeatureCard>
          <FeatureCard className="bg-[#F5F0E8] text-[#1d1d1f]" title="Eval Dashboard" icon={<BarChart3 />} description="Track faithfulness, citation precision, topology recall, and CI-quality thresholds.">
            <div className="mt-12 space-y-5">
              {['Faithfulness', 'Topology', 'Citations'].map((label, index) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm font-bold"><span>{label}</span><span>{92 - index * 5}%</span></div>
                  <div className="h-4 rounded-full bg-black/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${92 - index * 5}%` }} /></div>
                </div>
              ))}
            </div>
          </FeatureCard>
        </div>
      </section>

      <section className="bg-offwhite px-5 py-28 dark:bg-darkCard">
        <Reveal className="mx-auto max-w-5xl text-center">
          <h2 className="text-5xl font-black tracking-[-0.03em] md:text-7xl">From repo URL to useful answers.</h2>
        </Reveal>
        <div className="relative mx-auto mt-16 grid max-w-6xl gap-8 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-12 hidden border-t-2 border-dashed border-primary/30 md:block" />
          {[
            ['Paste Repo URL', 'Drop in a GitHub repository or local path. CodeSage queues the job and keeps the indexing state visible.'],
            ['AI Indexes Your Code', 'The backend chunks files, builds embeddings, extracts call relationships, and prepares the graph.'],
            ['Chat with Your Codebase', 'Ask questions, inspect cited source lines, and jump from answers into graph context.']
          ].map(([title, copy], index) => (
            <Reveal key={title} className="relative rounded-4xl bg-lavender-100 p-8 shadow-lg dark:bg-darkBg">
              <div className="mb-8 grid h-24 w-24 place-items-center rounded-full bg-primary text-4xl font-black text-white shadow-xl shadow-primary/25">{index + 1}</div>
              <h3 className="text-2xl font-black">{title}</h3>
              <p className="mt-4 leading-7 text-[var(--muted)]">{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-lavender-100 px-5 py-32 text-center dark:bg-darkCard">
        <Reveal className="mx-auto max-w-5xl">
          <p className="mb-6 text-lg font-bold text-primary dark:text-lavender-300">Trusted by developers who prefer evidence over guessing.</p>
          <h2 className="text-6xl font-black leading-none tracking-[-0.03em] md:text-8xl">Start exploring<br />your codebase.</h2>
          <LinkButton />
        </Reveal>
      </section>
    </div>
  );
}

function FeatureCard({ className, title, description, icon, children }: { className: string; title: string; description: string; icon: ReactNode; children: ReactNode }) {
  return (
    <article className={`min-h-[430px] min-w-[340px] snap-center rounded-4xl p-8 shadow-xl hover:-translate-y-1 hover:shadow-2xl md:min-w-[400px] ${className}`}>
      <div className="mb-6 grid h-12 w-12 place-items-center rounded-full bg-white/18">{icon}</div>
      <h3 className="text-3xl font-black tracking-tight">{title}</h3>
      <p className="mt-4 max-w-sm text-lg font-medium leading-7 opacity-85">{description}</p>
      {children}
    </article>
  );
}

function LinkButton() {
  return (
    <a href="/chat" className="focus-ring mx-auto mt-12 inline-flex h-16 items-center gap-3 rounded-full bg-deep px-10 text-lg font-bold text-white shadow-xl shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/25 active:translate-y-0 dark:bg-lavender-100 dark:text-deep">
      Open CodeSage <ArrowUpRight className="h-5 w-5" />
    </a>
  );
}
