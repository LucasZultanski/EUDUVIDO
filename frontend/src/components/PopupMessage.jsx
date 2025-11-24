import React from 'react'

const PopupMessage = ({ open, title, messages = [], type = 'info', onClose }) => {
  if (!open) return null
  const color =
    type === 'error' ? 'border-red-500/40 text-red-300' :
    type === 'warning' ? 'border-yellow-500/40 text-yellow-300' :
    type === 'success' ? 'border-green-500/40 text-green-300' :
    'border-neon-green/40 text-gray-200'
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className={`w-full max-w-md bg-dark-surface rounded-xl border ${color} shadow-2xl p-6 space-y-4 animate-fade-in`}>
        <h3 className="text-xl font-semibold">{title}</h3>
        <ul className="space-y-2 text-sm">
          {messages.map((m,i) => (
            <li key={i} className="flex gap-2">
              <span className="opacity-70">•</span>
              <span>{m}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={onClose}
          className="w-full bg-neon-green text-black font-semibold py-3 px-4 rounded-lg transition-transform hover:scale-105"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
export default PopupMessage
