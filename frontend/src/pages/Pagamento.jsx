import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import api from '../services/api'
import PopupMessage from '../components/PopupMessage'

// Tela de pagamento moderna (simulada) para modo de teste
export default function Pagamento() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { refreshWallet } = useWallet()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [walletBalance, setWalletBalance] = useState(null)
  const [card, setCard] = useState({
    number: '4242 4242 4242 4242',
    name: '',
    expiry: '',
    cvc: '',
  })
  const [challengeStatus, setChallengeStatus] = useState(null)
  const [guardChecked, setGuardChecked] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState(true)
  const [challengeAmount, setChallengeAmount] = useState(10) // Default 10, will be updated
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const [popup,setPopup]=useState({open:false,title:'',messages:[],type:'info'})

  // Validação de cartão
  const validateCard = () => {
    const errors = []
    
    // Validar nome
    if (!card.name || card.name.trim().length < 3) {
      errors.push('Nome do titular deve ter pelo menos 3 caracteres')
    }
    
    // Validar número do cartão (remove espaços e valida)
    const cardNumber = card.number.replace(/\s/g, '')
    if (!cardNumber || cardNumber.length !== 16 || !/^\d+$/.test(cardNumber)) {
      errors.push('Número do cartão deve ter 16 dígitos')
    }
    
    // Validar validade (MM/AA ou MM/AAAA)
    const expiryRegex = /^(0[1-9]|1[0-2])\/(\d{2}|\d{4})$/
    if (!card.expiry || !expiryRegex.test(card.expiry)) {
      errors.push('Validade deve estar no formato MM/AA')
    } else {
      // Verificar se não está vencido
      const [month, year] = card.expiry.split('/')
      const expYear = year.length === 2 ? `20${year}` : year
      const expDate = new Date(parseInt(expYear), parseInt(month) - 1)
      const now = new Date()
      if (expDate < now) {
        errors.push('Cartão está vencido')
      }
    }
    
    // Validar CVV (3 dígitos)
    if (!card.cvc || card.cvc.length !== 3 || !/^\d+$/.test(card.cvc)) {
      errors.push('CVV deve ter 3 dígitos')
    }
    
    return errors
  }


  // Guard: load challenge status; if not PENDING redirect back
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await api.get(`/api/challenges/${id}`)
        if (!active) return
        setChallengeStatus(res.data.status)
        setChallengeAmount(res.data.amount || 10) // Store challenge amount
        if (res.data.status !== 'PENDING') {
          navigate(`/desafio/${id}`)
        }
      } catch (e) {
        // If can't load challenge, navigate back
        navigate(`/desafio/${id}`)
      } finally {
        if (active) setGuardChecked(true)
      }
    }
    load()
    return () => { active = false }
  }, [id, navigate])

  // Load wallet balance to check if user has sufficient funds
  useEffect(() => {
    if (!guardChecked) return
    let active = true
    const fetchWallet = async () => {
      try {
        const res = await api.get('/api/wallet')
        if (!active) return
        const balance = res.data?.balance || 0
        setWalletBalance(balance)
        // Se saldo insuficiente, redirecionar para carteira com parâmetros
        if (balance < challengeAmount) {
          navigate(`/carteira?challengeId=${id}&amount=${challengeAmount}`)
          return
        }
      } catch (e) {
        setError('Erro ao carregar saldo')
      } finally {
        if (active) setLoadingWallet(false)
      }
    }
    fetchWallet()
    return () => { active = false }
  }, [guardChecked, challengeAmount, id, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    
    let formattedValue = value
    
    // Formatar número do cartão (adicionar espaços a cada 4 dígitos)
    if (name === 'number') {
      formattedValue = value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim()
      if (formattedValue.length > 19) formattedValue = formattedValue.slice(0, 19)
    }
    
    // Formatar validade (adicionar / após 2 dígitos)
    if (name === 'expiry') {
      formattedValue = value.replace(/\D/g, '')
      if (formattedValue.length >= 2) {
        formattedValue = formattedValue.slice(0, 2) + '/' + formattedValue.slice(2, 4)
      }
      if (formattedValue.length > 5) formattedValue = formattedValue.slice(0, 5)
    }
    
    // Formatar CVC (apenas números, máximo 3)
    if (name === 'cvc') {
      formattedValue = value.replace(/\D/g, '').slice(0, 3)
    }
    
    // Formatar nome (apenas letras e espaços)
    if (name === 'name') {
      formattedValue = value.toUpperCase().replace(/[^A-Z\s]/g, '')
    }
    
    setCard((s) => ({ ...s, [name]: formattedValue }))
  }

  const fakeProcessPayment = () => new Promise((res) => setTimeout(res, 1400))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    // Validar campos do cartão
    const cardErrors = validateCard()
    if (cardErrors.length > 0) {
      // já usa validation modal; opcional popup informativo
      showPopup('Falha na validação','Corrija os campos do cartão.', 'warning')
      setValidationErrors(cardErrors)
      setShowValidationModal(true)
      return
    }

    setLoading(true)
    try {
      await fakeProcessPayment()
      const res = await api.post(`/api/challenges/${id}/pay`)
      if (res?.data?.walletBalance !== undefined) {
        setWalletBalance(res.data.walletBalance)
      }
      await refreshWallet() // Atualiza saldo globalmente
      navigate('/')
    } catch (err) {
      showPopup('Erro no pagamento', err?.response?.data?.message || 'Falha ao processar pagamento.', 'error')
    } finally {
      setLoading(false)
    }
  }


  if (!guardChecked || loadingWallet) {
    return <div className="p-6 text-center text-main-white">Validando desafio...</div>
  }

  return (
    <>
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado esquerdo: Preview do cartão */}
        <div className="relative rounded-2xl p-6 bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-300">Pagamento Seguro</div>
            <div className="text-xs px-2 py-1 rounded bg-white/10 text-white/80">Teste</div>
          </div>

          <div className="mt-6">
            <div className="w-full h-44 rounded-xl p-4 bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col justify-between text-white shadow-md">
              <div className="flex justify-between">
                <div className="text-sm opacity-80">Eu-Duvido</div>
                <div className="text-sm opacity-60">VISA</div>
              </div>

              <div className="text-xl tracking-wider font-mono">
                {card.number || '•••• •••• •••• ••••'}
              </div>

              <div className="flex justify-between text-sm opacity-80">
                <div>{card.name || 'NOME DO TITULAR'}</div>
                <div>{card.expiry || 'MM/AA'}</div>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-300">
              Use o cartão de teste: <span className="font-mono">4242 4242 4242 4242</span>
              <div className="mt-2 text-xs text-gray-400">
                Use dados fictícios de teste. Nada é cobrado de verdade.
              </div>
            </div>
          </div>
        </div>

        {/* Lado direito: Formulário */}
        <form onSubmit={submit} className="rounded-2xl p-6 bg-slate-900/60 border border-white/10 shadow-xl backdrop-blur">
          <h2 className="text-2xl font-semibold text-white">Pagar Desafio</h2>
          <p className="text-sm text-gray-400 mb-2">
            Valor do desafio: <span className="font-semibold text-neon-green">R$ {Number(challengeAmount).toFixed(2)}</span>
          </p>
          {walletBalance !== null && (
            <p className="text-xs text-gray-400 mb-4">Saldo atual: <span className="text-neon-green font-semibold">R$ {Number(walletBalance).toFixed(2)}</span></p>
          )}

          {error && (
            <div className="mb-3 text-sm text-red-300 bg-red-900/30 p-2 rounded">
              {error}
            </div>
          )}

          {/* Link para adicionar saldo se necessário */}
          {walletBalance !== null && walletBalance < challengeAmount && (
            <div className="mb-4 p-3 rounded-lg bg-yellow-600/10 border border-yellow-600/30">
              <p className="text-sm text-yellow-200 mb-2">
                Saldo insuficiente. Você precisa de mais R$ {(challengeAmount - walletBalance).toFixed(2)}.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/carteira?challengeId=${id}&amount=${challengeAmount}`)}
                className="text-sm text-neon-green hover:underline"
              >
                Adicionar saldo na carteira →
              </button>
            </div>
          )}

          <label className="block text-sm text-gray-300">Número do cartão</label>
          <input
            name="number"
            value={card.number}
            onChange={handleChange}
            className="mt-1 w-full p-3 rounded-lg bg-black border border-white/10 text-white placeholder:text-gray-500"
            placeholder="4242 4242 4242 4242"
          />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm text-gray-300">Validade</label>
              <input
                name="expiry"
                value={card.expiry}
                onChange={handleChange}
                placeholder="MM/AA"
                className="mt-1 w-full p-3 rounded-lg bg-black border border-white/10 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300">CVC</label>
              <input
                name="cvc"
                value={card.cvc}
                onChange={handleChange}
                placeholder="Ex: 123"
                className="mt-1 w-full p-3 rounded-lg bg-black border border-white/10 text-white"
              />
            </div>
          </div>

          <label className="block text-sm text-gray-300 mt-3">Nome no cartão</label>
          <input
            name="name"
            value={card.name}
            onChange={handleChange}
            placeholder="Ex: JOAO SILVA"
            className="mt-1 w-full p-3 rounded-lg bg-black border border-white/10 text-white"
          />

          <button
            disabled={loading}
            className="mt-6 w-full py-3 rounded-lg bg-neon-green text-black font-semibold shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-60"
          >
            {loading ? 'Processando…' : `Pagar R$ ${Number(challengeAmount).toFixed(2)}`}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-3 w-full py-2 rounded-lg border border-white/20 text-sm text-gray-300 hover:bg-white/5 transition"
          >
            Voltar
          </button>
        </form>
      </div>

       {/* Modal de Validação */}
       {showValidationModal && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fade-in">
           <div className="bg-dark-surface border border-red-500/30 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
             <div className="flex items-start gap-3">
               <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                 <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                 </svg>
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-semibold text-white mb-2">Erro de Validação</h3>
                 <p className="text-sm text-text-secondary mb-3">Por favor, corrija os seguintes erros:</p>
                 <ul className="space-y-2">
                   {validationErrors.map((error, index) => (
                     <li key={index} className="flex items-start gap-2 text-sm text-red-300">
                       <span className="text-red-500 mt-0.5">•</span>
                       <span>{error}</span>
                     </li>
                   ))}
                 </ul>
               </div>
             </div>
           
             <button
               onClick={() => {
                 setShowValidationModal(false)
                 setValidationErrors([])
               }}
               className="w-full bg-neon-green text-black font-semibold py-3 px-4 rounded-lg transition-transform hover:scale-105"
             >
               Entendi
             </button>
           </div>
         </div>
       )}
       <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={()=>setPopup(p=>({...p,open:false}))}/>
      </div>
    </>
  )
}
