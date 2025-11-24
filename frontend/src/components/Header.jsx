import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { useWallet } from '../contexts/WalletContext'

const Header = () => {
  const location = useLocation()
  const { walletBalance } = useWallet()
  const [userAvatar, setUserAvatar] = useState(null)
  const [username, setUsername] = useState('')
  const [pendingRequests, setPendingRequests] = useState(0)
  const retryRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    let isMounted = true
    
    if (token) {
      // Adiciona um delay para garantir que o token está configurado no axios
      const loadData = async () => {
        // Aguarda um pouco antes de fazer as requisições
        await new Promise(resolve => setTimeout(resolve, 300))
        
        if (isMounted) {
          await loadUserProfile()
          await loadPendingRequests()
        }
      }
      loadData()
    }
    
    return () => {
      isMounted = false
    }
  }, [location.pathname]) // Recarregar quando mudar de página (especialmente ao voltar do perfil)

  const loadUserProfile = async () => {
    try {
      const response = await api.get('/api/users/me')
      setUsername(response.data.username)
      if (response.data.profilePicture && response.data.profilePicture.trim() !== '') {
        // Se já tem o prefixo data:image, usar direto, senão adicionar
        const profilePicture = response.data.profilePicture.startsWith('data:image')
          ? response.data.profilePicture
          : `data:image/jpeg;base64,${response.data.profilePicture}`
        setUserAvatar(profilePicture)
      } else {
        setUserAvatar(null)
      }
    } catch (error) {
      const status = error?.response?.status
      if (status === 500 && !retryRef.current) {
        retryRef.current = true
        setTimeout(() => loadUserProfile(), 1000)
        return
      }
      if (status !== 401) {
        console.error('Erro ao carregar perfil:', error)
      }
    }
  }

  const loadPendingRequests = async () => {
    try {
      const res = await api.get('/api/friend-requests/received')
      setPendingRequests(Array.isArray(res.data) ? res.data.length : 0)
    } catch (e) {
      // silencioso
    }
  }

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/desafio')
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header className="bg-dark-surface border-b border-neon-green/20 sticky top-0 z-50 shadow-lg">
      <nav className="container mx-auto p-4 flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold">
          Eu<span className="text-neon-green">Duvido</span>
        </Link>

        <div className="hidden lg:flex space-x-6 items-center">
          <Link
            to="/"
            className={`py-2 px-3 rounded-md transition-colors ${
              isActive('/') ? 'nav-link-active' : 'text-main-white hover:text-neon-green'
            }`}
          >
            Meus Desafios
          </Link>
          <Link
            to="/criar-desafio"
            className={`py-2 px-3 rounded-md transition-colors ${
              isActive('/criar-desafio') ? 'nav-link-active' : 'text-main-white hover:text-neon-green'
            }`}
          >
            Criar Desafio
          </Link>
          <Link
            to="/carteira"
            className={`py-2 px-3 rounded-md transition-colors ${
              isActive('/carteira') ? 'nav-link-active' : 'text-main-white hover:text-neon-green'
            }`}
          >
            Carteira
          </Link>
          {/* ALTERADO: texto "Solicitações" com badge */}
          <Link
            to="/amigos"
            className={`py-2 px-3 rounded-md transition-colors ${
              isActive('/amigos') ? 'nav-link-active' : 'text-main-white hover:text-neon-green'
            }`}
          >
            <span className="relative inline-block">
              Solicitações
              {pendingRequests > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow">
                  {pendingRequests}
                </span>
              )}
            </span>
          </Link>
          {/* REMOVIDO: badge do avatar (desktop) */}
          <Link to="/perfil" className="flex items-center">
            <div className="relative">
              <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ${
                isActive('/perfil') ? 'ring-2 ring-neon-green' : 'ring-1 ring-medium-gray hover:ring-neon-green'
              } transition-all ${userAvatar ? 'bg-medium-gray' : 'bg-neon-green'}`}>
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white">{username?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          </Link>
          <div className="ml-4 px-4 py-2 bg-neon-green/10 border border-neon-green/30 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m0-4h4m0 0l-2-2m2 2l-2 2" />
              </svg>
              <span className="text-sm text-gray-400">Saldo:</span>
              <span className="font-mono font-semibold text-neon-green">
                {walletBalance !== null && walletBalance !== undefined 
                  ? `R$ ${Number(walletBalance).toFixed(2)}` 
                  : '...'}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:hidden flex space-x-4 items-center">
          <div className="px-2 py-1 bg-neon-green/10 border border-neon-green/30 rounded">
            <span className="font-mono text-xs font-semibold text-neon-green">
              {walletBalance !== null && walletBalance !== undefined 
                ? `R$ ${Number(walletBalance).toFixed(2)}` 
                : '...'}
            </span>
          </div>
          <Link
            to="/"
            className={`p-2 ${isActive('/') ? 'text-neon-green' : 'text-main-white'}`}
            aria-label="Meus Desafios"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17.5a1 1 0 001 1h2.5a1 1 0 001-1v-2.1a1 1 0 011-1h1a1 1 0 011 1V17.5a1 1 0 001 1H15a1 1 0 001-1v-7.086l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
            </svg>
          </Link>
          <Link
            to="/criar-desafio"
            className={`p-2 ${isActive('/criar-desafio') ? 'text-neon-green' : 'text-main-white'}`}
            aria-label="Criar Desafio"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </Link>
          <Link
            to="/perfil"
            className="p-1"
            aria-label="Perfil"
          >
            <div className="relative">
              <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center ${
                isActive('/perfil') ? 'ring-2 ring-neon-green' : 'ring-1 ring-medium-gray'
              } ${userAvatar ? 'bg-medium-gray' : 'bg-neon-green'}`}>
                {userAvatar ? (
                  <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">{username?.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          </Link>
          <Link
            to="/carteira"
            className={`p-2 ${isActive('/carteira') ? 'text-neon-green' : 'text-main-white'}`}
            aria-label="Carteira"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2m0-4h4m0 0l-2-2m2 2l-2 2" />
            </svg>
          </Link>
          {/* ALTERADO: ícone mobile com badge e sem rótulo literal "Amigos" */}
          <Link
            to="/amigos"
            className={`p-2 ${isActive('/amigos') ? 'text-neon-green' : 'text-main-white'}`}
            aria-label="Solicitações"
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {/* ícone de grupo de pessoas */}
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 009.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {pendingRequests > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] px-1 py-0.5 rounded-full font-bold shadow">
                  {pendingRequests}
                </span>
              )}
            </div>
          </Link>
        </div>
      </nav>
    </header>
  )
}

export default Header
