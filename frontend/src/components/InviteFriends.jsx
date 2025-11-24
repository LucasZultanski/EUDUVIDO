import { useState, useEffect } from 'react'
import api from '../services/api'

/**
 * Componente padronizado para convidar amigos
 * Pode ser usado em modo "staged" (seleção múltipla sem envio imediato) ou "immediate" (envio imediato)
 * 
 * @param {Object} props
 * @param {string} props.challengeId - ID do desafio (opcional, apenas para modo immediate)
 * @param {Array} props.selectedFriends - Array de IDs de amigos já selecionados (modo staged)
 * @param {Function} props.onSelectionChange - Callback quando seleção muda (modo staged)
 * @param {Function} props.onInviteSent - Callback quando convite é enviado (modo immediate)
 * @param {Array} props.excludeFriendIds - IDs de amigos a excluir da lista
 * @param {string} props.mode - 'staged' ou 'immediate' (padrão: 'staged')
 */
export default function InviteFriends({
  challengeId = null,
  selectedFriends = [],
  onSelectionChange = () => {},
  onInviteSent = () => {},
  excludeFriendIds = [],
  mode = 'staged'
}) {
  const [friends, setFriends] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingInvite, setSendingInvite] = useState(false)

  useEffect(() => {
    loadFriends()
  }, [challengeId, mode])

  const loadFriends = async () => {
    try {
      setLoading(true)
      // Simples e estável: sempre usa a lista geral de amigos e filtra localmente
      const response = await api.get('/api/friends')
      setFriends(response.data || [])
    } catch {
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  const filteredFriends = friends
    .filter(friend => {
      // Excluir amigos já na lista de exclusão
      if (excludeFriendIds.includes(friend.id)) return false
      
      // Filtrar por busca
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return friend.username?.toLowerCase().includes(query) ||
             friend.email?.toLowerCase().includes(query)
    })
    .sort((a, b) => {
      // Ordenar alfabeticamente por username
      const nameA = (a.username || '').toLowerCase()
      const nameB = (b.username || '').toLowerCase()
      return nameA.localeCompare(nameB)
    })

  const handleToggleFriend = (friendId) => {
    if (mode === 'staged') {
      const isSelected = selectedFriends.includes(friendId)
      const newSelection = isSelected
        ? selectedFriends.filter(id => id !== friendId)
        : [...selectedFriends, friendId]
      onSelectionChange(newSelection)
    }
  }

  const handleInviteFriend = async (friendId) => {
    if (mode !== 'immediate' || !challengeId) return
    
    try {
      setSendingInvite(true)
      await api.post(`/api/challenges/${challengeId}/invite`, { friendId })
      onInviteSent(friendId)
      await loadFriends()
    } catch (error) {
      console.error('Erro ao convidar amigo:', error)
      alert(error.response?.data?.error || 'Erro ao convidar amigo')
    } finally {
      setSendingInvite(false)
    }
  }

  const getUserAvatar = (friend) => {
    if (friend.profilePicture) {
      return `data:image/jpeg;base64,${friend.profilePicture}`
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-black border border-neon-green/20 p-4 rounded-lg">
        <p className="text-center text-gray-400 py-4">Carregando amigos...</p>
      </div>
    )
  }

  return (
    <div className="bg-black border border-neon-green/20 p-4 rounded-lg space-y-3">
      <h3 className="text-lg font-semibold">Convidar Amigos</h3>
      
      {/* Barra de Busca */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Buscar Amigo"
        className="w-full p-2 rounded bg-dark-bg border border-medium-gray text-main-white focus:border-neon-green focus:outline-none"
      />

      {/* Lista de Amigos */}
      {filteredFriends.length === 0 ? (
        <p className="text-center py-8 text-gray-400">
          {searchQuery.trim() 
            ? 'Nenhum amigo encontrado com esse nome.'
            : mode === 'immediate' 
              ? 'Você não tem mais amigos para convidar.'
              : 'Você ainda não tem amigos adicionados.'}
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredFriends.map((friend) => {
            const isSelected = selectedFriends.includes(friend.id)
            const avatar = getUserAvatar(friend)
            
            return (
              <div
                key={friend.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  mode === 'staged' && isSelected
                    ? 'bg-neon-green/20 border border-neon-green'
                    : 'bg-dark-bg border border-medium-gray'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  {mode === 'staged' && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleFriend(friend.id)}
                      className="w-5 h-5 text-neon-green bg-dark-bg border-medium-gray rounded focus:ring-neon-green cursor-pointer"
                    />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${
                    avatar ? 'bg-medium-gray' : 'bg-neon-green'
                  }`}>
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-bold text-sm">
                        {friend.username?.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{friend.username}</p>
                    <p className="text-sm text-gray-400">{friend.email}</p>
                  </div>
                </div>
                
                {mode === 'immediate' && (
                  <button
                    onClick={() => handleInviteFriend(friend.id)}
                    disabled={sendingInvite}
                    className="px-4 py-2 bg-neon-green text-black font-bold rounded hover:bg-neon-green/80 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingInvite ? 'Enviando...' : 'Convidar'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Contador de selecionados (modo staged) */}
      {mode === 'staged' && selectedFriends.length > 0 && (
        <p className="text-sm text-neon-green text-center pt-2 border-t border-medium-gray">
          {selectedFriends.length} amigo{selectedFriends.length !== 1 ? 's' : ''} selecionado{selectedFriends.length !== 1 ? 's' : ''}
        </p>
      )}
      {mode === 'immediate' && (
        <p className="text-xs text-gray-400 text-center">
          O convite só adiciona o amigo após ele aceitar na tela de notificações.
        </p>
      )}
    </div>
  )
}

