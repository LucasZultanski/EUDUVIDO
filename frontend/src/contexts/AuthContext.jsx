import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  // Função para carregar os dados do usuário
  const loadUser = useCallback(async (currentToken) => {
    if (!currentToken) {
      setUser(null)
      return
    }

    try {
      // Configura o token temporariamente para a requisição
      api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`
      const response = await api.get('/api/users/me')
      setUser(response.data)
      console.log('AuthContext - Dados do usuário carregados:', response.data)
    } catch (error) {
      console.error('AuthContext - Erro ao carregar usuário:', error)
      // Se o token for inválido, remove o token
      if (error.response?.status === 401) {
        setToken(null)
        setUser(null)
      }
    }
  }, [])

  // Sincroniza o header do axios quando o token muda e carrega o usuário
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('token', token)
      // Carrega os dados do usuário após configurar o token
      loadUser(token)
    } else {
      delete api.defaults.headers.common['Authorization']
      localStorage.removeItem('token')
      setUser(null)
    }
  }, [token, loadUser])

  const login = async (email, password) => {
    try {
      console.log('AuthContext - Fazendo login...', { email })
      const response = await api.post('/auth/login', { email, password })
      console.log('AuthContext - Resposta do login:', response.data)
      
      const newToken = response.data.accessToken || response.data.token
      
      if (!newToken) {
        console.error('AuthContext - Token não encontrado na resposta:', response.data)
        return { success: false, error: 'Token não recebido do servidor' }
      }
      
      console.log('AuthContext - Token recebido, salvando...')
      setToken(newToken)
      // O useEffect vai carregar o usuário automaticamente quando o token mudar
      return { success: true }
    } catch (error) {
      console.error('AuthContext - Erro no login:', error.response?.data || error.message)
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         (error.response?.status === 401 ? 'Credenciais inválidas' : error.message) || 
                         'Erro ao fazer login'
      return { success: false, error: errorMessage }
    }
  }

  const register = async (email, name, password) => {
    try {
      console.log('AuthContext - Registrando usuário...', { email, name })
      const response = await api.post('/auth/register', { email, name, password })
      console.log('AuthContext - Resposta do registro:', response.data)
      
      const newToken = response.data.accessToken || response.data.token
      
      if (!newToken) {
        console.error('AuthContext - Token não encontrado na resposta:', response.data)
        return { success: false, error: 'Token não retornado pelo servidor' }
      }
      
      console.log('AuthContext - Token recebido, salvando...')
      setToken(newToken)
      // O useEffect vai carregar o usuário automaticamente quando o token mudar
      return { success: true }
    } catch (error) {
      console.error('AuthContext - Erro no registro:', error.response?.data || error.message)
      const errorMessage = error.response?.data?.message || 
                         error.response?.data?.error || 
                         (error.response?.status === 409 ? 'Email já está em uso' : 
                          error.response?.status === 400 ? 'Dados inválidos' : error.message) || 
                         'Erro ao registrar'
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  // NOVO: aceitar token já emitido pelo backend (link mágico verificado)
  const acceptToken = async (newToken) => {
    if (!newToken) return { success: false, error: 'Token vazio' }
    setToken(newToken)
    return { success: true }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, acceptToken }}>
      {children}
    </AuthContext.Provider>
  )
}
