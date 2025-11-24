import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

const MeusDesafios = () => {
  const [createdChallenges, setCreatedChallenges] = useState([])
  const [invitedChallenges, setInvitedChallenges] = useState([])
  const [resignedChallenges, setResignedChallenges] = useState([]) // NOVO
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('Todos')
  const [filterType, setFilterType] = useState('Todos')
  const [userId, setUserId] = useState(null) // NOVO
  const navigate = useNavigate()

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (userId) loadChallenges()
  }, [userId])

  const loadUser = async () => {
    try {
      const res = await api.get('/api/users/me')
      setUserId(res.data.id)
    } catch {
      setUserId(null)
    }
  }

  const isResigned = (ch) => {
    if (!userId || !ch) return false
    const localKey = `challengeCancel:${ch.id}:${userId}`
    const creatorResigned = (ch.creatorId === userId && ch.creatorParticipates === false)
    const localFlag = Boolean(localStorage.getItem(localKey))
    return creatorResigned || localFlag || ch.status === 'CANCELLED'
  }

  const loadChallenges = async () => {
    try {
      const response = await api.get('/api/challenges')
      if (response.data.created && response.data.invited) {
        let created = Array.isArray(response.data.created) ? response.data.created : []
        let invited = Array.isArray(response.data.invited) ? response.data.invited : []
        const resigned = [...created, ...invited].filter(isResigned)
        created = created.filter(c => !isResigned(c))
        invited = invited.filter(c => !isResigned(c))
        setResignedChallenges(resigned)
        setCreatedChallenges(created)
        setInvitedChallenges(invited)
      } else {
        const allChallenges = Array.isArray(response.data) ? response.data : []
        const resigned = allChallenges.filter(isResigned)
        const active = allChallenges.filter(c => !isResigned(c))
        setResignedChallenges(resigned)
        setCreatedChallenges(active)
        setInvitedChallenges([])
      }
    } catch {
      setCreatedChallenges([])
      setInvitedChallenges([])
      setResignedChallenges([])
    } finally {
      setLoading(false)
    }
  }

  // Funções auxiliares agrupadas
  const getStatusColor = (status) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
      case 'PENDING': return 'text-yellow-400'
      case 'NOT_STARTED': return 'text-blue-400'
      case 'IN_PROGRESS':
      case 'ACCEPTED': return 'text-neon-green'
      case 'COMPLETED': return 'text-green-400'
      case 'CANCELLED': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'AWAITING_PAYMENT':
      case 'PENDING':
        return 'Aguardando Pagamento'
      case 'NOT_STARTED':
        return 'Não Iniciado'
      case 'IN_PROGRESS':
      case 'ACCEPTED':
        return 'Em Andamento'
      case 'COMPLETED':
        return 'Concluído'
      case 'CANCELLED':
        return 'Cancelado'
      default:
        return 'Não Iniciado'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'academia':
        return 'Academia'
      case 'corrida':
        return 'Corrida'
      case 'dieta':
        return 'Dieta'
      case 'estudo':
        return 'Estudo'
      case 'custom':
        return 'Customizável'
      default:
        return 'Desafio'
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

  // NOVO: normaliza string removendo acentos e caixa
  const normalize = (s='') =>
    s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

  // NOVO: mapeia opção do filtro para status válidos do backend
  const matchesStatusOption = (status, option) => {
    const opt = normalize(option)
    if (opt === 'todos') return true
    if (opt === 'aguardando pagamento') {
      return status === 'AWAITING_PAYMENT' || status === 'PENDING'
    }
    if (opt === 'nao iniciado') {
      return status === 'NOT_STARTED'
    }
    if (opt === 'em andamento') {
      return status === 'IN_PROGRESS' || status === 'ACCEPTED'
    }
    if (opt === 'concluido') {
      return status === 'COMPLETED'
    }
    if (opt === 'cancelado') {
      return status === 'CANCELLED'
    }
    return true
  }

  const filterChallenges = (challenges) => {
    return challenges.filter((challenge) => {
      const matchesSearch = challenge.description?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = matchesStatusOption(challenge.status, filterStatus) // ALTERADO
      const matchesType = filterType === 'Todos' || getTypeLabel(challenge.type) === filterType
      return matchesSearch && matchesStatus && matchesType
    })
  }

  const filteredCreated = filterChallenges(createdChallenges)
  const filteredInvited = filterChallenges(invitedChallenges)

  if (loading) {
    return <div className="text-center py-12">Carregando desafios...</div>
  }

  const renderChallengeCard = (challenge, variant = 'default') => (
    <div
      key={challenge.id}
      className={`bg-black p-4 rounded-lg shadow-lg flex flex-col justify-between border ${
        variant === 'resigned' ? 'border-red-500/40' : 'border-neon-green/30'
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center flex-shrink-0">
              {challenge.icon ? (
                <img src={challenge.icon} alt={`Ícone de ${challenge.description}`} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <i className={`ph-fill ${getTypeIcon(challenge.type)} text-2xl text-gray-300`} />
              )}
            </div>
            <h3 className={`text-xl font-semibold leading-tight ${variant === 'resigned' ? 'text-red-400' : ''}`}>
              {challenge.description}
            </h3>
          </div>
          <span className={`text-xs font-mono px-2 py-0.5 ${
            variant === 'resigned' ? 'bg-red-600/30 text-red-300' : 'bg-neon-green/20 text-neon-green'
          } rounded-full flex-shrink-0`}>
            {getTypeLabel(challenge.type)}
          </span>
        </div>
        {/* Indicador de convite pendente */}
        {challenge.invitedUserId && !challenge.acceptorId && challenge.status === 'PENDING' && (
          <div className="mb-2">
            <span className="inline-block text-xs px-2 py-1 bg-yellow-600/30 text-yellow-400 rounded-full">
              Convidado aguardando aceitar
            </span>
          </div>
        )}
        <p className="text-sm text-gray-400 mb-3">
          Valor: R$ {challenge.amount?.toFixed(2) || '0.00'}
        </p>
        {/* NOVO: Exibe vencedor se concluído */}
        {challenge.status === 'COMPLETED' && challenge.winnerId && (
          <p className="text-xs text-green-400 mb-2">
            Vencedor: <span className="font-mono">{challenge.winnerId.substring(0,8)}...</span>
          </p>
        )}
        <div className="flex justify-between items-baseline mb-4">
          <span className={`text-lg font-bold ${getStatusColor(challenge.status)}`}>
            R$ {challenge.amount?.toFixed(2) || '0.00'}
          </span>
          <span className={`font-semibold ${
            variant === 'resigned' ? 'text-red-400' : getStatusColor(challenge.status)
          }`}>
            {variant === 'resigned' ? 'Desistido' : getStatusText(challenge.status)}
          </span>
        </div>
      </div>
      <button
        onClick={() => navigate(`/desafio/${challenge.id}`)}
        className={`w-full font-bold py-2 px-4 rounded-lg transition-transform hover:scale-105 ${
          variant === 'resigned'
            ? 'bg-red-600 text-white hover:bg-red-500'
            : 'bg-neon-green text-black hover:bg-neon-green/80'
        }`}
      >
        Ver detalhes
      </button>
    </div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-semibold">Meus Desafios</h2>
        <button
          onClick={() => navigate('/criar-desafio')}
          className="bg-neon-green text-black font-bold py-2 px-5 rounded-lg transition-transform hover:scale-105"
        >
          Criar novo desafio
        </button>
      </div>

      <div className="mb-6 bg-black border border-neon-green/30 p-4 rounded-lg flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="search_nome" className="block text-sm font-medium text-gray-300">
            Buscar por nome
          </label>
          <input
            type="text"
            id="search_nome"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
            placeholder="Buscar: Ex: Corrida manhã, Dieta sem açúcar..."
          />
        </div>
        <div className="flex-1 md:max-w-xs">
          <label htmlFor="filter_type" className="block text-sm font-medium text-gray-300">
            Filtrar por tipo
          </label>
          <select
            id="filter_type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
          >
            <option>Todos</option>
            <option>Academia</option>
            <option>Corrida</option>
            <option>Dieta</option>
            <option>Estudo</option>
            <option>Customizável</option>
          </select>
        </div>
        <div className="flex-1 md:max-w-xs">
          <label htmlFor="filter_status" className="block text-sm font-medium text-gray-300">
            Filtrar por status
          </label>
          <select
            id="filter_status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
          >
            <option>Todos</option>
            <option>Aguardando Pagamento</option>
            <option>Não iniciado</option>
            <option>Em andamento</option>
            <option>Concluído</option>
          </select>
        </div>
      </div>

      {/* Seção: Desafios Criados por Mim */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-neon-green">Desafios Criados por Mim</h3>
        {filteredCreated.length === 0 ? (
          <div className="bg-black border border-neon-green/30 rounded-lg p-12 text-center">
            {createdChallenges.length === 0 ? (
              <div className="space-y-6">
                <div className="text-6xl mb-4">🎯</div>
                <p className="text-xl text-gray-300 mb-6">
                  Você ainda não criou nenhum desafio
                </p>
                <button
                  onClick={() => navigate('/criar-desafio')}
                  className="bg-neon-green text-black font-bold py-4 px-8 rounded-lg transition-transform hover:scale-105 text-lg shadow-lg"
                >
                  🚀 Criar Meu Primeiro Desafio
                </button>
              </div>
            ) : (
              <p className="text-gray-400">Nenhum desafio encontrado com os filtros aplicados</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCreated.map(renderChallengeCard)}
          </div>
        )}
      </div>

      {/* Seção: Desafios que Sou Convidado */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-blue-400">Desafios que Sou Convidado</h3>
        {filteredInvited.length === 0 ? (
          <div className="bg-black border border-blue-400/30 rounded-lg p-8 text-center">
            <p className="text-gray-400">
              {invitedChallenges.length === 0 
                ? 'Você ainda não foi convidado para nenhum desafio'
                : 'Nenhum desafio encontrado com os filtros aplicados'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvited.map(renderChallengeCard)}
          </div>
        )}
      </div>

      {/* NOVO: Seção Desafios que Desisti */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4 text-red-400">Desafios que Desisti</h3>
        {resignedChallenges.length === 0 ? (
          <div className="bg-black border border-red-500/30 rounded-lg p-8 text-center">
            <p className="text-gray-400">Você ainda não desistiu de nenhum desafio</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resignedChallenges.map(c => renderChallengeCard(c, 'resigned'))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MeusDesafios

