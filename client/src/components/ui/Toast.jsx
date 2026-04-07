import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

const TOAST_DURATION = 4000

const typeStyles = {
  success: 'border-emerald-600 bg-white text-gray-900',
  error: 'border-rose-600 bg-white text-gray-900',
  warning: 'border-amber-500 bg-white text-gray-900',
  info: 'border-sky-600 bg-white text-gray-900',
}

const iconMap = {
  success: (
    <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.22 4.72a.75.75 0 00-1.06.02L7.4 8.88 5.84 7.22a.75.75 0 10-1.08 1.04l2.1 2.2a.75.75 0 001.08-.02l3.3-3.66a.75.75 0 00-.02-1.06z" />
    </svg>
  ),
  error: (
    <svg className="w-4 h-4 text-rose-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 110 14A7 7 0 018 1zM6.53 5.47a.75.75 0 00-1.06 1.06L6.94 8 5.47 9.47a.75.75 0 101.06 1.06L8 9.06l1.47 1.47a.75.75 0 101.06-1.06L9.06 8l1.47-1.47a.75.75 0 00-1.06-1.06L8 6.94 6.53 5.47z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 110 14A7 7 0 018 1zM7.25 5v3.5a.75.75 0 001.5 0V5a.75.75 0 00-1.5 0zm.75 6.75a.75.75 0 100-1.5.75.75 0 000 1.5z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 text-sky-600 shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 1a7 7 0 110 14A7 7 0 018 1zM7.25 7.5v3a.75.75 0 001.5 0v-3a.75.75 0 00-1.5 0zM8 4.5A.75.75 0 108 6a.75.75 0 000-1.5z" />
    </svg>
  ),
}

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, TOAST_DURATION)
    return id
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useMemo(
    () => ({
      success: (msg) => addToast(msg, 'success'),
      error: (msg) => addToast(msg, 'error'),
      warning: (msg) => addToast(msg, 'warning'),
      info: (msg) => addToast(msg, 'info'),
    }),
    [addToast]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container — bottom-right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 border-l-4 rounded-md px-4 py-3 shadow-sm text-sm transition-all duration-200 ${typeStyles[t.type]}`}
            role="alert"
          >
            {iconMap[t.type]}
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.47 4.47a.75.75 0 011.06 0L8 6.94l2.47-2.47a.75.75 0 111.06 1.06L9.06 8l2.47 2.47a.75.75 0 11-1.06 1.06L8 9.06l-2.47 2.47a.75.75 0 01-1.06-1.06L6.94 8 4.47 5.53a.75.75 0 010-1.06z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
