'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { demoMessage, demoRepo } from '@/lib/demo';
import type {
  Citation,
  Conversation,
  EvalRun,
  IndexProgress,
  Message,
  Repository,
} from '@/lib/types';
type Workspace = {
  repositories: Repository[];
  activeRepoId: string | null;
  conversations: Conversation[];
  activeConversationId: string | null;
  evalRuns: EvalRun[];
};
const empty = (): Workspace => ({
  repositories: [],
  activeRepoId: null,
  conversations: [],
  activeConversationId: null,
  evalRuns: [],
});
type Store = {
  sourceFiles: Record<string, Record<string, string>>;
  setSourceFiles: (id: string, files: Record<string, string>) => void;
  mode: 'live' | 'demo';
  live: Workspace;
  demo: Workspace;
  hydrated: boolean;
  selectedCitation: Citation | null;
  pendingPrompt: string | null;
  progress: IndexProgress | null;
  provider: string;
  model: string;
  setMode: (mode: 'live' | 'demo') => void;
  hydrate: () => void;
  upsertRepo: (repo: Repository) => void;
  replaceRepo: (oldId: string, repo: Repository) => void;
  removeRepo: (id: string) => void;
  selectRepo: (id: string) => void;
  newConversation: () => string | null;
  selectConversation: (id: string) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, update: Partial<Message>) => void;
  setCitation: (citation: Citation | null) => void;
  setPendingPrompt: (prompt: string | null) => void;
  setProgress: (progress: IndexProgress | null) => void;
  setModel: (provider: string, model: string) => void;
  addEvalRun: (run: EvalRun) => void;
  removeConversation: (id: string) => void;
};
export const useCodeSageStore = create<Store>()(
  persist(
    (set, get) => ({
      sourceFiles: {},
      setSourceFiles: (id, files) =>
        set((s) => ({ sourceFiles: { ...s.sourceFiles, [id]: files } })),
      mode: 'live',
      live: empty(),
      demo: empty(),
      hydrated: false,
      selectedCitation: null,
      pendingPrompt: null,
      progress: null,
      provider: 'gemini',
      model: 'gemini-3.5-flash',
      hydrate: () => set({ hydrated: true }),
      setMode: (mode) =>
        set((s) => ({
          mode,
          selectedCitation: null,
          progress: null,
          ...(mode === 'demo' && !s.demo.repositories.length
            ? {
                demo: {
                  repositories: [demoRepo],
                  activeRepoId: demoRepo.id,
                  conversations: [
                    {
                      id: 'demo-conversation',
                      repoId: demoRepo.id,
                      title: 'Understanding authentication',
                      messages: [
                        {
                          id: 'demo-question',
                          role: 'user',
                          content: 'How does authentication work in this repository?',
                          citations: [],
                          timestamp: demoMessage.timestamp,
                        },
                        demoMessage,
                      ],
                      updatedAt: demoMessage.timestamp,
                    },
                  ],
                  activeConversationId: 'demo-conversation',
                  evalRuns: [],
                },
              }
            : {}),
        })),
      upsertRepo: (repo) =>
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            repositories: [...s[s.mode].repositories.filter((r) => r.id !== repo.id), repo],
            activeRepoId: repo.id,
          },
        })),
      replaceRepo: (oldId, repo) =>
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            repositories: s[s.mode].repositories.map((r) => (r.id === oldId ? repo : r)),
            activeRepoId: s[s.mode].activeRepoId === oldId ? repo.id : s[s.mode].activeRepoId,
            conversations: s[s.mode].conversations.map((c) =>
              c.repoId === oldId ? { ...c, repoId: repo.id } : c,
            ),
          },
          sourceFiles: s.sourceFiles[oldId]
            ? { ...s.sourceFiles, [repo.id]: s.sourceFiles[oldId] }
            : s.sourceFiles,
        })),
      removeRepo: (id) =>
        set((s) => {
          const repositories = s[s.mode].repositories.filter((r) => r.id !== id);
          const conversations = s[s.mode].conversations.filter((c) => c.repoId !== id);
          const sourceFiles = { ...s.sourceFiles };
          delete sourceFiles[id];
          return {
            [s.mode]: {
              ...s[s.mode],
              repositories,
              conversations,
              activeRepoId:
                s[s.mode].activeRepoId === id
                  ? repositories.find((r) => r.status === 'ready')?.id || null
                  : s[s.mode].activeRepoId,
              activeConversationId: conversations.some(
                (c) => c.id === s[s.mode].activeConversationId,
              )
                ? s[s.mode].activeConversationId
                : null,
            },
            sourceFiles,
            selectedCitation: null,
          };
        }),
      selectRepo: (id) =>
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            activeRepoId: id,
            activeConversationId: s[s.mode].conversations.find((c) => c.repoId === id)?.id || null,
          },
          selectedCitation: null,
        })),
      newConversation: () => {
        const s = get(),
          w = s[s.mode];
        if (!w.activeRepoId) return null;
        const id = crypto.randomUUID();
        set({
          [s.mode]: {
            ...w,
            conversations: [
              {
                id,
                repoId: w.activeRepoId,
                title: 'New conversation',
                messages: [],
                updatedAt: new Date().toISOString(),
              },
              ...w.conversations,
            ].slice(0, 50),
            activeConversationId: id,
          },
          selectedCitation: null,
        });
        return id;
      },
      selectConversation: (id) =>
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            activeConversationId: id,
            activeRepoId:
              s[s.mode].conversations.find((c) => c.id === id)?.repoId || s[s.mode].activeRepoId,
          },
          selectedCitation: null,
        })),
      addMessage: (message) => {
        if (!get()[get().mode].activeConversationId) get().newConversation();
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            conversations: s[s.mode].conversations.map((c) =>
              c.id === s[s.mode].activeConversationId
                ? {
                    ...c,
                    title: c.messages.length ? c.title : message.content.slice(0, 55),
                    messages: [...c.messages, message],
                    updatedAt: new Date().toISOString(),
                  }
                : c,
            ),
          },
        }));
      },
      updateMessage: (id, update) =>
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            conversations: s[s.mode].conversations.map((c) => ({
              ...c,
              messages: c.messages.map((m) => (m.id === id ? { ...m, ...update } : m)),
            })),
          },
        })),
      removeConversation: (id) =>
        set((s) => ({
          [s.mode]: {
            ...s[s.mode],
            conversations: s[s.mode].conversations.filter((c) => c.id !== id),
            activeConversationId:
              s[s.mode].activeConversationId === id ? null : s[s.mode].activeConversationId,
          },
        })),
      setCitation: (selectedCitation) => set({ selectedCitation }),
      setPendingPrompt: (pendingPrompt) => set({ pendingPrompt }),
      setProgress: (progress) => set({ progress }),
      setModel: (provider, model) => set({ provider, model }),
      addEvalRun: (run) =>
        set((s) => ({
          [s.mode]: { ...s[s.mode], evalRuns: [...s[s.mode].evalRuns, run].slice(-20) },
        })),
    }),
    {
      name: 'codesage-next-workspace-v1',
      partialize: (s) => ({
        mode: s.mode,
        live: s.live,
        demo: s.demo,
        provider: s.provider,
        model: s.model,
      }),
      onRehydrateStorage: () => (s) => s?.hydrate(),
    },
  ),
);
export const useWorkspace = () => useCodeSageStore((s) => s[s.mode]);
