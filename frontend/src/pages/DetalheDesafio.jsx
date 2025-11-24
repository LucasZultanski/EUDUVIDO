import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import InviteFriends from '../components/InviteFriends'
import PopupMessage from '../components/PopupMessage'
import ParabensVencedorModal from '../components/ParabensVencedorModal'

const participantStatusMeta = {
  PAID: { label: 'Pago', className: 'bg-green-600/20 text-green-300' },
  PENDING_PAYMENT: { label: 'Pendente', className: 'bg-yellow-600/20 text-yellow-300' },
  INVITED: { label: 'Sem Resposta', className: 'bg-blue-600/20 text-blue-300' },
  UNKNOWN: { label: 'Desconhecido', className: 'bg-gray-600/20 text-gray-300' },
}
const statusOrder = { PAID: 0, PENDING_PAYMENT: 1, INVITED: 2, UNKNOWN: 99 }
const roleLabels = { CREATOR: 'Criador', ACCEPTOR: 'Aceitador', PARTICIPANT: 'Participante' }

const DetalheDesafio = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { walletBalance, refreshWallet } = useWallet()
  const { showToast } = useToast()
  const { user } = useAuth()

  // ========== TODOS OS HOOKS AQUI (NUNCA CONDICIONAIS) ==========
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [proofs, setProofs] = useState([])
  const [participants, setParticipants] = useState([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [shareLink, setShareLink] = useState(null)
  const [showShareLinkWarning, setShowShareLinkWarning] = useState(false)
  const [popup, setPopup] = useState({ open: false, title: '', messages: [], type: 'info' })
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelResult, setCancelResult] = useState(null)
  const [cancellationInfo, setCancellationInfo] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [dayProofs, setDayProofs] = useState([])
  const [calendarMonth, setCalendarMonth] = useState(null)
  const [calendarYear, setCalendarYear] = useState(null)
  const [inviteActionId, setInviteActionId] = useState(null)
  const [showCreatorCancelModal, setShowCreatorCancelModal] = useState(false)
  const [cancelChallengeLoading, setCancelChallengeLoading] = useState(false)
  const [cancelChallengeResult, setCancelChallengeResult] = useState(null)
  const [finishInfo, setFinishInfo] = useState(null)
  const [finishLoading, setFinishLoading] = useState(false)
  const [finishActionLoading, setFinishActionLoading] = useState(false)
  const [showCongratsModal, setShowCongratsModal] = useState(false)
  const [winnerCheckinCount, setWinnerCheckinCount] = useState(0)
  const [winnerAmount, setWinnerAmount] = useState(0)
  const [winnerProfile, setWinnerProfile] = useState(null)
  const [removedUnpaid, setRemovedUnpaid] = useState([])
  const [backendError, setBackendError] = useState(false)

  const showPopup = (t, m, type = 'info') => {
    setPopup({ open: true, title: t, messages: Array.isArray(m) ? m : [m], type })
  }

  // ========== HELPER FUNCTIONS (DEFINIR ANTES DOS EFEITOS) ==========
  const getProofKey = (p, idx = 0) => {
    if (!p) return `null-${idx}`
    if (p.id != null) return `id-${p.id}`
    const t = p.timestamp || p.createdAt
    return t ? `ts-${t}` : `idx-${idx}`
  }

  const proofStatus = (proof) => {
    const raw = (proof.status || proof.valid || '').toString().toUpperCase()
    if (raw === 'INVALID' || raw === 'REJECTED' || raw === 'FALSE') return 'invalid'
    if (raw === 'IN_PROGRESS' || raw === 'PENDING' || raw === 'AWAITING') return 'in_progress'
    if (raw === 'VALID' || raw === 'APPROVED' || raw === 'TRUE') return 'valid'
    return 'valid'
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      'AWAITING_PAYMENT': { icon: 'ph-warning-circle', text: 'Aguardando Pagamento', color: 'text-yellow-400' },
      'PENDING': { icon: 'ph-warning-circle', text: 'Aguardando Pagamento', color: 'text-yellow-400' },
      'NOT_STARTED': { icon: 'ph-clock', text: 'Não Iniciado', color: 'text-blue-400' },
      'IN_PROGRESS': { icon: 'ph-calendar-check', text: 'Em Andamento', color: 'text-neon-green' },
      'ACCEPTED': { icon: 'ph-calendar-check', text: 'Em Andamento', color: 'text-neon-green' },
      'COMPLETED': { icon: 'ph-trophy', text: 'Concluído', color: 'text-green-400' },
      'AWAITING_CONFIRMATION': { icon: 'ph-hourglass', text: 'Aguardando Confirmação', color: 'text-yellow-400' },
      'CANCELLED': { icon: 'ph-x-circle', text: 'Cancelado', color: 'text-red-400' }
    }
    return statusMap[status] || statusMap['NOT_STARTED']
  }

  const getTypeIcon = (type) => {
    const iconMap = {
      'academia': 'ph-barbell',
      'corrida': 'ph-person-simple-run',
      'dieta': 'ph-apple-logo',
      'estudo': 'ph-book-open',
      'custom': 'ph-gear'
    }
    return iconMap[type?.toLowerCase()] || 'ph-target'
  }

  // ========== EFEITOS ==========
  useEffect(() => {
    loadChallenge()
  }, [id])

  useEffect(() => {
    if (challenge) {
      loadParticipants()
      loadFinishRequest()
    }
  }, [challenge?.id])

  useEffect(() => {
    if (challenge) {
      if (['NOT_STARTED', 'IN_PROGRESS', 'ACCEPTED'].includes(challenge.status)) {
        loadShareLink()
      }
    }
  }, [challenge?.status])

  useEffect(() => {
    if (!challenge) return
    const baseDate = challenge.startDate ? new Date(challenge.startDate) : new Date()
    setCalendarMonth(baseDate.getMonth())
    setCalendarYear(baseDate.getFullYear())
  }, [challenge?.id])

  useEffect(() => {
    if (!challenge) {
      setProofs([])
      return
    }
    if (['IN_PROGRESS', 'COMPLETED', 'AWAITING_CONFIRMATION'].includes(challenge.status)) {
      loadProofs()
    } else {
      setProofs([])
    }
  }, [challenge?.status])

  // Carregar dados do vencedor e abrir modal
  useEffect(() => {
    if (challenge?.status === 'COMPLETED' && challenge?.winnerId) {
      loadWinnerData()
    } else {
      setShowCongratsModal(false)
      setWinnerProfile(null)
      setWinnerCheckinCount(0)
      setWinnerAmount(0)
    }
  }, [challenge?.status, challenge?.winnerId, proofs.length])

  useEffect(() => {
    if (challenge && challenge.status === 'CANCELLED' && user) {
      const key = `challengeCancel:${challenge.id}:${user.id}`
      try {
        const raw = localStorage.getItem(key)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (typeof parsed.fee === 'number' && typeof parsed.refund === 'number') {
            setCancellationInfo(parsed)
          }
        }
      } catch (e) {
        console.warn('Falha ao ler dados de cancelamento', e)
      }
    }
  }, [challenge?.status, user])

  // ========== FUNÇÕES DE CARREGAMENTO ==========
  const loadChallenge = async () => {
    try {
      try {
        const directResponse = await api.get(`/api/challenges/${id}`)
        if (directResponse.data) {
          setChallenge(directResponse.data)
          setLoading(false)
          return
        }
      } catch (directError) {
        if (directError.response?.status === 404) {
          setChallenge(null)
          setLoading(false)
          return
        }
      }

      const response = await api.get(`/api/challenges`)
      let allChallenges = []
      if (Array.isArray(response.data)) {
        allChallenges = response.data
      } else if (response.data?.created || response.data?.invited) {
        allChallenges = [...(response.data.created || []), ...(response.data.invited || [])]
      }

      const found = allChallenges.find(
        (c) => String(c.id) === String(id) || String(c.challengeId) === String(id)
      )
      setChallenge(found || null)
    } catch {
      setChallenge(null)
    } finally {
      setLoading(false)
    }
  }

  const loadProofs = async () => {
    try {
      let lite = []
      let hasError = false
      
      try {
        const rl = await api.get(`/api/proofs/challenge/${id}/lite`)
        lite = Array.isArray(rl.data) ? rl.data : []
      } catch (error) {
        console.warn('Erro ao buscar provas (lite):', error.response?.status || error.message)
        hasError = true
        
        try {
          const rp = await api.get(`/api/proofs/challenge/${id}`)
          lite = Array.isArray(rp.data) ? rp.data : []
          hasError = false
        } catch (error2) {
          console.warn('Erro ao buscar provas (normal):', error2.response?.status || error2.message)
          lite = []
        }
      }

      // Tentar carregar provas locais se houver erro no backend
      let localArr = []
      try {
        localArr = JSON.parse(localStorage.getItem(`localProofs:${id}`) || '[]')
        if (user?.id) {
          localArr = localArr.filter(p => p && p.userId === user.id)
        } else {
          localArr = []
        }
        
        if (hasError && localArr.length > 0) {
          console.log(`ℹ️ Backend indisponível. Mostrando ${localArr.length} provas salvas localmente.`)
        }
      } catch {
        localArr = []
      }

      const seen = new Set()
      const merged = []
      ;[...lite, ...localArr].forEach((p, i) => {
        if (!p) return
        const k = getProofKey(p, i)
        if (seen.has(k)) return
        seen.add(k)
        merged.push(p)
      })

      setProofs(merged)
    } catch (error) {
      console.error('Erro crítico ao carregar provas:', error)
      setProofs([])
    }
  }

  const loadParticipants = async () => {
    if (!challenge) return
    try {
      const ids = [
        challenge?.creatorParticipates ? challenge.creatorId : null,
        challenge?.acceptorId,
        ...(challenge?.participants || [])
      ].filter(Boolean)

      let pendingInvites = []
      try {
        const invRes = await api.get(`/api/challenges/${id}/invites`)
        pendingInvites = Array.isArray(invRes.data) ? invRes.data.filter(i => i.status === 'PENDING') : []
      } catch {
        pendingInvites = []
      }

      const inviteeIds = pendingInvites.map(inv => inv.inviteeId).filter(Boolean)
      const uniqueIds = [...new Set([...ids, ...inviteeIds])]
      const profiles = {}

      await Promise.all(
        uniqueIds.map(async (uid) => {
          try {
            const profile = await api.get(`/api/users/${uid}`)
            profiles[uid] = profile.data
          } catch {
            profiles[uid] = { id: uid, username: uid?.substring(0, 8), email: '' }
          }
        })
      )

      // Carregar perfil dos convidadores
      for (const inv of pendingInvites) {
        if (inv.inviterId && !profiles[inv.inviterId]) {
          try {
            const inviterProfile = await api.get(`/api/users/${inv.inviterId}`)
            profiles[inv.inviterId] = inviterProfile.data
          } catch {
            profiles[inv.inviterId] = { id: inv.inviterId, username: inv.inviterId.substring(0,8), email: '' }
          }
        }
      }

      const paidSet = new Set(challenge?.paidUserIds || [])
      const list = []
      const added = new Set()

      for (const uid of new Set(ids)) {
        list.push({
          userId: uid,
          user: profiles[uid],
          status: paidSet.has(uid) ? 'PAID' : 'PENDING_PAYMENT',
          role: uid === challenge?.creatorId ? 'CREATOR' : uid === challenge?.acceptorId ? 'ACCEPTOR' : 'PARTICIPANT'
        })
        added.add(uid)
      }

      for (const inv of pendingInvites) {
        const uid = inv.inviteeId
        list.push({
          userId: uid,
          user: profiles[uid],
          status: 'INVITED',
          role: 'PARTICIPANT',
          inviteId: inv.id,
          inviterId: inv.inviterId,
          inviterUsername: profiles[inv.inviterId]?.username || inv.inviterId?.substring(0,8),
          invitedAt: inv.createdAt
        })
        added.add(uid)
      }

      setParticipants(list)
    } catch (error) {
      console.error('Erro ao carregar participantes:', error)
      setParticipants([])
    }
  }

  const loadShareLink = async () => {
    try {
      const response = await api.get(`/api/challenges/${id}/share-link`)
      setShareLink(response.data.shareLink)
    } catch (error) {
      console.error('Erro ao carregar link:', error)
    }
  }

  const loadFinishRequest = async () => {
    if (!challenge) return
    try {
      const res = await api.get(`/api/challenges/${id}/finish-request`)
      setFinishInfo(res.data)
    } catch {
      setFinishInfo(null)
    }
  }

  const loadWinnerData = async () => {
    try {
      try {
        const profile = await api.get(`/api/users/${challenge.winnerId}`)
        setWinnerProfile(profile.data)
      } catch {
        setWinnerProfile(null)
      }

      const winnerProofs = proofs.filter(
        p => p.userId === challenge.winnerId && proofStatus(p) === 'valid'
      )
      setWinnerCheckinCount(winnerProofs.length)

      const netStakePerUser = (challenge?.amount || 0) -
        ((challenge?.amount || 0) * ((challenge?.participationFeePercent ?? 15) / 100))
      const totalParticipants = [
        challenge?.creatorParticipates ? challenge.creatorId : null,
        challenge.acceptorId,
        ...(challenge.participants || [])
      ].filter(Boolean).length
      const winnerShare = netStakePerUser * totalParticipants

      setWinnerAmount(winnerShare)
      setShowCongratsModal(true)
    } catch (error) {
      console.error('Erro ao carregar dados do vencedor:', error)
      setWinnerProfile(null)
      setWinnerCheckinCount(0)
      setWinnerAmount(0)
    }
  }

  // ========== HANDLERS ==========
  const handleStartChallenge = async () => {
    try {
      const res = await api.post(`/api/challenges/${id}/start`)
      showToast(res.data?.message || 'Desafio iniciado!', 'success')
      if (Array.isArray(res.data?.removedUnpaid) && res.data.removedUnpaid.length > 0) {
        setRemovedUnpaid(res.data.removedUnpaid)
        showToast(`Removidos: ${res.data.removedUnpaid.map(r=>r.substring(0,8)).join(', ')}`,'warning')
      }
      await loadChallenge()
    } catch (error) {
      showToast(error.response?.data?.error || 'Erro ao iniciar', 'error')
    }
  }

  const handlePayWithWallet = async () => {
    try {
      setShowPaymentModal(false)
      await api.post(`/api/challenges/${id}/pay`)
      await refreshWallet()
      showToast('Pagamento realizado!', 'success')
      await loadChallenge()
    } catch (error) {
      showPopup('Erro', error.response?.data?.message || 'Falha ao processar pagamento', 'error')
    }
  }

  const handleAddMoreBalance = () => {
    setShowPaymentModal(false)
    const challengeAmount = challenge?.amount || 0
    navigate(`/carteira?challengeId=${id}&amount=${challengeAmount}`)
  }

  const handlePayNowClick = () => {
    const hasSufficientBalance = walletBalance !== null && walletBalance >= (challenge?.amount || 0)
    if (hasSufficientBalance) {
      setShowPaymentModal(true)
    } else {
      navigate(`/desafio/${id}/pagamento`)
    }
  }

  const handleRequestFinish = async () => {
    setFinishLoading(true)
    try {
      const res = await api.post(`/api/challenges/${id}/finish-request`)
      showToast(res.data?.message || 'Pedido enviado', 'info')
      await loadChallenge()
      await loadFinishRequest()
    } catch (err) {
      showPopup('Erro', err.response?.data?.error || 'Falha ao solicitar encerramento', 'error')
    } finally {
      setFinishLoading(false)
    }
  }

  const handleRespondFinish = async (action) => {
    setFinishActionLoading(true)
    try {
      const res = await api.post(`/api/challenges/${id}/finish-request/respond`, { action })
      showToast(res.data?.message || 'Resposta registrada', action === 'accept' ? 'success' : 'info')
      await loadChallenge()
      await loadFinishRequest()
    } catch (err) {
      showPopup('Erro', err.response?.data?.error || 'Erro ao responder', 'error')
    } finally {
      setFinishActionLoading(false)
    }
  }

  const handleConfirmCancel = async () => {
    if (!challenge) return
    setCancelLoading(true)
    setCancelResult(null)
    try {
      const res = await api.post(`/api/challenges/${id}/cancel`)
      const info = {
        fee: res.data.feeApplied || 0,
        refund: res.data.refundAmount || 0,
        wasPaid: res.data.wasPaid,
        globalCancelled: res.data.globalCancelled
      }
      setCancelResult(info)
      setCancellationInfo(info)
      if (user) {
        const key = `challengeCancel:${challenge.id}:${user.id}`
        localStorage.setItem(key, JSON.stringify(info))
      }
      await loadChallenge()
      showToast(res.data.globalCancelled ? 'Desafio encerrado' : 'Você desistiu', 'info')
      setTimeout(() => setShowCancelModal(false), 1200)
    } catch (e) {
      showPopup('Erro', e.response?.data?.error || 'Falha ao processar desistência', 'error')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleConfirmCreatorCancel = async () => {
    setCancelChallengeLoading(true)
    setCancelChallengeResult(null)
    try {
      const res = await api.post(`/api/challenges/${id}/cancel-challenge`)
      setCancelChallengeResult(res.data || {})
      showToast('Desafio cancelado', 'success')
      try { await refreshWallet?.() } catch {}
      setTimeout(() => navigate('/'), 800)
    } catch (e) {
      showPopup('Erro', e.response?.data?.error || 'Falha ao cancelar', 'error')
    } finally {
      setCancelChallengeLoading(false)
    }
  }

  const handleKick = async (participantId) => {
    try {
      const res = await api.post(`/api/challenges/${id}/kick/${participantId}`)
      showToast(res.data?.message || 'Participante removido', 'info')
      if (res.data?.hadPaid) {
        showToast(`Reembolso: R$ ${Number(res.data.refundAmount || 0).toFixed(2)}`,'success')
      }
      await loadChallenge()
      await loadParticipants()
    } catch (error) {
      showToast(error.response?.data?.error || 'Falha ao remover', 'error')
    }
  }

  const handleBan = async (participantId) => {
    try {
      const res = await api.post(`/api/challenges/${id}/ban/${participantId}`)
      showToast(res.data?.message || 'Participante banido', 'warning')
      if (res.data?.hadPaid) {
        showToast(`Reembolso: R$ ${Number(res.data.refundAmount || 0).toFixed(2)}`,'success')
      }
      await loadChallenge()
      await loadParticipants()
    } catch (error) {
      showToast(error.response?.data?.error || 'Falha ao banir', 'error')
    }
  }

  const handleCancelInvite = async (inviteId) => {
    if (!inviteId) return
    setInviteActionId(inviteId)
    try {
      const res = await api.delete(`/api/challenges/invites/${inviteId}`)
      showToast(res.data?.message || 'Convite cancelado', 'info')
      await loadParticipants()
    } catch (error) {
      showToast(error.response?.data?.error || 'Erro ao cancelar convite', 'error')
    } finally {
      setInviteActionId(null)
    }
  }

  const handleInviteSent = () => {
    showToast('Convite enviado!', 'success')
    loadChallenge()
    loadParticipants()
  }

  const handleChangeIcon = async (e) => {
    if (!isCreator) {
      alert('Apenas o criador pode alterar o ícone.')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    const validTypes = ['image/png', 'image/jpeg']
    if (!validTypes.includes(file.type)) {
      alert('Use PNG ou JPEG.')
      return
    }
    const maxBytes = 700 * 1024
    if (file.size > maxBytes) {
      alert('Limite: 700KB.')
      return
    }
    const toBase64 = (f) => new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(f)
    })
    try {
      const dataUrl = await toBase64(file)
      await api.patch(`/api/challenges/${id}/icon`, { icon: dataUrl })
      await loadChallenge()
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao atualizar ícone')
    }
  }

  const copyShareLink = () => {
    if (!shareLink) return
    if (challenge?.status === 'IN_PROGRESS' && challenge?.allowGuests === false) {
      showPopup('Bloqueado', 'Novos participantes não podem entrar após o início.', 'warning')
      return
    }
    if (challenge?.status === 'IN_PROGRESS') {
      setShowShareLinkWarning(true)
      return
    }
    const fullLink = shareLink.startsWith('http') ? shareLink : `${window.location.origin}/desafio/invite/${shareLink}`
    navigator.clipboard.writeText(fullLink)
    showToast('Link copiado!', 'success')
  }

  const confirmCopyShareLink = () => {
    if (!shareLink) return
    const fullLink = shareLink.startsWith('http') ? shareLink : `${window.location.origin}/desafio/invite/${shareLink}`
    navigator.clipboard.writeText(fullLink)
    showToast('Link copiado!', 'success')
    setShowShareLinkWarning(false)
  }

  const handleDownloadQR = () => {
    if (!shareLink) return
    const fullLink = shareLink.startsWith('http') ? shareLink : `${window.location.origin}/desafio/invite/${shareLink}`
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(fullLink)}`
    const a = document.createElement('a')
    a.href = qrSrc
    a.download = `desafio-${id}-qrcode.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // ========== CALENDÁRIO ==========
  const proofsByDay = (() => {
    const map = {}
    proofs.forEach(p => {
      const ts = p.timestamp || p.createdAt
      if (!ts) return
      const d = new Date(ts)
      const key = d.toISOString().substring(0,10)
      if (!map[key]) map[key] = []
      map[key].push(p)
    })
    return map
  })()

  const dayCellClass = (dateObj) => {
    const key = dateObj.toISOString().substring(0,10)
    const allDayProofs = proofsByDay[key] || []
    if (!allDayProofs.length) return 'bg-gray-800 text-gray-400'

    const userDayProofs = user?.id ? allDayProofs.filter(p => p.userId === user.id) : allDayProofs
    if (!userDayProofs.length) return 'bg-gray-800 text-gray-400'

    const hasInvalid = userDayProofs.some(p => proofStatus(p) === 'invalid')
    const hasInProgress = userDayProofs.some(p => proofStatus(p) === 'in_progress')

    if (hasInvalid) return 'bg-red-600/70 text-white'
    if (hasInProgress) return 'bg-yellow-500/80 text-black'
    return 'bg-green-600/70 text-white'
  }

  const generateCalendar = () => {
    if (calendarMonth === null || calendarYear === null) return []
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0)
    const days = []
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ blank: true })
    }
    
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateObj = new Date(calendarYear, calendarMonth, d)
      if (challenge?.startDate && challenge?.endDate) {
        const start = new Date(challenge.startDate)
        const end = new Date(challenge.endDate)
        if (dateObj < start || dateObj > end) {
          days.push({ blank: true })
          continue
        }
      }
      days.push({ blank: false, dateObj })
    }
    return days
  }

  const openDayDetails = (dateObj) => {
    const key = dateObj.toISOString().substring(0,10)
    const arr = proofsByDay[key] || []
    setSelectedDay(key)
    setDayProofs(arr)
  }

  const closeDayDetails = () => {
    setSelectedDay(null)
    setDayProofs([])
  }

  // ========== CÁLCULOS ==========
  const paidUserIds = challenge?.paidUserIds || []
  const allParticipantIds = challenge ? [
    challenge?.creatorParticipates ? challenge.creatorId : null,
    challenge.acceptorId,
    ...(challenge.participants || [])
  ].filter(Boolean) : []
  const totalParticipants = [...new Set(allParticipantIds)].length
  const userHasPaid = user && paidUserIds.includes(user.id)
  const feePercent = challenge?.participationFeePercent ?? 15
  const participationFeePerUser = (challenge?.amount || 0) * (feePercent / 100)
  const netStakePerUser = (challenge?.amount || 0) - participationFeePerUser
  const totalNetPotential = netStakePerUser * totalParticipants
  const allPaid = paidUserIds.length === totalParticipants && totalParticipants > 0
  const needsUserPayment = challenge?.status === 'NOT_STARTED' && allParticipantIds.includes(user?.id) && !userHasPaid
  const canStart = user && challenge && user.id === challenge.creatorId && challenge.status === 'NOT_STARTED' && allPaid && totalParticipants >= 2
  const isCreator = user && challenge && user.id === challenge.creatorId
  const statusInfo = challenge ? getStatusInfo(challenge.status) : null

  const dailyLimit = (() => {
    if (!challenge) return 1
    if (challenge.type === 'dieta') return challenge.mealsPerDay || challenge.mealCountPerDay || 1
    return 1
  })()

  const userProofsToday = (() => {
    if (!user || !proofs.length) return 0
    const today = new Date().toISOString().substring(0, 10)
    return proofs.filter(p => {
      if (p.userId !== user.id) return false
      const ts = p.timestamp || p.createdAt
      if (!ts) return false
      const proofDate = new Date(ts).toISOString().substring(0, 10)
      return proofDate === today
    }).length
  })()

  const hasReachedDailyLimit = userProofsToday >= dailyLimit

  const userResigned = (() => {
    if (!user || !challenge) return false
    const localKey = `challengeCancel:${challenge.id}:${user.id}`
    const localFlag = Boolean(localStorage.getItem(localKey))
    const creatorResigned = challenge.creatorId === user.id && challenge.creatorParticipates === false
    return localFlag || creatorResigned || challenge.status === 'CANCELLED'
  })()

  const isActiveParticipant = (() => {
    if (!user || !challenge) return false
    if (user.id === challenge.creatorId && challenge.creatorParticipates === false) return false
    if (user.id === challenge.creatorId && challenge.creatorParticipates === true) return true
    if (challenge.acceptorId === user.id) return true
    if (Array.isArray(challenge.participants) && challenge.participants.includes(user.id)) return true
    return false
  })()

  const canCancel = () => {
    if (userResigned) return false
    if (!challenge || !user) return false
    if (['COMPLETED','CANCELLED'].includes(challenge.status)) return false
    const isCreatorUser = challenge.creatorId === user.id && Boolean(challenge.creatorParticipates)
    const isAcceptor = challenge.acceptorId && challenge.acceptorId === user.id
    const isParticipant = challenge.participants?.includes(user.id)
    return isCreatorUser || isAcceptor || isParticipant
  }

  const canUserInvite = () => {
    if (!challenge || !user) return false
    if (challenge.status === 'COMPLETED') return false
    if (isInviteLimitReached()) return false
    if (challenge.invitePermission === 'CREATOR_ONLY') {
      return challenge.creatorId === user.id
    }
    if (challenge.invitePermission === 'ALL_PARTICIPANTS') {
      return challenge.creatorId === user.id || 
             challenge.acceptorId === user.id ||
             (challenge.participants && challenge.participants.includes(user.id))
    }
    return false
  }

  const isInviteLimitReached = () => {
    if (!challenge) return false
    if (!challenge.maxParticipants) return false
    const currentCount = participants.length
    return currentCount >= challenge.maxParticipants
  }

  const shouldShowInviteMethods = () => {
    if (!challenge) return false
    if (challenge.status === 'COMPLETED') return false
    if (isInviteLimitReached()) return false
    if (challenge.status === 'IN_PROGRESS' && !challenge.allowGuests) return false
    return canUserInvite()
  }

  const shouldShowShareLink = () => {
    if (!challenge) return false
    if (challenge.status === 'COMPLETED') return false
    if (isInviteLimitReached()) return false
    if (challenge.status === 'IN_PROGRESS' && !challenge.allowGuests) return false
    return canUserInvite()
  }

  const participantIds = participants.map((p) => p.user?.id || p.userId).filter(Boolean)
  const participantCount = participants.filter((p) => p.status !== 'INVITED').length
  const pendingInviteCount = participants.filter((p) => p.status === 'INVITED').length

  const canRequestFinish = (() => {
    if (!user || !challenge) return false
    if (challenge.status !== 'IN_PROGRESS') return false
    if (user.id !== challenge.creatorId) return false
    if (finishInfo?.active) return false
    if (finishInfo?.finishRequestAt && !finishInfo?.active) {
      const diff = Date.now() - finishInfo.finishRequestAt
      const minMs = 24 * 60 * 60 * 1000
      if (diff < minMs) return false
    }
    return true
  })()

  const hoursUntilNextRequest = (() => {
    if (!finishInfo?.finishRequestAt) return null
    const diff = Date.now() - finishInfo.finishRequestAt
    const minMs = 24 * 60 * 60 * 1000
    if (diff >= minMs) return 0
    return Math.ceil((minMs - diff) / (60 * 60 * 1000))
  })()

  // ========== RENDERIZAÇÃO ==========
  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando desafio...</div>
  }

  if (!challenge) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto text-center bg-dark-surface border border-medium-gray rounded-lg p-8">
          <h2 className="text-2xl font-bold text-main-white mb-4">Desafio não encontrado</h2>
          <p className="text-gray-400 mb-6">O desafio com ID <span className="text-neon-green font-mono">{id}</span> não foi encontrado.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-neon-green text-black font-bold py-2 px-6 rounded-lg hover:bg-neon-green/80"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    )
  }

  if (userResigned) {
    return (
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-3xl mx-auto space-y-6">
        <div className="text-center py-12">
          <div className="text-gray-400">
            Você desistiu deste desafio. Para mais informações, entre em contato com o suporte.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-3xl mx-auto space-y-6">
      {/* Alerta de Backend com problemas */}
      {backendError && (
        <div className="bg-orange-900/30 border border-orange-500/40 rounded-lg p-4 flex items-start gap-3">
          <i className="ph-fill ph-warning text-2xl text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-orange-300 font-semibold mb-1">Servidor com instabilidade</p>
            <p className="text-sm text-orange-200">
              Há problemas temporários no servidor. Algumas informações podem estar desatualizadas. 
              Tente novamente em alguns minutos.
            </p>
            {proofs.length > 0 && (
              <p className="text-xs text-orange-300 mt-2">
                ℹ️ Mostrando {proofs.length} prova(s) salva(s) localmente no seu dispositivo.
              </p>
            )}
          </div>
        </div>
      )}

      <ParabensVencedorModal
        isOpen={showCongratsModal}
        onClose={() => setShowCongratsModal(false)}
        checkinCount={winnerCheckinCount}
        amountReceived={winnerAmount}
        winnerName={winnerProfile?.username || challenge?.winnerId?.substring(0,8) || 'vencedor'}
      />

      {challenge.status === 'COMPLETED' && challenge.winnerId && (
        <div className="bg-green-900/30 border border-green-500/40 rounded-lg p-4 text-center mb-4 flex flex-col items-center">
          <span className="text-lg text-green-400 font-bold mb-2">Vencedor do desafio:</span>
          <div className="flex items-center gap-2 mb-2">
            <i className="ph-fill ph-trophy text-2xl text-yellow-400" />
            <span className="text-main-white font-mono text-lg">{challenge.winnerId.substring(0,8)}...</span>
          </div>
          <span className="text-green-300 text-sm">Parabéns ao vencedor!</span>
        </div>
      )}

      <div className="bg-gradient-to-r from-black via-gray-900 to-black border border-neon-green/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <p className="text-sm text-gray-400">Valor Bruto por Participante</p>
          <p className="text-xl font-bold text-neon-green">R$ {challenge.amount?.toFixed(2) || '0.00'}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">Taxa de Participação ({feePercent}%)</p>
          <p className="text-xl font-bold text-red-400">R$ {participationFeePerUser.toFixed(2)}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">Valor Líquido por Participante</p>
          <p className="text-xl font-bold text-blue-400">R$ {netStakePerUser.toFixed(2)}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">Participantes</p>
          <p className="text-xl font-bold">{totalParticipants}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">Total Líquido Potencial</p>
          <p className="text-xl font-bold text-neon-green">R$ {totalNetPotential.toFixed(2)}</p>
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-400">Pagamentos Confirmados</p>
          <p className="text-xl font-bold text-blue-400">{paidUserIds.length} / {totalParticipants}</p>
        </div>
      </div>

      {challenge.status === 'IN_PROGRESS' && (
        <div className="bg-black border border-blue-500/40 rounded-lg p-4 space-y-3">
          {isCreator && (
            <button
              type="button"
              disabled={!canRequestFinish || finishLoading}
              onClick={handleRequestFinish}
              className={`w-full font-bold py-2 px-4 rounded-lg transition ${
                canRequestFinish && !finishLoading
                  ? 'bg-blue-500 text-black hover:bg-blue-400'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {finishLoading
                ? 'Enviando pedido...'
                : canRequestFinish
                  ? 'Encerrar desafio mais cedo'
                  : 'Aguarde para solicitar novo encerramento'}
            </button>
          )}

          {finishInfo && (
            <div className="bg-black border border-neon-green/20 rounded-lg p-4 space-y-3">
              <p className="text-sm text-gray-400">
                Pedido de encerramento {finishInfo.active ? 'ativo' : 'inativo'}.
              </p>
              {finishInfo.active && (
                <div className="text-xs text-blue-200">
                  <p>Aceites: {finishInfo.acceptedCount}/{finishInfo.totalRequired}</p>
                  <p>
                    {finishInfo.userHasAccepted
                      ? 'Você já aceitou este encerramento.'
                      : 'Aguarde a aceitação dos outros participantes.'}
                  </p>
                </div>
              )}
              {!finishInfo.active && hoursUntilNextRequest && hoursUntilNextRequest > 0 && (
                <p className="text-xs text-yellow-300">
                  Próximo pedido em aproximadamente {hoursUntilNextRequest}h.
                </p>
              )}
            </div>
          )}

          {finishInfo?.active && !finishInfo.userHasAccepted && isActiveParticipant && (
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleRespondFinish('accept')}
                disabled={finishActionLoading}
                className="flex-1 bg-neon-green text-black font-bold py-2 px-4 rounded-lg hover:bg-neon-green/80 disabled:opacity-50"
              >
                Aceitar encerramento
              </button>
              <button
                type="button"
                onClick={() => handleRespondFinish('reject')}
                disabled={finishActionLoading}
                className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Recusar encerramento
              </button>
            </div>
          )}
        </div>
      )}

      {challenge.status === 'NOT_STARTED' && (
        <div className="bg-yellow-900/30 border border-yellow-500/40 rounded-lg p-3 text-xs text-yellow-200 space-y-1">
          {totalParticipants <= 1
            ? 'Mínimo de 2 participantes necessários para iniciar. Convide alguém antes de iniciar.'
            : 'Todos os participantes devem pagar antes de o desafio iniciar.'}
          {!allPaid && totalParticipants >= 2 && (
            <p className="text-[11px] text-yellow-300">
              Pagamentos confirmados: {paidUserIds.length} / {totalParticipants}
            </p>
          )}
        </div>
      )}

      {challenge.status === 'NOT_STARTED' && isCreator && !userResigned && (
        <div className="space-y-2">
          {canStart ? (
            <button
              onClick={handleStartChallenge}
              className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
            >
              Iniciar Desafio
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-gray-700 text-gray-400 font-bold py-3 px-4 rounded-lg cursor-not-allowed"
              title={totalParticipants < 2 ? 'Convide mais participantes' : 'Aguardando pagamentos'}
            >
              {totalParticipants < 2 ? 'Convide mais participantes' : 'Aguardando Pagamentos...'}
            </button>
          )}
          {removedUnpaid.length > 0 && (
            <div className="text-xs text-yellow-400 text-center">
              Removidos: {removedUnpaid.map(u => u.substring(0,8)+'...').join(', ')}
            </div>
          )}
          <button
            onClick={() => setShowCreatorCancelModal(true)}
            className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
          >
            Cancelar Desafio (Criador)
          </button>
        </div>
      )}

      {needsUserPayment && (
        <div className="bg-black border border-yellow-500/40 rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-300">Você ainda não pagou sua entrada neste desafio.</p>
          <button
            onClick={handlePayNowClick}
            className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
          >
            Pagar minha entrada (R$ {challenge.amount?.toFixed(2)})
          </button>
        </div>
      )}

      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center">
              {challenge.icon ? (
                <img src={challenge.icon} alt="Ícone" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <i className={`ph-fill ${getTypeIcon(challenge.type)} text-2xl text-gray-300`} />
              )}
            </div>
            {isCreator && (
              <label className="absolute -bottom-2 -right-2 bg-neon-green text-black text-xs font-bold px-2 py-1 rounded cursor-pointer shadow">
                Trocar
                <input type="file" accept="image/*" className="hidden" onChange={handleChangeIcon} />
              </label>
            )}
          </div>
          <i className={`ph-fill ${statusInfo?.icon} text-5xl ${statusInfo?.color}`}></i>
        </div>
        <h2 className="text-3xl font-semibold">{challenge.description}</h2>
        <p className={`text-xl font-bold ${statusInfo?.color}`}>Status: {statusInfo?.text}</p>
      </div>

      <div className="bg-black border border-neon-green/20 p-4 rounded-lg">
        <p className="text-gray-400">Valor da aposta:</p>
        <p className="text-3xl font-bold text-neon-green">R$ {challenge.amount?.toFixed(2) || '0.00'}</p>
        
        {challenge.startDate && (
          <div className="mt-4 space-y-1 text-sm">
            <p className="text-gray-400">
              <i className="ph ph-calendar-blank mr-2" />
              Início: <span className="text-main-white font-semibold">
                {new Date(challenge.startDate).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </p>
            {challenge.endDate && (
              <p className="text-gray-400">
                <i className="ph ph-calendar-check mr-2" />
                Término: <span className="text-main-white font-semibold">
                  {new Date(challenge.endDate).toLocaleDateString('pt-BR', { 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </p>
            )}
            {challenge.status === 'IN_PROGRESS' && challenge.endDate && (
              <p className="text-gray-400">
                <i className="ph ph-clock mr-2" />
                Dias restantes: <span className="text-neon-green font-semibold">
                  {Math.ceil((new Date(challenge.endDate) - new Date()) / (1000 * 60 * 60 * 24))} dias
                </span>
              </p>
            )}
          </div>
        )}
        
        {challenge.type === 'academia' && challenge.minWorkoutMinutes && (
          <p className="text-sm text-gray-400 mt-2">
            Tempo mínimo de treino: <span className="text-neon-green font-semibold">{challenge.minWorkoutMinutes} min</span>
          </p>
        )}
        {challenge.type === 'dieta' && (challenge.mealsPerDay || challenge.mealCountPerDay) && (
          <p className="text-sm text-gray-400 mt-2">
            Refeições por dia: <span className="text-neon-green font-semibold">{challenge.mealsPerDay || challenge.mealCountPerDay}</span>
          </p>
        )}
        {challenge.type === 'dieta' && challenge.minMealIntervalMinutes && (
          <p className="text-sm text-gray-400 mt-1">
            Intervalo mínimo entre refeições: <span className="text-neon-green font-semibold">{challenge.minMealIntervalMinutes} min</span>
          </p>
        )}
      </div>

      {(challenge.status === 'PENDING' || challenge.status === 'AWAITING_PAYMENT') && (
        <div className="text-center space-y-4">
          <p className="text-gray-300">Você precisa efetuar o pagamento da sua aposta para liberar o desafio.</p>
          {walletBalance !== null && (
            <p className="text-sm text-gray-400">
              Saldo disponível: <span className="text-neon-green font-semibold">R$ {Number(walletBalance).toFixed(2)}</span>
            </p>
          )}
          <button
            onClick={handlePayNowClick}
            className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
          >
            Pagar Agora (Criador)
          </button>
        </div>
      )}

      {challenge.status === 'NOT_STARTED' && (
        <div className="bg-black border border-neon-green/20 p-4 rounded-lg space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold">Participantes e Convites</h3>
            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-3">
              <span>
                Confirmados: {participantCount}
                {challenge.maxParticipants ? ` / ${challenge.maxParticipants}` : ''}
              </span>
              {pendingInviteCount > 0 && <span>Convites pendentes: {pendingInviteCount}</span>}
            </div>
          </div>
          {participants.length === 0 ? (
            <p className="text-center py-8 text-gray-400">Nenhum participante ainda.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {participants
                .slice()
                .sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99))
                .map((participant) => {
                  const userInfo = participant.user || {}
                  const statusInfo = participantStatusMeta[participant.status] || participantStatusMeta.UNKNOWN
                  const roleLabel = roleLabels[participant.role] || null
                  const canModerate =
                    isCreator &&
                    challenge.status === 'NOT_STARTED' &&
                    participant.status !== 'INVITED' &&
                    participant.userId &&
                    participant.userId !== user?.id &&
                    participant.userId !== challenge.creatorId
                  return (
                    <div
                      key={`${participant.userId}-${participant.status}-${participant.inviteId || 'none'}`}
                      className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg"
                    >
                      <div
                        className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                          userInfo.profilePicture ? 'bg-medium-gray' : 'bg-neon-green'
                        }`}
                      >
                        {userInfo.profilePicture ? (
                          <img src={`data:image/jpeg;base64,${userInfo.profilePicture}`} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-bold">
                            {(userInfo.username || participant.userId || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{userInfo.username || participant.userId?.substring(0, 8) || 'Usuário'}</p>
                          {roleLabel && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 uppercase tracking-wider">
                              {roleLabel}
                            </span>
                          )}
                        </div>
                        {userInfo.email && <p className="text-xs text-gray-400">{userInfo.email}</p>}
                        {participant.inviterId && (
                          <p className="text-[11px] text-gray-500">
                            Convidado por {participant.inviterUsername || participant.inviterId.substring(0, 8)}...
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                        {participant.status === 'INVITED' && (isCreator || participant.inviterId === user?.id) && (
                          <button
                            onClick={() => handleCancelInvite(participant.inviteId)}
                            disabled={inviteActionId === participant.inviteId}
                            className="text-xs px-3 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 disabled:opacity-50"
                          >
                            Cancelar convite
                          </button>
                        )}
                        {canModerate && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleKick(participant.userId)}
                              className="text-xs px-2 py-1 rounded bg-white/10 text-white hover:bg-white/20"
                            >
                              Kick
                            </button>
                            <button
                              onClick={() => handleBan(participant.userId)}
                              className="text-xs px-2 py-1 rounded bg-red-600/40 text-red-200 hover:bg-red-600/60"
                            >
                              Banir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {(challenge.status === 'NOT_STARTED' || challenge.status === 'AWAITING_PAYMENT') && shouldShowInviteMethods() && (
        <InviteFriends
          challengeId={id}
          mode="immediate"
          excludeFriendIds={participantIds}
          onInviteSent={handleInviteSent}
        />
      )}

      {shouldShowShareLink() && shareLink && (
        <div className="bg-black border border-neon-green/20 p-4 rounded-lg space-y-3">
          <h3 className="text-lg font-semibold text-neon-green">Link de Compartilhamento</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareLink.startsWith('http') ? shareLink : `${window.location.origin}/desafio/invite/${shareLink}`}
              readOnly
              className="flex-1 p-2 rounded bg-dark-bg border border-medium-gray text-main-white text-sm"
            />
            <button
              onClick={copyShareLink}
              className="px-4 py-2 bg-neon-green text-black font-bold rounded hover:bg-neon-green/80 transition-colors"
            >
              Copiar
            </button>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                shareLink.startsWith('http') ? shareLink : `${window.location.origin}/desafio/invite/${shareLink}`
              )}`}
              alt="QR Code"
              className="w-44 h-44 rounded bg-white p-1"
            />
            <div className="flex-1 space-y-2">
              <p className="text-xs text-gray-400">Escaneie o QR para entrar rapidamente.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="px-4 py-2 bg-transparent border border-white/30 text-main-white rounded hover:bg-white/10 transition-colors text-sm"
                >
                  Baixar QR
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400">Compartilhe o link ou QR code.</p>
        </div>
      )}

      {showShareLinkWarning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-xl font-semibold text-yellow-400 text-center">⚠️ Aviso</h3>
            <p className="text-gray-300 text-center">
              Este desafio já está em andamento. Usuários que entrarem agora terão desvantagem.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={confirmCopyShareLink}
                className="flex-1 bg-yellow-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-yellow-600"
              >
                Copiar Mesmo Assim
              </button>
              <button
                onClick={() => setShowShareLinkWarning(false)}
                className="flex-1 bg-transparent border border-white/20 text-gray-400 font-semibold py-2 px-4 rounded-lg hover:bg-white/5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {challenge.status === 'IN_PROGRESS' && isActiveParticipant && !userResigned && (
        <div className="space-y-4">
          <div className="bg-black border border-neon-green/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-neon-green">Check-ins de Hoje</h3>
              <span className="text-sm text-gray-400">
                {userProofsToday} / {dailyLimit}
              </span>
            </div>
            <button
              onClick={() => navigate(`/desafio/${id}/prova`)}
              disabled={hasReachedDailyLimit}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-transform ${
                hasReachedDailyLimit
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-neon-green text-black hover:scale-105'
              }`}
            >
              {hasReachedDailyLimit
                ? `Limite diário atingido (${userProofsToday}/${dailyLimit})`
                : 'Fazer Check-in (Anexar Prova)'}
            </button>
            {hasReachedDailyLimit && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Você já enviou todas as provas permitidas para hoje. Volte amanhã!
              </p>
            )}
          </div>
          
          {canCancel() && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
            >
              Desistir do Desafio
            </button>
          )}
        </div>
      )}

      {challenge.status === 'IN_PROGRESS' && !isActiveParticipant && (
        <div className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-4 text-center">
          <i className="ph ph-eye text-3xl text-gray-400 mb-2" />
          <p className="text-gray-400">Você está visualizando este desafio como espectador.</p>
        </div>
      )}

      {(challenge.status === 'COMPLETED' || challenge.status === 'AWAITING_CONFIRMATION') && (
        <div className="space-y-4">
          {proofs.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-3">Check-ins Válidos</h3>
              <div className="space-y-2">
                {proofs
                  .filter(p => proofStatus(p) === 'valid')
                  .map((proof, idx) => (
                    <div key={getProofKey(proof, idx)} className="bg-black border border-neon-green/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs text-gray-400">
                          {proof.userId?.substring(0, 8)}...
                        </span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(proof.timestamp || proof.createdAt).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300">{proof.description}</p>
                      {proof.imageUrl && (
                        <img src={proof.imageUrl} alt="Prova" className="mt-2 rounded max-w-xs" loading="lazy" />
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {challenge.status === 'IN_PROGRESS' && proofs.length > 0 && (
        <div className="bg-black border border-neon-green/20 rounded-lg p-4 space-y-4">
          <h3 className="text-xl font-semibold text-neon-green">Progresso dos Participantes</h3>
          {(() => {
            const proofsByUser = {}
            proofs.forEach(proof => {
              const uid = proof.userId || 'unknown'
              if (!proofsByUser[uid]) {
                proofsByUser[uid] = { valid: 0, invalid: 0, inProgress: 0, total: 0 }
              }
              proofsByUser[uid].total++
              const status = proofStatus(proof)
              if (status === 'valid') proofsByUser[uid].valid++
              else if (status === 'invalid') proofsByUser[uid].invalid++
              else if (status === 'in_progress') proofsByUser[uid].inProgress++
            })

            return (
              <div className="space-y-3">
                {Object.entries(proofsByUser).map(([userId, stats]) => {
                  const participant = participants.find(p => p.userId === userId)
                  const username = participant?.user?.username || userId.substring(0, 8)
                  
                  return (
                    <div key={userId} className="bg-dark-bg border border-medium-gray rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{username}</span>
                        <span className="text-sm text-gray-400">Total: {stats.total} check-ins</span>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-400">✓ {stats.valid} válidos</span>
                        {stats.inProgress > 0 && (
                          <span className="text-yellow-400">⏳ {stats.inProgress} em análise</span>
                        )}
                        {stats.invalid > 0 && (
                          <span className="text-red-400">✗ {stats.invalid} inválidos</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}

      {['IN_PROGRESS','COMPLETED','AWAITING_CONFIRMATION'].includes(challenge.status) && (
        <div className="bg-black border border-neon-green/20 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-neon-green">Calendário de Envios</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-green-600/70 text-white">Válido (você)</span>
              <span className="px-2 py-1 rounded bg-yellow-500/80 text-black">Em andamento (você)</span>
              <span className="px-2 py-1 rounded bg-red-600/70 text-white">Inválido (você)</span>
              <span className="px-2 py-1 rounded bg-gray-800 text-gray-300">Sem envio (você)</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">
              {calendarMonth !== null && calendarYear !== null && (
                <>
                  {new Date(calendarYear, calendarMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCalendarMonth(m => (m === 0 ? (setCalendarYear(y=>y-1), 11) : m-1))}
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              >◀</button>
              <button
                type="button"
                onClick={() => setCalendarMonth(m => (m === 11 ? (setCalendarYear(y=>y+1), 0) : m+1))}
                className="text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
              >▶</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-300">
            {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {generateCalendar().map((cell, idx) => {
              if (cell.blank) {
                return <div key={`blank-${idx}`} className="h-10"></div>
              }
              const keyDate = cell.dateObj.toISOString().substring(0,10)
              const cClass = dayCellClass(cell.dateObj)
              const hasProof = !!proofsByDay[keyDate]
              return (
                <button
                  key={`day-${keyDate}`}
                  type="button"
                  onClick={() => hasProof && openDayDetails(cell.dateObj)}
                  className={`h-10 rounded flex flex-col items-center justify-center text-xs font-bold transition
                    ${cClass} ${hasProof ? 'hover:scale-105' : 'opacity-50 cursor-default'}`}
                  title={hasProof ? 'Ver detalhes' : 'Sem envio'}
                >
                  {cell.dateObj.getDate()}
                  {hasProof && (
                    <span className="text-[8px] font-normal mt-0.5">
                      {proofsByDay[keyDate].length}x
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedDay && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-neon-green/30 rounded-xl p-6 max-w-md w-full space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Provas de {selectedDay}</h3>
              <button onClick={closeDayDetails} className="text-gray-400 hover:text-white">
                <i className="ph ph-x-circle" />
              </button>
            </div>

            {dayProofs.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nenhuma prova enviada para este dia.</p>
            ) : (
              <div className="space-y-2">
                {dayProofs.map((proof, idx) => (
                  <div key={getProofKey(proof, idx)} className="bg-black border border-neon-green/20 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">{proof.description}</p>
                    {proof.imageUrl && (
                      <img src={proof.imageUrl} alt="Prova" className="mt-2 rounded max-w-xs" />
                    )}
                  </div>
                ))}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={closeDayDetails}
                    className="flex-1 bg-transparent border border-white/30 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-white/5"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PopupMessage
        open={popup.open}
        title={popup.title}
        messages={popup.messages}
        type={popup.type}
        onClose={() => setPopup({ ...popup, open: false })}
      />

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-neon-green/30 rounded-xl p-6 max-w-md w-full space-y-4 animate-fade-in">
            <h3 className="text-2xl font-semibold text-white text-center">Como deseja pagar?</h3>
            <p className="text-gray-400 text-center text-sm">Você tem saldo suficiente na carteira</p>
            
            <div className="space-y-3 pt-2">
              <button
                onClick={handlePayWithWallet}
                className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m0-4h4m0 0l-2-2m2 2l-2 2" />
                </svg>
                Pagar com Saldo da Carteira
              </button>
              
              <button
                onClick={handleAddMoreBalance}
                className="w-full bg-slate-800 border border-white/30 text-white font-semibold py-3 px-4 rounded-lg transition-colors hover:bg-slate-700"
              >
                Adicionar Mais Saldo
              </button>
              
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full bg-transparent border border-white/20 text-gray-400 font-semibold py-2 px-4 rounded-lg transition-colors hover:bg-white/5"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-2xl font-semibold text-red-400 text-center">Desistir do Desafio</h3>
            <p className="text-sm text-gray-300">
              Tem certeza que deseja desistir? Essa ação remove somente você do desafio.
              {Boolean(userHasPaid)
                ? ' Como você já pagou, será aplicada uma taxa de 75% sobre o valor líquido e você recebe 25% de volta.'
                : ' Como ainda não foi pago, não há reembolso.'}
            </p>
            {userHasPaid && (
              <div className="bg-black/40 border border-white/10 rounded p-3 text-xs space-y-1">
                <p>Valor líquido base: <span className="text-neon-green font-semibold">R$ {netStakePerUser.toFixed(2)}</span></p>
                <p>Taxa (75%): <span className="text-red-400 font-semibold">R$ {(netStakePerUser * 0.75).toFixed(2)}</span></p>
                <p>Reembolso (25%): <span className="text-green-400 font-semibold">R$ {(netStakePerUser * 0.25).toFixed(2)}</span></p>
              </div>
            )}
            {cancelResult && (
              <div className="bg-green-900/30 border border-green-500/40 rounded p-3 text-xs">
                <p>{cancelResult.globalCancelled ? 'Desafio encerrado (todos desistiram).' : 'Você desistiu com sucesso.'}</p>
                {cancelResult.wasPaid && (
                  <p>Taxa: R$ {cancelResult.fee.toFixed(2)} | Reembolso: R$ {cancelResult.refund.toFixed(2)}</p>
                )}
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {cancelLoading ? 'Processando...' : 'Confirmar Desistência'}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 bg-transparent border border-white/30 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-white/5 disabled:opacity-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreatorCancelModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-2xl font-semibold text-red-400 text-center">Cancelar Desafio</h3>
            <p className="text-sm text-gray-300">
              Tem certeza que deseja cancelar este desafio? Todos os participantes que já pagaram receberão reembolso
              e o desafio será removido.
            </p>
            {cancelChallengeResult && (
              <div className="bg-black/40 border border-white/10 rounded p-3 text-xs space-y-1">
                <p>Reembolso por usuário: <span className="text-neon-green font-semibold">R$ {Number(cancelChallengeResult.refundAmountPerUser || 0).toFixed(2)}</span></p>
                <p>Reembolsados: <span className="text-green-300">{(cancelChallengeResult.refundedUserIds || []).length}</span></p>
                {Array.isArray(cancelChallengeResult.failedRefundUserIds) && cancelChallengeResult.failedRefundUserIds.length > 0 && (
                  <p className="text-red-300">Falhas: {cancelChallengeResult.failedRefundUserIds.map(u=>u.substring(0,8)+'...').join(', ')}</p>
                )}
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleConfirmCreatorCancel}
                disabled={cancelChallengeLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {cancelChallengeLoading ? 'Processando...' : 'Confirmar Cancelamento'}
              </button>
              <button
                onClick={() => setShowCreatorCancelModal(false)}
                disabled={cancelChallengeLoading}
                className="flex-1 bg-transparent border border-white/30 text-gray-300 font-semibold py-2 px-4 rounded-lg hover:bg-white/5 disabled:opacity-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {challenge.status === 'CANCELLED' && (
        <div className="bg-red-900/30 border border-red-500/40 p-4 rounded-lg text-sm space-y-2">
          <p className="font-semibold text-red-300">Desafio Cancelado</p>
          {cancellationInfo ? (
            <div className="space-y-1">
              {cancellationInfo.wasPaid ? (
                <>
                  <p className="text-gray-200">
                    Taxa paga (75% do líquido): <span className="text-red-300 font-semibold">R$ {(netStakePerUser * 0.75).toFixed(2)}</span>
                  </p>
                  <p className="text-gray-200">
                    Reembolso recebido (25% do líquido): <span className="text-neon-green font-semibold">R$ {(netStakePerUser * 0.25).toFixed(2)}</span>
                  </p>
                  {cancellationInfo.globalCancelled && (
                    <p className="text-xs text-gray-400">Todos desistiram deste desafio.</p>
                  )}
                </>
              ) : (
                <p className="text-gray-300">Nenhuma taxa aplicada (não houve pagamento prévio).</p>
              )}
            </div>
          ) : (
            <p className="text-gray-400">Nenhuma informação de reembolso disponível.</p>
          )}
        </div>
      )}

      {(isCreator && challenge.creatorParticipates === false) && (
        <button
          onClick={() => navigate(`/desafio/${id}/painel`)}
          className="bg-slate-800 border border-neon-green/30 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Abrir Painel do Criador
        </button>
      )}
    </div>
  )
}

export default DetalheDesafio