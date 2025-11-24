import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'
import PopupMessage from '../components/PopupMessage'

const EntrarDesafio = () => {
  const { shareLink } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState(null)
  const [joining, setJoining] = useState(false)
  const [popup, setPopup] = useState({ open: false, title: '', messages: [], type: 'info' })

  useEffect(() => {
    validateLink()
  }, [shareLink])

  const validateLink = async () => {
    try {
      const response = await api.get(`/api/challenges/invite/${shareLink}`)
      setChallenge(response.data.challenge)
    } catch (error) {
      if (error.response?.status === 400) {
        // Desafio lotado ou concluído
        showToast(error.response.data.error || 'Não foi possível entrar no desafio', 'error')
      } else {
        showToast('Link de convite inválido', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const showPopup = (t, m, type = 'info') => setPopup({ open: true, title: t, messages: Array.isArray(m) ? m : [m], type })

  const handleJoin = async () => {
    setJoining(true)
    try {
      await api.post(`/api/challenges/invite/${shareLink}/join`)
      showToast('Você entrou no desafio com sucesso!', 'success')
      navigate(`/desafio/${challenge.id}`)
    } catch (error) {
      showPopup('Erro ao entrar', error.response?.data?.error || 'Não foi possível entrar.', 'error')
    } finally {
      setJoining(false)
    }
  }

  const getTypeIcon = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'academia': return 'ph-barbell'
      case 'corrida': return 'ph-person-simple-run'
      case 'dieta': return 'ph-apple-logo'
      case 'estudo': return 'ph-book-open'
      case 'custom': return 'ph-gear'
      default: return 'ph-target'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Validando link...</p>
        </div>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-black border border-red-500/30 rounded-lg p-8 max-w-md mx-auto text-center">
          <h2 className="text-2xl font-semibold text-red-400 mb-4">Link Inválido</h2>
          <p className="text-gray-300 mb-6">
            Este link de convite não é válido ou o desafio não está mais disponível.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-neon-green text-black font-bold py-2 px-6 rounded-lg hover:bg-neon-green/80 transition-colors"
          >
            Voltar para Meus Desafios
          </button>
        </div>
      </div>
    )
  }

  // Verificar se o desafio está lotado
  const isFull = challenge.maxParticipants &&
                 challenge.participants &&
                 challenge.participants.length >= challenge.maxParticipants

  if (isFull) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-black border border-yellow-500/30 rounded-lg p-8 max-w-md mx-auto text-center">
          <h2 className="text-2xl font-semibold text-yellow-400 mb-4">Desafio Lotado</h2>
          <p className="text-gray-300 mb-6">
            O número máximo de participantes já foi atingido. Este desafio não está mais aceitando novos participantes.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-neon-green text-black font-bold py-2 px-6 rounded-lg hover:bg-neon-green/80 transition-colors"
          >
            Voltar para Meus Desafios
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-black border border-neon-green/30 rounded-lg p-8 max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-semibold mb-2">Entrar no Desafio</h2>
            <p className="text-gray-400">Você foi convidado para participar deste desafio</p>
          </div>

          <div className="bg-dark-bg border border-neon-green/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-4">
              {challenge.icon ? (
                <img src={challenge.icon} alt="Ícone" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <i className={`ph-fill ${getTypeIcon(challenge.type)} text-2xl text-gray-300`} />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{challenge.description}</h3>
                <p className="text-neon-green font-bold">R$ {challenge.amount?.toFixed(2)}</p>
              </div>
            </div>

            {challenge.maxParticipants && (
              <p className="text-sm text-gray-400">
                Vagas: {challenge.participants?.length || 0}/{challenge.maxParticipants} (máx. de participantes)
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="flex-1 bg-transparent border border-white/50 text-white font-bold py-3 px-4 rounded-lg hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="flex-1 bg-neon-green text-black font-bold py-3 px-4 rounded-lg hover:bg-neon-green/80 transition-colors disabled:opacity-50"
            >
              {joining ? 'Entrando...' : 'Entrar no Desafio'}
            </button>
          </div>
        </div>
      </div>

      <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={() => setPopup(p => ({ ...p, open: false }))} />
    </>
  )
}

export default EntrarDesafio

