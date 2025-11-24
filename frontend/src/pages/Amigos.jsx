import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom' // reintroduzido
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

export default function Amigos() {
  const navigate = useNavigate() // reintroduzido
  const { showToast } = useToast()
  const [receivedRequests, setReceivedRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])
  const [friendIdentifier, setFriendIdentifier] = useState('')
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [receivedRes, sentRes] = await Promise.all([
        api.get('/api/friend-requests/received'),
        api.get('/api/friend-requests/sent')
      ])
      setReceivedRequests(receivedRes.data || [])
      setSentRequests(sentRes.data || [])
    } catch (error) {
      showToast('Erro ao carregar pedidos de amizade', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRespondRequest = async (requestId, action) => {
    try {
      await api.patch(`/api/friend-requests/${requestId}`, { action })
      showToast(
        action === 'accept' ? 'Pedido aceito!' : 'Pedido rejeitado',
        action === 'accept' ? 'success' : 'info'
      )
      loadData()
    } catch (error) {
      showToast('Erro ao responder pedido', 'error')
    }
  }

  const handleCancelSentRequest = async (requestId) => {
    if (!requestId) return
    setCancellingId(requestId)
    try {
      const res = await api.patch(`/api/friend-requests/${requestId}`, { action: 'cancel' })
      showToast(res.data?.message || 'Pedido cancelado', 'info')
      loadData()
    } catch (error) {
      const msg = error.response?.data?.error || 'Erro ao cancelar pedido'
      showToast(msg, 'error')
    } finally {
      setCancellingId(null)
    }
  }

  const handleSendFriendRequest = async (e) => {
    e.preventDefault()
    const identifier = friendIdentifier.trim()
    if (!identifier) {
      showToast('Informe o usuário ou e-mail do amigo', 'warning')
      return
    }
    setSendingFriendRequest(true)
    try {
      const payload = { identifier }
      if (identifier.includes('@')) {
        payload.email = identifier
      } else {
        payload.username = identifier
      }
      const res = await api.post('/api/friend-requests', payload)
      showToast(res.data?.message || 'Pedido de amizade enviado!', 'success')
      setFriendIdentifier('')
      loadData()
    } catch (error) {
      const msg = error.response?.data?.error || 'Erro ao enviar pedido'
      showToast(msg, 'error')
    } finally {
      setSendingFriendRequest(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Carregando amigos...</div>
  }

  const hasFriendActivity = receivedRequests.length > 0 || sentRequests.length > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* ALTERADO: título principal */}
        <h1 className="text-3xl font-bold">Solicitações</h1>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="text-sm px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
          >
            Atualizar
          </button>
          {/* ALTERADO: botão Convites com badge de recebidos */}
          <button
            onClick={() => navigate('/convites')}
            className="relative text-sm px-3 py-1 rounded bg-neon-green/20 border border-neon-green/40 text-neon-green font-semibold hover:bg-neon-green/30 transition-colors"
          >
            Convites
            {receivedRequests.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow">
                {receivedRequests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {!hasFriendActivity && (
        <div className="bg-dark-surface rounded-lg p-8 text-center text-gray-400">
          Nenhuma atividade recente com amigos.
        </div>
      )}

      {receivedRequests.length > 0 && (
        <div className="bg-dark-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Pedidos de amizade recebidos</h2>
          <div className="space-y-3">
            {receivedRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-dark-bg rounded-lg">
                <div>
                  <p className="font-semibold">{request.sender.username}</p>
                  <p className="text-sm text-gray-400">{request.sender.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespondRequest(request.id, 'accept')}
                    className="px-4 py-2 bg-neon-green text-black rounded-lg font-semibold hover:bg-neon-green/80 transition-colors"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleRespondRequest(request.id, 'reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentRequests.length > 0 && (
        <div className="bg-dark-surface rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Pedidos de amizade enviados</h2>
          <div className="space-y-3">
            {sentRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-dark-bg rounded-lg">
                <div>
                  <p className="font-semibold">{request.receiver.username}</p>
                  <p className="text-sm text-gray-400">{request.receiver.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-yellow-600/20 text-yellow-500 rounded-full text-xs font-semibold">
                    Pendente
                  </span>
                  <button
                    onClick={() => handleCancelSentRequest(request.id)}
                    disabled={cancellingId === request.id}
                    className="text-xl text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Cancelar pedido"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-dark-surface rounded-lg p-6 space-y-3">
        <h2 className="text-xl font-semibold">Adicionar amigos</h2>
        <p className="text-sm text-gray-400">Envie convites utilizando o usuário ou o e-mail da pessoa.</p>
        <form onSubmit={handleSendFriendRequest} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={friendIdentifier}
            onChange={(e) => setFriendIdentifier(e.target.value)}
            placeholder="ex: usuario123 ou pessoa@email.com"
            className="flex-1 p-3 rounded bg-dark-bg border border-medium-gray text-main-white focus:border-neon-green focus:outline-none"
          />
          <button
            type="submit"
            disabled={sendingFriendRequest}
            className="px-6 py-3 bg-neon-green text-black font-semibold rounded hover:bg-neon-green/80 transition-colors disabled:opacity-50"
          >
            {sendingFriendRequest ? 'Enviando...' : 'Enviar pedido'}
          </button>
        </form>
      </div>
    </div>
  )
}
