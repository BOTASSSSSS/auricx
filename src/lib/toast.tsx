"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { cn } from "./utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} });

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto px-4 py-3 rounded-lg text-sm font-medium shadow-lg backdrop-blur-md border",
              t.type === "success" && "bg-positive/20 border-positive/30 text-positive",
              t.type === "error" && "bg-negative/20 border-negative/30 text-negative",
              t.type === "info" && "bg-accent/20 border-accent/30 text-accent"
            )}
            style={{
              animation: "slideIn 0.3s ease-out",
            }}
          >
            {t.type === "success" && "✓ "}
            {t.type === "error" && "✗ "}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
