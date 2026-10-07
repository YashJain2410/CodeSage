'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useCodeSageStore } from '@/store/useCodeSageStore';
const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);
export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  useEffect(() => {
    useCodeSageStore.getState().hydrate();
  }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((s) => s.slice(1)), 4500);
    return () => clearTimeout(t);
  }, [toasts]);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={client}>
        <MotionConfig reducedMotion="user">
          <ToastContext.Provider
            value={(text) => setToasts((s) => [...s, { id: Date.now(), text }])}
          >
            {children}
            <div className="toast-stack" aria-live="polite">
              <AnimatePresence>
                {toasts.map((t) => (
                  <motion.div
                    key={t.id}
                    className="toast"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                  >
                    <Check size={16} />
                    {t.text}
                    <button
                      className="icon-button"
                      aria-label="Dismiss notification"
                      onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ToastContext.Provider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
