import { create } from 'zustand';
import type { GraphData, IndexProgressEvent, Message } from '@/lib/api';

type IndexStatus = 'idle' | 'queued' | 'indexing' | 'building_graph' | 'done' | 'error';
export type LlmProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'ollama';

interface CodeSageState {
  currentRepo: string | null;
  localFolderName: string | null;
  localFolderFileCount: number;
  llmProvider: LlmProvider;
  repoId: string | null;
  jobId: string | null;
  indexStatus: IndexStatus;
  indexProgress: IndexProgressEvent | null;
  messages: Message[];
  selectedCitation: { filepath: string; line: number } | null;
  graphData: GraphData | null;
  pendingChatPrompt: string | null;
  setCurrentRepo: (value: string | null) => void;
  setLocalFolder: (name: string | null, fileCount?: number) => void;
  setLlmProvider: (value: LlmProvider) => void;
  setRepoId: (value: string | null) => void;
  setJobId: (value: string | null) => void;
  setIndexStatus: (value: IndexStatus) => void;
  setIndexProgress: (value: IndexProgressEvent | null) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string, patch?: Partial<Message>) => void;
  clearMessages: () => void;
  setSelectedCitation: (value: { filepath: string; line: number } | null) => void;
  setGraphData: (value: GraphData | null) => void;
  setPendingChatPrompt: (value: string | null) => void;
}

export const useCodeSageStore = create<CodeSageState>((set) => ({
  currentRepo: null,
  localFolderName: null,
  localFolderFileCount: 0,
  llmProvider: 'openai',
  repoId: null,
  jobId: null,
  indexStatus: 'idle',
  indexProgress: null,
  messages: [],
  selectedCitation: null,
  graphData: null,
  pendingChatPrompt: null,
  setCurrentRepo: (currentRepo) => set({ currentRepo }),
  setLocalFolder: (localFolderName, localFolderFileCount = 0) => set({ localFolderName, localFolderFileCount }),
  setLlmProvider: (llmProvider) => set({ llmProvider }),
  setRepoId: (repoId) => set({ repoId }),
  setJobId: (jobId) => set({ jobId }),
  setIndexStatus: (indexStatus) => set({ indexStatus }),
  setIndexProgress: (indexProgress) => set({ indexProgress }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content, patch) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last) messages[messages.length - 1] = { ...last, content, ...patch };
      return { messages };
    }),
  clearMessages: () => set({ messages: [] }),
  setSelectedCitation: (selectedCitation) => set({ selectedCitation }),
  setGraphData: (graphData) => set({ graphData }),
  setPendingChatPrompt: (pendingChatPrompt) => set({ pendingChatPrompt })
}));
