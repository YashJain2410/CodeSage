'use client';

import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Copy, Loader2, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { useCodeSageStore } from '@/store/useCodeSageStore';
import { CodeCitation, parseCitations } from './CodeCitation';
import type { Message } from '@/lib/api';

const intentStyle = {
  BUG_ANALYSIS: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
  IMPACT_ANALYSIS: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200',
  EXPLANATION: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  GENERAL: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
};

const intentLabel = {
  BUG_ANALYSIS: 'Bug Analysis',
  IMPACT_ANALYSIS: 'Impact Analysis',
  EXPLANATION: 'Explanation',
  GENERAL: 'General'
};

export function ChatPanel() {
  const { messages, addMessage, updateLastMessage, pendingChatPrompt, setPendingChatPrompt, repoId, llmProvider } = useCodeSageStore();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (pendingChatPrompt) {
      setInput(pendingChatPrompt);
      setPendingChatPrompt(null);
      inputRef.current?.focus();
    }
  }, [pendingChatPrompt, setPendingChatPrompt]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setStreaming(true);
    setInput('');
    addMessage({ id: crypto.randomUUID(), role: 'user', content: text, citations: [], timestamp: new Date() });
    addMessage({ id: crypto.randomUUID(), role: 'assistant', content: '', citations: [], intent: 'GENERAL', timestamp: new Date() });

    let accumulated = '';
    let responseCitations: { filepath: string; line: number }[] = [];
    try {
      if (repoId) {
        const provider = llmProvider === 'google' ? 'gemini' : llmProvider;
        const response = await api.query(repoId, text, provider);
        accumulated = response.answer;
        responseCitations = response.citations.flatMap((citation) => parseCitations(citation).map(({ filepath, line }) => ({ filepath, line })));
        updateLastMessage(accumulated, { intent: response.intent as Message['intent'] });
      } else {
        accumulated = 'Index a repository first, then I can answer with source-backed citations like src/auth/middleware.py:47.';
        updateLastMessage(accumulated);
      }
      const citations = [...responseCitations, ...parseCitations(accumulated).map(({ filepath, line }) => ({ filepath, line }))]
        .filter((citation, index, all) => all.findIndex((candidate) => candidate.filepath === citation.filepath && candidate.line === citation.line) === index);
      updateLastMessage(accumulated, { citations, intent: citations.length ? 'EXPLANATION' : 'GENERAL' });
    } catch (error) {
      updateLastMessage(error instanceof Error ? error.message : 'Streaming failed', { intent: 'BUG_ANALYSIS' });
    } finally {
      setStreaming(false);
    }
  }, [addMessage, input, llmProvider, repoId, streaming, updateLastMessage]);

  return (
    <section className="flex h-full min-h-[640px] flex-col rounded-4xl border border-white/70 bg-offwhite p-4 shadow-xl dark:border-darkBorder dark:bg-darkCard">
      <div className="flex-1 overflow-y-auto px-1 py-2">
        {messages.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-primary/15 text-primary"><Bot className="h-9 w-9" /></div>
              <h2 className="text-3xl font-black">Ask your codebase anything.</h2>
              <p className="mt-3 max-w-md text-[var(--muted)]">Answers stream here with clickable file citations once a repository is indexed.</p>
            </div>
          </div>
        ) : (
          messages.map((message, index) => <ChatMessage key={message.id} message={message} streaming={streaming && message === messages[messages.length - 1]} onRetry={() => setInput(messages[index - 1]?.role === 'user' ? messages[index - 1].content : '')} />)
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-4 rounded-4xl border border-lavender-200 bg-white p-2 shadow-lg dark:border-darkBorder dark:bg-darkBg">
        {streaming ? <div className="px-4 py-2 text-xs font-bold text-primary"><span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />Streaming...</div> : null}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Ask anything about your codebase..."
            className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-4 py-3 outline-none"
            disabled={streaming}
          />
          <button onClick={() => void send()} disabled={streaming} aria-label="Send message" className="focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60">
            {streaming ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </section>
  );
}

const ChatMessage = memo(function ChatMessage({ message, streaming, onRetry }: { message: Message; streaming: boolean; onRetry: () => void }) {
  const assistant = message.role === 'assistant';
  return (
    <article className={`mb-6 flex ${assistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[86%] gap-3 ${assistant ? '' : 'flex-row-reverse'}`}>
        {assistant ? <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white"><Bot className="h-5 w-5" /></div> : null}
        <div>
          {assistant && message.intent ? <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${intentStyle[message.intent]}`}>{intentLabel[message.intent]}</div> : null}
          <div className={`rounded-3xl px-5 py-4 leading-7 shadow-sm ${assistant ? 'bg-white text-deep dark:bg-darkBg dark:text-white' : 'bg-deep text-white'}`}>
            <AnswerContent content={message.content} />
            {streaming ? <span className="ml-1 animate-blink">▊</span> : null}
          </div>
          {assistant && message.content ? <div className="mt-2 flex gap-2"><button onClick={() => navigator.clipboard.writeText(message.content)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--muted)] hover:bg-primary/10"><Copy className="h-3 w-3" />Copy</button><button onClick={onRetry} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-[var(--muted)] hover:bg-primary/10"><RotateCcw className="h-3 w-3" />Retry</button></div> : null}
          {message.citations.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.citations.map((citation) => <CodeCitation key={`${citation.filepath}:${citation.line}`} {...citation} />)}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
});

function AnswerContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return <div className="answer-content">{parts.flatMap((part, index) => {
    if (part.startsWith('```')) {
      const [first, ...lines] = part.slice(3, -3).split('\n');
      return <pre key={`code-${index}`} className="my-3 overflow-x-auto rounded-xl bg-black/90 p-3 font-mono text-xs leading-6 text-lavender-100"><code data-language={first}>{lines.join('\n')}</code></pre>;
    }
    return renderMarkdownBlocks(part, index);
  })}</div>;
}

function renderMarkdownBlocks(markdown: string, offset: number): ReactNode[] {
  const lines = markdown.split('\n');
  const blocks: ReactNode[] = [];

  for (let line = 0; line < lines.length;) {
    const value = lines[line].trim();
    if (!value) { line += 1; continue; }
    if (/^---+$/.test(value)) { blocks.push(<hr key={`rule-${offset}-${line}`} className="my-5 border-white/10 dark:border-white/10" />); line += 1; continue; }

    const heading = value.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const text = inlineMarkdown(heading[2]);
      const key = `heading-${offset}-${line}`;
      if (heading[1].length === 1) blocks.push(<h2 key={key} className="mb-3 mt-5 text-xl font-bold leading-7">{text}</h2>);
      else if (heading[1].length === 2) blocks.push(<h3 key={key} className="mb-2 mt-5 text-lg font-bold leading-6">{text}</h3>);
      else blocks.push(<h4 key={key} className="mb-2 mt-4 text-base font-semibold">{text}</h4>);
      line += 1;
      continue;
    }

    const unordered = value.match(/^[-*+]\s+(.+)$/);
    const ordered = value.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const items: ReactNode[] = [];
      const pattern = unordered ? /^[-*+]\s+(.+)$/ : /^\d+[.)]\s+(.+)$/;
      while (line < lines.length) {
        const item = lines[line].trim().match(pattern);
        if (!item) break;
        items.push(<li key={`${offset}-${line}`}>{inlineMarkdown(item[1])}</li>);
        line += 1;
      }
      const className = 'my-3 space-y-1 pl-5 marker:text-primary';
      blocks.push(unordered ? <ul key={`list-${offset}-${line}`} className={`list-disc ${className}`}>{items}</ul> : <ol key={`list-${offset}-${line}`} className={`list-decimal ${className}`}>{items}</ol>);
      continue;
    }

    const paragraph: string[] = [];
    while (line < lines.length) {
      const next = lines[line].trim();
      if (!next || /^---+$/.test(next) || /^(#{1,3})\s+/.test(next) || /^[-*+]\s+/.test(next) || /^\d+[.)]\s+/.test(next)) break;
      paragraph.push(next);
      line += 1;
    }
    blocks.push(<p key={`paragraph-${offset}-${line}`} className="my-3 first:mt-0">{inlineMarkdown(paragraph.join(' '))}</p>);
  }

  return blocks;
}

function inlineMarkdown(value: string): ReactNode[] {
  return value.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.9em] text-primary">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
    return part;
  });
}
