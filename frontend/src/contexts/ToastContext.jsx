import { createContext, useContext, useState, useRef } from 'react'

const ToastContext = createContext()

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const showToast = (message, type = 'success') => {
    const ts = Date.now()
    const id = `${ts}-${counterRef.current++}`
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg animate-fade-in ${
              toast.type === 'success' ? 'bg-neon-green text-black' : 'bg-red-600 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
