import { useNavigate } from 'react-router-dom'

export default function CheckinSuccessModal({ isOpen, title, message, challengeId, onClose }) {
  const navigate = useNavigate()
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-surface border border-neon-green/30 rounded-xl p-6 w-full max-w-md space-y-5 animate-fade-in">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center border-4 border-neon-green">
            <svg className="w-10 h-10 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-main-white text-center">{title || 'Check-in Realizado!'}</h2>
        <p className="text-sm text-gray-300 text-center whitespace-pre-line">{message}</p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => {
              navigate(`/desafio/${challengeId}`)
              onClose?.()
            }}
            className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg hover:bg-neon-green/90 transition"
          >
            Ver no Desafio
          </button>
          <button
            onClick={() => {
              onClose?.()
              navigate(`/desafio/${challengeId}`)
            }}
            className="w-full bg-transparent border border-white/30 text-main-white font-semibold py-2 px-4 rounded-lg hover:bg-white/10 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
