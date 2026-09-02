'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export default function Toast({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div 
      aria-live="polite" 
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />,
    info: <Info className="w-4 h-4 text-[#ff9000] shrink-0 mt-0.5" />,
  };

  const borders = {
    success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200',
    error: 'border-rose-500/30 bg-rose-950/80 text-rose-200',
    info: 'border-[#ff9000]/30 bg-[#16161c]/95 text-zinc-100',
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${borders[toast.type]}`}
    >
      <div className="flex items-start gap-2.5">
        {icons[toast.type]}
        <span className="text-xs sm:text-sm font-medium leading-tight">{toast.message}</span>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-zinc-400 hover:text-white p-1 rounded-lg transition-colors"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
