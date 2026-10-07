'use client';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  FileCode2,
  MessageSquare,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import { api, normalizeCitations } from '@/lib/api';
import { parseCitations } from '@/lib/protocol.mjs';
import { demoAnswer, examplePrompts } from '@/lib/demo';
import type { Message } from '@/lib/types';
import { useCodeSageStore, useWorkspace } from '@/store/useCodeSageStore';
import CodeViewer from './CodeViewer';
import CodeCitation from './CodeCitation';
import Markdown from './Markdown';
import { Badge, ConnectAction, EmptyState, ErrorNotice, Logo, Spinner, download } from './UI';
import { useToast } from './Providers';
const ChatMessage = memo(function ChatMessage({
  message,
  streaming,
  onCitation,
  retry,
}: {
  message: Message;
  streaming: boolean;
  onCitation: () => void;
  retry: () => void;
}) {
  const toast = useToast();
  return (
    <article className={`chat-message ${message.role}`}>
      <div className="message-avatar">{message.role === 'assistant' ? <Logo compact /> : 'Y'}</div>
      <div className="message-body">
        <div className="message-meta">
          <b>{message.role === 'assistant' ? 'CodeSage' : 'You'}</b>
          {message.intent && (
            <Badge
              tone={
                /BUG/.test(message.intent)
                  ? 'red'
                  : /TEST/.test(message.intent)
                    ? 'green'
                    : 'purple'
              }
            >
              {message.intent.replace(/_/g, ' ')}
            </Badge>
          )}
          {message.confidence != null && (
            <span className="confidence-label">
              {Math.round(message.confidence * 100)}% confidence
            </span>
          )}
          <button
            className="icon-button"
            aria-label="Copy message"
            disabled={!message.content}
            onClick={() =>
              navigator.clipboard
                .writeText(message.content)
                .then(() => toast('Message copied.'))
                .catch(() => toast('Clipboard is unavailable.'))
            }
          >
            <Copy size={13} />
          </button>
        </div>
        <Markdown text={message.content} />
        {streaming && (
          <span className="streaming-cursor" aria-label="Receiving answer">
            ▊
          </span>
        )}
        {message.citations.length > 0 && (
          <div className="message-sources">
            <small>
              <FileCode2 size={12} /> SOURCES
            </small>
            <div>
              {message.citations.map((c) => (
                <CodeCitation key={`${c.filepath}:${c.line}`} citation={c} onSelect={onCitation} />
              ))}
            </div>
          </div>
        )}
        {message.error && (
          <>
            <ErrorNotice error={message.error} />
            <button className="text-button" onClick={retry}>
              <RotateCcw size={13} />
              Retry question
            </button>
          </>
        )}
        {message.stopped && <small className="muted">Response stopped.</small>}
      </div>
    </article>
  );
});
export default function ChatPanel() {
  const w = useWorkspace(),
    store = useCodeSageStore(),
    repo = w.repositories.find((r) => r.id === w.activeRepoId),
    conversation = w.conversations.find((c) => c.id === w.activeConversationId);
  const [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [streamingId, setStreamingId] = useState<string | null>(null),
    [mobileTab, setMobileTab] = useState('chat'),
    [history, setHistory] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null),
    bottom = useRef<HTMLDivElement>(null),
    controller = useRef<AbortController | null>(null),
    sending = useRef(false),
    requestScope = useRef<string | null>(null);
  const toast = useToast();
  useEffect(() => {
    if (store.pendingPrompt) {
      setInput(store.pendingPrompt);
      useCodeSageStore.getState().setPendingPrompt(null);
      inputRef.current?.focus();
    }
  }, [store.pendingPrompt]);
  useEffect(() => {
    const scope = `${store.mode}:${w.activeRepoId}:${w.activeConversationId}`;
    if (requestScope.current && requestScope.current !== scope) {
      controller.current?.abort();
      setBusy(false);
      setStreamingId(null);
      sending.current = false;
      requestScope.current = null;
    }
  }, [store.mode, w.activeRepoId, w.activeConversationId]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const el = bottom.current?.parentElement;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 250)
      bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation?.messages]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        if (document.activeElement === inputRef.current) {
          setMobileTab('code');
          document.getElementById('source-viewer')?.focus();
        } else {
          setMobileTab('chat');
          inputRef.current?.focus();
        }
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  const send = useCallback(
    async (text: string) => {
      if (sending.current || !repo || repo.status !== 'ready' || !text.trim()) return;
      sending.current = true;
      const s = useCodeSageStore.getState();
      if (!s[s.mode].activeConversationId) s.newConversation();
      requestScope.current = `${s.mode}:${repo.id}:${useCodeSageStore.getState()[s.mode].activeConversationId}`;
      const id = crypto.randomUUID(),
        now = new Date().toISOString();
      s.addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: text.trim(),
        citations: [],
        timestamp: now,
      });
      s.addMessage({ id, role: 'assistant', content: '', citations: [], timestamp: now });
      setInput('');
      setBusy(true);
      setStreamingId(id);
      const abort = new AbortController();
      controller.current = abort;
      let answer = '',
        citations: Message['citations'] = [];
      try {
        if (s.mode === 'demo') {
          const response = demoAnswer(text),
            chunks = (response.answer || '').match(/.{1,30}(?:\s|$)|.{1,30}/gs) || [];
          s.updateMessage(id, { intent: response.intent, confidence: response.confidence });
          for (const chunk of chunks) {
            if (abort.signal.aborted) throw new DOMException('Stopped', 'AbortError');
            answer += chunk;
            s.updateMessage(id, { content: answer });
            await new Promise((r) => setTimeout(r, 14));
          }
          citations = normalizeCitations(response.citations);
        } else {
          for await (const event of api.query(
            text.trim(),
            repo.id,
            s.provider,
            s.model,
            abort.signal,
          )) {
            if (event.error || event.type === 'error')
              throw new Error(event.error || event.message || 'Answer generation failed.');
            if (event.answer != null) answer = event.answer;
            else answer += event.token || event.text || '';
            if (event.citations) citations = normalizeCitations(event.citations);
            s.updateMessage(id, {
              content: answer,
              ...(event.intent ? { intent: event.intent } : {}),
              ...(event.confidence != null ? { confidence: event.confidence } : {}),
              citations,
            });
          }
        }
        if (!answer.trim())
          throw new Error('The backend returned an empty answer. Try asking again.');
        const all = [...citations, ...parseCitations(answer)];
        s.updateMessage(id, {
          content: answer,
          citations: all.filter(
            (c, i) => all.findIndex((x) => x.filepath === c.filepath && x.line === c.line) === i,
          ),
        });
      } catch (error) {
        s.updateMessage(
          id,
          abort.signal.aborted
            ? { stopped: true }
            : { error: error instanceof Error ? error.message : 'The request failed.' },
        );
      } finally {
        if (controller.current === abort) {
          setBusy(false);
          setStreamingId(null);
          sending.current = false;
        }
      }
    },
    [repo],
  );
  const ready = repo?.status === 'ready';
  const newChat = () => {
    controller.current?.abort();
    store.newConversation();
    setHistory(false);
    setInput('');
  };
  return (
    <div className="chat-page">
      <header className="chat-toolbar">
        <div>
          <MessageSquare size={17} />
          <h1>{conversation?.title || 'Ask CodeSage'}</h1>
        </div>
        <div>
          <button
            className="icon-button"
            aria-label="Show conversation history"
            onClick={() => setHistory(!history)}
          >
            <MessageSquare size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Export conversation"
            disabled={!conversation?.messages.length}
            onClick={() =>
              download(
                `${conversation?.title || 'conversation'}.md`,
                (store.mode === 'demo'
                  ? '# CodeSage sample conversation\n\n'
                  : '# CodeSage conversation\n\n') +
                  (conversation?.messages
                    .map(
                      (m) =>
                        `## ${m.role === 'user' ? 'You' : 'CodeSage'}\n\n${m.content}\n\n${m.citations.map((c) => `${c.filepath}:${c.line}`).join('\n')}`,
                    )
                    .join('\n\n') || ''),
                'text/markdown',
              )
            }
          >
            <Download size={16} />
          </button>
          <button className="button small secondary" onClick={newChat} disabled={!ready}>
            <Plus size={15} />
            New chat
          </button>
        </div>
      </header>
      {history && (
        <section className="chat-history">
          <h2>Saved conversations</h2>
          {w.conversations.map((c) => (
            <div key={c.id}>
              <button
                onClick={() => {
                  store.selectConversation(c.id);
                  setHistory(false);
                }}
              >
                {c.title}
              </button>
              <button
                className="icon-button"
                aria-label={`Remove conversation ${c.title}`}
                onClick={() => store.removeConversation(c.id)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!w.conversations.length && <p>No saved conversations yet.</p>}
        </section>
      )}
      <div className="mobile-panel-tabs" role="tablist" aria-label="Chat panels">
        <button
          role="tab"
          aria-selected={mobileTab === 'chat'}
          onClick={() => setMobileTab('chat')}
        >
          Conversation
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === 'code'}
          onClick={() => setMobileTab('code')}
        >
          Source context {store.selectedCitation && <span className="file-dot" />}
        </button>
      </div>
      <div className="chat-grid">
        <section
          className={`chat-thread ${mobileTab === 'chat' ? 'mobile-visible' : ''}`}
          aria-label="Conversation"
        >
          <div className="message-list" role="log" aria-live="polite">
            {!ready ? (
              <EmptyState
                icon={<MessageSquare size={30} />}
                title={
                  repo ? 'Your repository is getting ready.' : 'Good answers start with your code.'
                }
                description={
                  repo
                    ? 'Wait for indexing to complete before asking a question.'
                    : 'Connect a repository, or explore the sample workspace to see how it feels.'
                }
                action={
                  <>
                    <ConnectAction />
                    <button className="text-button" onClick={() => store.setMode('demo')}>
                      Explore sample workspace <ArrowUpRight size={14} />
                    </button>
                  </>
                }
              />
            ) : !conversation?.messages.length ? (
              <div className="chat-welcome">
                <span className="welcome-logo">
                  <Logo compact />
                </span>
                <span className="eyebrow">KNOW YOUR CODE</span>
                <h2>
                  What would you
                  <br />
                  like to understand?
                </h2>
                <p>Explore {repo.name} with answers grounded in source.</p>
                <div className="welcome-prompts">
                  {examplePrompts.map((p) => (
                    <button key={p.intent} onClick={() => setInput(p.query)}>
                      <Badge tone="purple">{p.intent}</Badge>
                      <span>{p.query}</span>
                      <ArrowUpRight size={14} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.messages.map((m, i) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  streaming={streamingId === m.id}
                  onCitation={() => setMobileTab('code')}
                  retry={() => {
                    const user = conversation.messages
                      .slice(0, i)
                      .reverse()
                      .find((x) => x.role === 'user');
                    if (user && !busy) send(user.content);
                  }}
                />
              ))
            )}
            <div ref={bottom} />
          </div>
          <div className="chat-input-area">
            <form
              className="chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                ref={inputRef}
                aria-label="Ask a question about your codebase"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your codebase…"
                disabled={!ready || busy}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <div className="composer-bottom">
                <span>
                  <FolderName name={repo?.name || 'No repository'} />
                </span>
                {busy ? (
                  <button
                    className="send-button"
                    type="button"
                    aria-label="Stop response"
                    onClick={() => controller.current?.abort()}
                  >
                    <Square size={15} />
                  </button>
                ) : (
                  <button
                    className="send-button"
                    type="submit"
                    aria-label="Send question"
                    disabled={!ready || !input.trim()}
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>
            </form>
            <div className="composer-hint">
              <span>
                {busy ? (
                  <>
                    <Spinner />{' '}
                    {store.mode === 'demo'
                      ? 'Playing sample response'
                      : 'Working through your code'}
                    …
                  </>
                ) : (
                  <>
                    <Check size={12} />{' '}
                    {store.mode === 'demo'
                      ? 'Prepared example · sample source'
                      : 'Check source citations before making changes'}
                  </>
                )}
              </span>
              <span>↵ Send · ⇧↵ New line</span>
            </div>
          </div>
        </section>
        <div className={`source-panel ${mobileTab === 'code' ? 'mobile-visible' : ''}`}>
          <CodeViewer />
        </div>
      </div>
    </div>
  );
}
function FolderName({ name }: { name: string }) {
  return (
    <>
      <FileCode2 size={13} />
      {name}
    </>
  );
}
