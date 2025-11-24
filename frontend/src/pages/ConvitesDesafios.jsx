import { useEffect, useState } from 'react'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

export default function ConvitesDesafios() {
  const { showToast } = useToast()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState(null)

  useEffect(() => {
    loadInvites()
  }, [])

  const loadInvites = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/challenges/invites')
      setInvites(res.data || [])
    } catch (error) {
      showToast('Erro ao carregar convites', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (inviteId, action) => {
    setActingId(inviteId)
    try {
      const res = await api.post(`/api/challenges/invites/${inviteId}/respond`, { action })
      showToast(res.data?.message || (action === 'accept' ? 'Convite aceito!' : 'Convite recusado'), action === 'accept' ? 'success' : 'info')
      loadInvites()
    } catch (error) {
      const msg = error.response?.data?.error || 'Erro ao responder convite'
      showToast(msg, 'error')
    } finally {
      setActingId(null)
    }
  }

  const formatCurrency = (value) => `R$ ${Number(value || 0).toFixed(2)}`

  if (loading) {
    return <div className="text-center py-12 text-gray-300">Carregando convites...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Convites</h1>
        <button
          onClick={loadInvites}
          className="text-sm px-3 py-1 rounded bg-white/10 border border-white/20 hover:bg-white/20 transition-colors"
        >
          Atualizar
        </button>
      </div>

      {invites.length === 0 ? (
        <div className="bg-dark-surface rounded-lg p-8 text-center text-gray-400 border border-white/10">
          Nenhum convite pendente no momento.
        </div>
      ) : (
        <div className="space-y-4">
          {invites.map((invite, idx) => {
            const challenge = invite.challenge || {}
            const k = invite.id != null ? `inv-${invite.id}` : `inv-fk-${idx}`
            return (
              <div key={k} className="bg-dark-surface border border-medium-gray rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">
                    {challenge.description || 'Desafio'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Valor: <span className="text-neon-green font-semibold">{formatCurrency(challenge.amount)}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Convidado por: <span className="font-mono">{invite.inviterId?.substring(0, 8) || '--'}</span> •{' '}
                    {invite.createdAt ? new Date(invite.createdAt).toLocaleString('pt-BR') : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResponse(invite.id, 'accept')}
                    disabled={actingId === invite.id}
                    className="px-4 py-2 bg-neon-green text-black rounded-lg font-semibold hover:bg-neon-green/80 transition-colors disabled:opacity-50"
                  >
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleResponse(invite.id, 'decline')}
                    disabled={actingId === invite.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
