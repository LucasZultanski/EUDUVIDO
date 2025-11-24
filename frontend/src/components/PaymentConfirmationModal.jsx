/**
 * Modal customizado para confirmação de pagamento/criação de desafio
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Se o modal está aberto
 * @param {Function} props.onClose - Callback para fechar o modal
 * @param {Function} props.onConfirm - Callback quando confirma
 * @param {string} props.title - Título do modal
 * @param {string} props.message - Mensagem do modal
 * @param {string} props.confirmText - Texto do botão de confirmação
 * @param {string} props.cancelText - Texto do botão de cancelamento
 */
export default function PaymentConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirmar Ação',
  message = 'Deseja continuar?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar'
}) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-dark-surface border border-neon-green/30 rounded-xl p-6 max-w-md w-full space-y-4">
        {/* Título */}
        <h2 className="text-xl font-bold text-main-white text-center">
          {title}
        </h2>

        {/* Mensagem */}
        <p className="text-gray-300 text-center">
          {message}
        </p>

        {/* Botões */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-transparent border border-white/30 text-main-white font-semibold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}

