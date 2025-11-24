import React from 'react'

export default function ParabensVencedorModal({ isOpen, onClose, checkinCount, amountReceived, winnerName }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-dark-surface border border-neon-green/30 rounded-xl p-8 max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center border-4 border-neon-green">
            <svg className="w-12 h-12 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-main-white">
          Parabéns, {winnerName || 'vencedor'}!
        </h2>
        <p className="text-lg text-neon-green font-semibold mb-2">🏆</p>
        <div className="space-y-2">
          <p className="text-gray-300">
            <span className="font-bold text-neon-green">{checkinCount}</span> check-in(s) realizados
          </p>
          <p className="text-gray-300">
            {winnerName ? 'Recebeu' : 'Você recebeu'} <span className="font-bold text-neon-green">R$ {Number(amountReceived).toFixed(2)}</span>
          </p>
        </div>
        <p className="text-lg text-neon-green font-bold mt-4">Parabéns pelo desempenho!</p>
        <button
          onClick={onClose}
          className="w-full bg-neon-green text-black font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 mt-4"
        >
          Fechar
        </button>
      </div>
    </div>
  )
}
