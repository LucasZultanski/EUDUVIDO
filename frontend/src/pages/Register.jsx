import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import ValidationModal from '../components/ValidationModal'
import PopupMessage from '../components/PopupMessage'

const Register = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [popup, setPopup] = useState({ open: false, title: '', messages: [], type: 'info' })
  const { register } = useAuth()
  const navigate = useNavigate()

  const showPopup = (t, m, type = 'info') => setPopup({ open: true, title: t, messages: Array.isArray(m) ? m : [m], type })

  const validateForm = () => {
    const errors = []
    
    // Validação de nome
    if (!name || name.trim() === '') {
      errors.push('Nome é obrigatório')
    } else if (name.trim().length < 2) {
      errors.push('Nome deve ter no mínimo 2 caracteres')
    } else if (name.trim().length > 100) {
      errors.push('Nome deve ter no máximo 100 caracteres')
    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name.trim())) {
      errors.push('Nome deve conter apenas letras e espaços')
    }
    
    // Validação de email
    if (!email || email.trim() === '') {
      errors.push('E-mail é obrigatório')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('E-mail inválido. Use um formato válido (ex: usuario@email.com)')
    } else if (email.length > 255) {
      errors.push('E-mail muito longo (máximo 255 caracteres)')
    }
    
    // Validação de senha
    if (!password || password.trim() === '') {
      errors.push('Senha é obrigatória')
    } else {
      if (password.length < 8) {
        errors.push('Senha deve ter no mínimo 8 caracteres')
      }
      if (password.length > 128) {
        errors.push('Senha deve ter no máximo 128 caracteres')
      }
      if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra minúscula')
      }
      if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Senha deve conter pelo menos uma letra maiúscula')
      }
      if (!/(?=.*\d)/.test(password)) {
        errors.push('Senha deve conter pelo menos um número')
      }
    }
    
    // Validação de confirmação de senha
    if (!confirmPassword || confirmPassword.trim() === '') {
      errors.push('Confirmação de senha é obrigatória')
    } else if (password !== confirmPassword) {
      errors.push('As senhas não coincidem')
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
      console.log('Register - Iniciando submit...')
      const result = await register(email, name, password)
      console.log('Register - Resultado:', result)

      if (result.success) {
        console.log('Register - Sucesso! Redirecionando para /')
        // Pequeno delay para garantir que o token foi salvo no contexto
        setTimeout(() => {
          navigate('/', { replace: true })
        }, 100)
      } else {
        console.error('Register - Erro:', result.error)
        setError(result.error)
      }
    } catch (error) {
      console.error('Register - Erro inesperado:', error)
      showPopup('Erro inesperado', 'Falha ao registrar usuário.', 'error')
      setError('Erro inesperado ao registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-black border border-neon-green/30 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2 text-center">
          Eu<span className="text-neon-green">Duvido</span>
        </h1>
        <p className="text-gray-400 text-center mb-8">Crie sua conta</p>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-500 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-black border border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
              placeholder="Ex: Maria Silva"
            />
          </div>

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
              placeholder="Ex: maria@email.com"
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
              minLength={8}
              className="w-full bg-black border border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
              placeholder="Ex: MinhaSenha123"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Senha
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-black border border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
              placeholder="Repita a senha"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-400">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-neon-green hover:underline">
            Faça login
          </Link>
        </p>
      </div>

      <ValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        errors={validationErrors}
        title="Erros no Formulário de Cadastro"
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

export default Register

