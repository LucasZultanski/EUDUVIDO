import { useNavigate } from 'react-router-dom'

/**
 * Modal de confirmação customizado após criação bem-sucedida do desafio
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar o modal
 * @param {string} props.challengeId - ID do desafio criado
 * @param {number} props.invitedCount - Número de convites enviados
 */
export default function ChallengeSuccessModal({ isOpen, onClose, challengeId, invitedCount = 0 }) {
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleViewChallenge = () => {
    // Sempre redireciona para home
    navigate('/')
    onClose()
  }

  const handleClose = () => {
    // Sempre redireciona para home
    navigate('/')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-dark-surface border border-neon-green/30 rounded-xl p-8 max-w-md w-full space-y-6 text-center">
        {/* Ícone de Sucesso */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center border-4 border-neon-green">
            <svg 
              className="w-12 h-12 text-neon-green" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="3" 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-2xl font-bold text-main-white">
          Desafio Criado com Sucesso!
        </h2>

        {/* Mensagem */}
        <p className="text-gray-300">
          Seu desafio foi publicado.
          {invitedCount > 0 && (
            <span className="block mt-2 text-neon-green font-semibold">
              {invitedCount} convite{invitedCount !== 1 ? 's' : ''} enviado{invitedCount !== 1 ? 's' : ''} para os amigos selecionados.
            </span>
          )}
        </p>

        {/* Botões */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={handleViewChallenge}
            className="w-full bg-neon-green text-black font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105"
          >
            Ver meu Desafio
          </button>
          <button
            onClick={handleClose}
            className="w-full bg-transparent border border-white/30 text-main-white font-semibold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

