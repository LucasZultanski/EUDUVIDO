import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const WalletContext = createContext()

export function WalletProvider({ children }) {
  const [walletBalance, setWalletBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  const loadWallet = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/wallet')
      if (response.data && response.data.balance !== undefined) {
        setWalletBalance(response.data.balance)
      } else {
        console.warn('Resposta do wallet não contém balance:', response.data)
        setWalletBalance(0)
      }
    } catch (error) {
      console.error('Erro ao carregar saldo:', error)
      // Não define como 0 em caso de erro, mantém null para indicar que não foi carregado
      // Apenas define como 0 se for erro 401 (não autenticado) ou se a resposta indicar saldo zero
      if (error.response?.status === 401) {
        // Usuário não autenticado - não é um erro, apenas não há saldo disponível
        setWalletBalance(null)
      } else {
        // Outros erros - mantém null para indicar que não foi possível carregar
        setWalletBalance(null)
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshWallet = async () => {
    await loadWallet()
  }

  const updateBalance = (newBalance) => {
    setWalletBalance(newBalance)
  }

  useEffect(() => {
    // Evita chamadas 401 no login/register que causam redirecionamento em loop
    if (token) {
      loadWallet()
    } else {
      setLoading(false)
    }
  }, [token])

  return (
    <WalletContext.Provider value={{ walletBalance, loading, refreshWallet, updateBalance }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
