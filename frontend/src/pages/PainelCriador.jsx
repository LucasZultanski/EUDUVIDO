import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export default function PainelCriador() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [challenge, setChallenge] = useState(null)
  const [participants, setParticipants] = useState([])
  const [proofs, setProofs] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/challenges/${id}`)
        setChallenge(res.data)
      } catch {
        setChallenge(null)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (!challenge) return
    // Bloqueio: apenas criador e se não participa
    if (!user || user.id !== challenge.creatorId || challenge.creatorParticipates) {
      navigate(`/desafio/${id}`)
      return
    }
    ;(async () => {
      try {
        let data = []
        try {
          const r1 = await api.get(`/api/proofs/challenge/${id}`)
          if (Array.isArray(r1.data)) data = r1.data
        } catch {
          const r2 = await api.get('/api/proofs', { params: { challengeId: id } })
          data = Array.isArray(r2.data?.items) ? r2.data.items : (Array.isArray(r2.data) ? r2.data : [])
        }
        setProofs(data)
      } catch {
        setProofs([])
      }
      // carregar participantes
      const ids = [
        challenge.acceptorId,
        ...(challenge.participants || []),
        // criador fora (não participa)
      ].filter(Boolean)
      const list = []
      for (const pid of ids) {
        try {
          const u = await api.get(`/api/users/${pid}`)
          list.push(u.data)
        } catch {
          list.push({ id: pid, username: pid.substring(0,8), email: '' })
        }
      }
      setParticipants(list)
      setLoading(false)
    })()
  }, [challenge, user, id, navigate])

  const top3 = useMemo(() => {
    const countBy = proofs.reduce((acc, p) => {
      const uid = p.userId || 'desconhecido'
      acc[uid] = (acc[uid] || 0) + 1
      return acc
    }, {})
    const entries = Object.entries(countBy).map(([userId, count]) => ({ userId, count }))
    entries.sort((a, b) => b.count - a.count)
    return entries.slice(0, 3)
  }, [proofs])

  const findUser = (userId) => participants.find(u => u.id === userId)

  const timeInfo = useMemo(() => {
    const now = Date.now()
    let endTs = challenge?.endDate || null
    if (!endTs && challenge?.startDate && challenge?.duration) {
      endTs = challenge.startDate + challenge.duration * 24 * 60 * 60 * 1000
    }
    if (!endTs) return { label: 'Tempo restante', value: '—' }
    const diff = Math.max(0, endTs - now)
    const d = Math.floor(diff / (24*60*60*1000))
    const h = Math.floor((diff % (24*60*60*1000)) / (60*60*1000))
    const m = Math.floor((diff % (60*60*1000)) / (60*1000))
    return { label: 'Tempo restante', value: `${d}d ${h}h ${m}m` }
  }, [challenge])

  const handleCreatorCancel = async () => {
    if (!challenge || challenge.status !== 'NOT_STARTED') return
    if (!window.confirm('Cancelar este desafio? Todos que pagaram serão reembolsados e o desafio será removido.')) {
      return
    }
    setCancelling(true)
    try {
      await api.post(`/api/challenges/${id}/cancel-challenge`)
      alert('Desafio cancelado e removido.')
      navigate('/')
    } catch (e) {
      alert(e.response?.data?.error || 'Falha ao cancelar desafio')
    } finally {
      setCancelling(false)
    }
  }

  if (loading || !challenge) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-gray-400">Carregando painel...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Painel do Criador</h2>
        <button
          className="bg-transparent border border-white/30 text-white px-4 py-2 rounded hover:bg-white/10"
          onClick={() => navigate(`/desafio/${id}`)}
        >
          Voltar ao Desafio
        </button>
      </div>
      {challenge?.status === 'NOT_STARTED' && (
        <div className="mt-3">
          <button
            onClick={handleCreatorCancel}
            disabled={cancelling}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {cancelling ? 'Cancelando...' : 'Cancelar Desafio (Criador)'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black border border-neon-green/30 rounded p-4">
          <p className="text-xs text-gray-400">Participantes</p>
          <p className="text-2xl font-bold">{participants.length}</p>
        </div>
        <div className="bg-black border border-neon-green/30 rounded p-4">
          <p className="text-xs text-gray-400">{timeInfo.label}</p>
          <p className="text-2xl font-bold">{timeInfo.value}</p>
        </div>
        <div className="bg-black border border-neon-green/30 rounded p-4">
          <p className="text-xs text-gray-400">Provas enviadas</p>
          <p className="text-2xl font-bold">{proofs.length}</p>
        </div>
      </div>

      <div className="bg-black border border-neon-green/30 rounded p-4">
        <h3 className="text-lg font-semibold mb-3">Top 3 por número de provas</h3>
        {top3.length === 0 ? (
          <p className="text-gray-400">Ainda não há provas enviadas.</p>
        ) : (
          <div className="space-y-2">
            {top3.map((entry, idx) => {
              const u = findUser(entry.userId) || { username: 'Desconhecido' }
              const k = `top-${entry.userId}-${entry.count}-${idx}`
              return (
                <div key={k} className="flex items-center justify-between bg-dark-bg rounded p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neon-green text-black font-bold flex items-center justify-center">
                      {idx+1}
                    </div>
                    <div>
                      <p className="font-semibold">{u.username || entry.userId.substring(0,8)}</p>
                      <p className="text-xs text-gray-400">{u.email || ''}</p>
                    </div>
                  </div>
                  <span className="text-neon-green font-bold">{entry.count} envio(s)</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-black border border-neon-green/30 rounded p-4">
        <h3 className="text-lg font-semibold mb-3">Todos os participantes</h3>
        {participants.length === 0 ? (
          <p className="text-gray-400">Sem participantes.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {participants.map((p, idx) => {
              const k = p.id ? `part-${p.id}` : `part-fk-${idx}`
              return (
                <div key={k} className="flex items-center gap-3 bg-dark-bg rounded p-3">
                  <div className="w-10 h-10 rounded-full bg-neon-green text-black font-bold flex items-center justify-center">
                    {(p.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{p.username}</p>
                    <p className="text-xs text-gray-400">{p.email}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
