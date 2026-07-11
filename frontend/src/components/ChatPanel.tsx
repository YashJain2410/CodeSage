'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Loader2 } from 'lucide-react';
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
  const { messages, addMessage, updateLastMessage, pendingChatPrompt, setPendingChatPrompt, repoId } = useCodeSageStore();
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
        const response = await api.query(text);
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
  }, [addMessage, input, repoId, streaming, updateLastMessage]);

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
          messages.map((message) => <ChatMessage key={message.id} message={message} streaming={streaming && message === messages[messages.length - 1]} />)
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

const ChatMessage = memo(function ChatMessage({ message, streaming }: { message: Message; streaming: boolean }) {
  const assistant = message.role === 'assistant';
  return (
    <article className={`mb-6 flex ${assistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[86%] gap-3 ${assistant ? '' : 'flex-row-reverse'}`}>
        {assistant ? <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white"><Bot className="h-5 w-5" /></div> : null}
        <div>
          {assistant && message.intent ? <div className={`mb-2 inline-flex rounded-full px-3 py-1 text-xs font-bold ${intentStyle[message.intent]}`}>{intentLabel[message.intent]}</div> : null}
          <div className={`rounded-3xl px-5 py-4 leading-7 shadow-sm ${assistant ? 'bg-white text-deep dark:bg-darkBg dark:text-white' : 'bg-deep text-white'}`}>
            {message.content}
            {streaming ? <span className="ml-1 animate-blink">▊</span> : null}
          </div>
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
