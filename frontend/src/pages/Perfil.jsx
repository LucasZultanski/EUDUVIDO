import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

export default function Perfil() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    profilePicture: null,
    birthDate: '',
    encryptedCardData: ''
  })
  const [previewImage, setPreviewImage] = useState(null)
  const [stats, setStats] = useState({
    participated: 0,
    won: 0
  })

  useEffect(() => {
    loadProfile()
    loadStats()
  }, [user])

  const loadProfile = async () => {
    try {
      const response = await api.get('/api/users/me')
      setProfile(response.data)
      if (response.data.profilePicture) {
        setPreviewImage(`data:image/jpeg;base64,${response.data.profilePicture}`)
      }
    } catch (error) {
      // Se for erro 401, não mostra toast (o interceptor já trata)
      if (error.response?.status !== 401) {
        showToast('Erro ao carregar perfil', 'error')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await api.get('/api/challenges/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error)
      // Não mostra erro, apenas deixa os valores padrão (0)
    }
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      showToast('Apenas PNG e JPEG são permitidos', 'error')
      return
    }

    if (file.size > 700 * 1024) { // ALTERADO 700KB
      showToast('Imagem deve ter no máximo 700KB', 'error')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      setProfile({ ...profile, profilePicture: base64 })
      setPreviewImage(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    // Validações básicas
    if (!profile.username || profile.username.trim() === '') {
      showToast('Nome de usuário é obrigatório', 'error')
      return
    }

    if (!profile.email || profile.email.trim() === '') {
      showToast('Email é obrigatório', 'error')
      return
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profile.email)) {
      showToast('Email inválido', 'error')
      return
    }

    setSaving(true)
    try {
      await api.patch('/api/users/me', {
        name: profile.username,
        email: profile.email,
        profilePicture: profile.profilePicture,
        birthDate: profile.birthDate || null,
        encryptedCardData: profile.encryptedCardData || null
      })
      showToast('Perfil atualizado com sucesso!', 'success')
      // Recarregar perfil para garantir que as alterações foram salvas
      await loadProfile()
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erro ao atualizar perfil'
      showToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmMessage = 'Tem certeza que deseja apagar sua conta? Esta ação é IRREVERSÍVEL e todos os seus dados serão perdidos permanentemente.'
    if (!window.confirm(confirmMessage)) {
      return
    }

    const doubleConfirm = 'Esta é sua última chance. Digite "APAGAR" para confirmar a exclusão permanente da conta:'
    const userInput = window.prompt(doubleConfirm)
    if (userInput !== 'APAGAR') {
      showToast('Exclusão de conta cancelada', 'info')
      return
    }

    setSaving(true)
    try {
      await api.delete('/api/users/me')
      showToast('Conta apagada com sucesso', 'success')
      // Fazer logout e redirecionar
      logout()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao apagar conta:', error)
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Erro ao apagar conta'
      showToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>

      {/* Estatísticas de Desafios */}
      <div className="bg-black border border-neon-green/30 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 text-neon-green">Estatísticas de Desafios</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-dark-bg border border-neon-green/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-neon-green mb-2">{stats.participated}</div>
            <div className="text-sm text-gray-400">Desafios Participados</div>
          </div>
          <div className="bg-dark-bg border border-neon-green/20 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-neon-green mb-2">{stats.won}</div>
            <div className="text-sm text-gray-400">Desafios Ganhos</div>
          </div>
        </div>
      </div>

      <div className="bg-secondary-dark rounded-lg p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-medium-gray flex items-center justify-center">
            {previewImage ? (
              <img src={previewImage} alt="Perfil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold">{profile.username?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="btn-primary cursor-pointer">
            Escolher Foto
            <input
              type="file"
              className="hidden"
              accept="image/png, image/jpeg"
              onChange={handleImageChange}
            />
          </label>
          <p className="text-sm text-medium-gray">PNG ou JPEG, máximo 700KB</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nome de Usuário</label>
            <input
              type="text"
              value={profile.username}
              onChange={(e) => setProfile({ ...profile, username: e.target.value })}
              className="w-full p-3 rounded bg-dark-bg border border-medium-gray text-main-white focus:border-neon-green focus:outline-none"
              placeholder="Ex: UsuarioAtivo"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="w-full p-3 rounded bg-dark-bg border border-medium-gray text-main-white focus:border-neon-green focus:outline-none"
              placeholder="Ex: usuario@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Data de Nascimento</label>
            <input
              type="date"
              value={profile.birthDate || ''}
              onChange={(e) => setProfile({ ...profile, birthDate: e.target.value })}
              className="w-full p-3 rounded bg-dark-bg border border-medium-gray text-main-white focus:border-neon-green focus:outline-none"
              placeholder="DD/MM/AAAA"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Cartão de Crédito (últimos 4 dígitos)</label>
            <input
              type="text"
              value={profile.encryptedCardData || ''}
              onChange={(e) => setProfile({ ...profile, encryptedCardData: e.target.value })}
              placeholder="Últimos 4 dígitos (Ex: 1234)"
              maxLength="4"
              className="w-full p-3 rounded bg-dark-bg border border-medium-gray text-main-white focus:border-neon-green focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>

        <div className="border-t border-medium-gray pt-6 space-y-3">
          <button
            onClick={handleLogout}
            className="w-full bg-transparent border border-white/50 text-main-white font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
          >
            Sair (Logout)
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={saving}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Processando...' : 'Apagar Conta'}
          </button>
          <p className="text-xs text-red-400 text-center">
            ⚠️ Atenção: Apagar a conta é uma ação permanente e irreversível
          </p>
        </div>
      </div>
    </div>
  )
}

