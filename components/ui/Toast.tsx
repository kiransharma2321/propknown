"use client";

import { createContext, useCallback, useContext, useState } from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { CheckCircle2, XCircle, X } from "lucide-react";

// UI Enhancements (Section 18) -- reuses the already-installed @radix-ui/react-toast dependency
// (present in package.json but unused anywhere in the codebase until now) rather than adding a
// new toast library or hand-rolling one. Wired into the CRM/admin shared layouts so it's
// available everywhere; used directly in the Settings/Integrations save actions and AI actions
// built this session.

interface ToastMessage { id: number; text: string; variant: "success" | "error"; }
type ToastFn = (text: string, variant?: "success" | "error") => void;

const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const showToast: ToastFn = useCallback((text, variant = "success") => {
    const id = Date.now() + Math.random();
    setMessages(prev => [...prev, { id, text, variant }]);
  }, []);

  const dismiss = (id: number) => setMessages(prev => prev.filter(m => m.id !== id));

  return (
    <ToastContext.Provider value={showToast}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        {messages.map(m => (
          <RadixToast.Root
            key={m.id}
            onOpenChange={open => { if (!open) dismiss(m.id); }}
            className="flex items-center gap-2.5 rounded-xl border bg-white px-4 py-3 shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out"
            style={{ borderColor: m.variant === "success" ? "#bbf7d0" : "#fecaca" }}
          >
            {m.variant === "success" ? <CheckCircle2 size={16} className="text-green-600 shrink-0" /> : <XCircle size={16} className="text-red-600 shrink-0" />}
            <RadixToast.Title className="text-gray-900 text-sm">{m.text}</RadixToast.Title>
            <RadixToast.Close className="ml-auto text-gray-400 hover:text-gray-700"><X size={13} /></RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-80 max-w-[90vw] outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
