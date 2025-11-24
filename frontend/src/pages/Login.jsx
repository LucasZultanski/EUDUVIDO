import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ValidationModal from '../components/ValidationModal'
import PopupMessage from '../components/PopupMessage'
import api from '../services/api'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [popup, setPopup] = useState({ open: false, title: '', messages: [], type: 'info' })
  const { login } = useAuth()
  // NOVO: precisamos do acceptToken também
  const { acceptToken } = useAuth()
  const navigate = useNavigate()

  const showPopup = (t, m, type = 'info') => setPopup({ open: true, title: t, messages: Array.isArray(m) ? m : [m], type })

  const validateForm = () => {
    const errors = []
    
    // Validação de email
    if (!email || email.trim() === '') {
      errors.push('E-mail é obrigatório')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('E-mail inválido. Use um formato válido (ex: usuario@email.com)')
    }
    
    // Validação de senha
    if (!password || password.trim() === '') {
      errors.push('Senha é obrigatória')
    } else if (password.length < 6) {
      errors.push('Senha deve ter no mínimo 6 caracteres')
    }
    
    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Validação completa
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setShowValidationModal(true)
      return
    }
    
    setError('')
    setValidationErrors([])
    setLoading(true)

    try {
      console.log('Login - Iniciando submit...', { email, password: '***' })
      const result = await login(email, password)
      console.log('Login - Resultado completo:', result)
      
      if (result.success) {
        console.log('Login - Sucesso! Token salvo, redirecionando para /')
        const tokenCheck = localStorage.getItem('token')
        console.log('Login - Token no localStorage:', tokenCheck ? 'Presente' : 'Ausente')
        
        // Pequeno delay para garantir que o token foi salvo no contexto
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 100)
      } else {
        console.error('Login - Erro:', result.error)
        setError(result.error)
      }
    } catch (error) {
      showPopup('Erro inesperado', 'Falha ao processar login.', 'error')
      console.error('Login - Erro inesperado:', error)
      setError('Erro inesperado ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  // NOVO: solicitar link mágico por email
  const handleRequestMagicLink = async () => {
    const errors = []
    if (!email || email.trim() === '') {
      errors.push('E-mail é obrigatório')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('E-mail inválido. Use um formato válido (ex: usuario@email.com)')
    }
    if (errors.length) {
      setValidationErrors(errors)
      setShowValidationModal(true)
      return
    }
    try {
      await api.post('/auth/login/magic', { email })
      showPopup('Link enviado', 'Verifique sua caixa de entrada.', 'success')
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || 'Falha ao enviar link'
      showPopup('Erro', msg, 'error')
    }
  }

  // NOVO: verificar token de link mágico presente na URL (?token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenParam = params.get('token')
    if (!tokenParam) return
    ;(async () => {
      try {
        const res = await api.post('/auth/login/magic/verify', { token: tokenParam })
        const accessToken = res.data?.accessToken || res.data?.token
        if (!accessToken) throw new Error('Token inválido')
        await acceptToken(accessToken)
        setTimeout(() => navigate('/', { replace: true }), 100)
      } catch (e) {
        const msg = e.response?.data?.message || e.response?.data?.error || 'Falha ao validar link'
        showPopup('Erro', msg, 'error')
      }
    })()
  }, [acceptToken, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-black border border-neon-green/30 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Eu<span className="text-neon-green">Duvido</span>
        </h1>
        <p className="text-gray-400 text-center mb-8">Faça login para continuar</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              E-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-black border border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
              placeholder="Ex: usuario@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-black border border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-400">
          Não tem uma conta?{' '}
          <Link to="/register" className="text-neon-green hover:underline">
            Cadastre-se
          </Link>
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleRequestMagicLink}
            className="w-full bg-slate-800 border border-white/30 text-white font-semibold py-2 px-4 rounded-lg mt-2 hover:bg-slate-700"
          >
            Entrar com link mágico (via e-mail)
          </button>
        </div>
      </div>

      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        errors={validationErrors}
        title="Erros no Formulário de Login"
      />

      <PopupMessage
        open={popup.open}
        title={popup.title}
        messages={popup.messages}
        type={popup.type}
        onClose={() => setPopup(p => ({ ...p, open: false }))}
      />
    </div>
  )
}

export default Login

