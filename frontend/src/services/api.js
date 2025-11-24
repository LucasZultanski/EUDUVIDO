import axios from 'axios'

// Usa URL relativa para que o proxy do Vite funcione corretamente
// O proxy no vite.config.js roteia as requisições para os serviços corretos
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // NOVO: evita espera longa em serviço offline
})

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar erros
let isRedirecting = false
let proofServiceDownUntil = 0

api.interceptors.response.use(
  (response) => {
    // Normaliza resposta do proof-service para GET /api/proofs/challenge/{id}/lite
    if (
      response.config?.url?.startsWith('/api/proofs/challenge/') &&
      response.config?.url?.endsWith('/lite') &&
      Array.isArray(response.data)
    ) {
      // Retorna array direto
      return response
    }
    // Normaliza resposta do proof-service para GET /api/proofs
    if (response.config?.url?.startsWith('/api/proofs') && Array.isArray(response.data?.items)) {
      response.data = response.data.items
    }
    return response
  },
  (error) => {
    const url = error.config?.url || ''
    const method = (error.config?.method || 'get').toLowerCase()

    // ===== ADICIONE ESTE BLOCO =====
    // CAPTURAR ERRO 500 DO PROOF-SERVICE
    if (error.response?.status === 500 && url.includes('/api/proofs')) {
      console.error('🔴 ERRO 500 NO PROOF-SERVICE:', {
        url: url,
        method: method,
        statusCode: error.response.status,
        statusText: error.response.statusText,
        responseData: error.response.data,
        responseText: error.response.data ? JSON.stringify(error.response.data) : 'sem dados',
        errorMessage: error.message,
        fullError: error.response.data?.message || error.response.data?.error || error.response.data
      })
    }
    // ================================

    // NORMALIZAR FALHAS DO PROOF-SERVICE EM RESPOSTAS VAZIAS PARA GET
    if (
      method === 'get' &&
      url.startsWith('/api/proofs/challenge/') &&
      url.endsWith('/lite')
    ) {
      console.warn('[proof-service] erro em GET', url, '-> retornando lista vazia')
      return Promise.resolve({ data: [], status: 200, headers: {}, config: error.config })
    }

    // Se for GET /api/proofs, retorna array vazio
    if (method === 'get' && url.startsWith('/api/proofs')) {
      console.warn('[proof-service] erro em GET', url, '-> retornando lista vazia')
      return Promise.resolve({ data: [], status: 200, headers: {}, config: error.config })
    }
    if (error.code === 'ECONNREFUSED' && url.startsWith('/api/proofs')) {
      console.warn('[proof-service] ECONNREFUSED, retornando lista vazia')
      return Promise.resolve({ data: [], status: 200, headers: {}, config: error.config })
    }
    if (error.response?.status === 500 &&
        url.startsWith('/api/proofs') &&
        !url.includes('/challenge/') ) {
      console.warn('[proof-service] 500 genérico em', url, 'retornando lista vazia')
      return Promise.resolve({ data: [], status: 200, headers: {}, config: error.config })
    }
    // NOVO: tratamento para erro 500 no endpoint de votos
    if (error.response?.status === 500 && url.startsWith('/api/challenges') && url.endsWith('/votes')) {
      console.warn('[challenge-service] 500 on votes, returning empty votes')
      return Promise.resolve({ data: { totalVotes: 0, requiredVotes: 0, voteCount: {}, allParticipants: [], winnerId: null }, status: 200, headers: {}, config: error.config })
    }

    if (error.response?.status === 401) {
      const path = window.location.pathname
      
      // Não redireciona se for uma atualização de perfil (pode ser um erro temporário)
      // ou se estiver nas rotas públicas
      const isProfileUpdate = url.includes('/api/users/me') && error.config?.method === 'patch'
      
      // Só remove o token e redireciona se NÃO estiver nas rotas públicas
      // e se não for uma atualização de perfil
      if (path !== '/login' && path !== '/register' && !isRedirecting && !isProfileUpdate) {
        console.log('API - Erro 401, removendo token e redirecionando')
        isRedirecting = true
        
        localStorage.removeItem('token')
        delete api.defaults.headers.common['Authorization']
        
        // Usa replace para evitar loop no histórico
        window.location.replace('/login')
        
        // Reseta o flag após um tempo
        setTimeout(() => {
          isRedirecting = false
        }, 1000)
      }
    }

    return Promise.reject(error)
  }
)

export async function checkProofHealth() {
  try {
    const r = await api.get('/api/proofs/health')
    if (Array.isArray(r.data)) return true // caso tenha mudado para lista
    if (r.data?.error === false && r.data?.status === 'UP') return true
    return false
  } catch {
    return false
  }
}

export default api
