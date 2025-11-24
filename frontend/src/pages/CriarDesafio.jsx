import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useToast } from '../contexts/ToastContext'
import ValidationModal from '../components/ValidationModal'
import InviteFriends from '../components/InviteFriends'
import PopupMessage from '../components/PopupMessage'

const CriarDesafio = () => {
  const [step, setStep] = useState('select')
  const [challengeType, setChallengeType] = useState('')
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    duration: '',
    allowGuests: true,
    icon: '', // base64 data URL
    minWorkoutMinutes: '', // tempo mínimo de treino (academia)
    customProofTypes: [], // tipos de parâmetros para desafio customizável: ['km', 'time', 'count', 'photo']
    // NOVO: mínimos para parâmetros customizados
    minKm: '',
    minTimeMinutes: '',
    minCount: '',
    // NOVO: campo exclusivo para Dieta
    mealsPerDay: '',

    invitePermission: 'CREATOR_ONLY', // 'CREATOR_ONLY' ou 'ALL_PARTICIPANTS'
    participantLimit: 'unlimited', // 'unlimited' ou 'limited'
    maxParticipants: '', // número máximo se limitado
    proofsPerDay: '', // NOVO: limite de provas por dia (não usado em dieta)
    minMealIntervalMinutes: '', // NOVO: intervalo mínimo entre refeições (minutos)
    // NOVO: participação do criador
    creatorParticipates: true,
  })
  const [iconPreview, setIconPreview] = useState('')
  const [selectedFriends, setSelectedFriends] = useState([]) // Array de IDs de amigos selecionados (staged)
  const [validationErrors, setValidationErrors] = useState([])
  const [showValidationModal, setShowValidationModal] = useState(false)
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const [popup,setPopup]=useState({open:false,title:'',messages:[],type:'info'})

  // NOVO: estados H:M:S para entradas formatadas
  const [workoutH, setWorkoutH] = useState(0)
  const [workoutM, setWorkoutM] = useState(0)
  const [workoutS, setWorkoutS] = useState(0)
  const [customH, setCustomH] = useState(0)
  const [customM, setCustomM] = useState(0)
  const [customS, setCustomS] = useState(0)
  const [mealH, setMealH] = useState(0)
  const [mealM, setMealM] = useState(0)
  const [mealS, setMealS] = useState(0)

  // NOVO: util de clamp
  const clamp = (v, min, max) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : 0))

  // NOVO: handlers academia (minWorkoutMinutes em minutos inteiros)
  const handleWorkoutTimeChange = (part, value) => {
    let h = workoutH, m = workoutM, s = workoutS
    if (part === 'h') h = clamp(parseInt(value || 0, 10), 0, 8)
    if (part === 'm') m = clamp(parseInt(value || 0, 10), 0, 59)
    if (part === 's') s = clamp(parseInt(value || 0, 10), 0, 59)
    setWorkoutH(h); setWorkoutM(m); setWorkoutS(s)
    const totalMinutes = h * 60 + m + Math.floor(s / 60)
    setFormData(prev => ({ ...prev, minWorkoutMinutes: String(totalMinutes) }))
  }

  // NOVO: handlers custom (minTimeMinutes em minutos inteiros)
  const handleCustomMinTimeChange = (part, value) => {
    let h = customH, m = customM, s = customS
    if (part === 'h') h = clamp(parseInt(value || 0, 10), 0, 23)
    if (part === 'm') m = clamp(parseInt(value || 0, 10), 0, 59)
    if (part === 's') s = clamp(parseInt(value || 0, 10), 0, 59)
    setCustomH(h); setCustomM(m); setCustomS(s)
    const totalMinutes = h * 60 + m + Math.floor(s / 60)
    setFormData(prev => ({ ...prev, minTimeMinutes: String(totalMinutes) }))
  }

  // NOVO: handlers dieta (minMealIntervalMinutes em minutos inteiros)
  const handleMealIntervalChange = (part, value) => {
    let h = mealH, m = mealM, s = mealS
    if (part === 'h') h = clamp(parseInt(value || 0, 10), 0, 12)
    if (part === 'm') m = clamp(parseInt(value || 0, 10), 0, 59)
    if (part === 's') s = clamp(parseInt(value || 0, 10), 0, 59)
    setMealH(h); setMealM(m); setMealS(s)
    const totalMinutes = h * 60 + m + Math.floor(s / 60)
    setFormData(prev => ({ ...prev, minMealIntervalMinutes: String(totalMinutes) }))
  }

  // NOVO: inicializar H:M:S quando os minutos mudarem no formData
  useEffect(() => {
    const total = parseInt(formData.minWorkoutMinutes || 0, 10)
    const h = Math.floor(total / 60)
    const m = total % 60
    setWorkoutH(clamp(h, 0, 8))
    setWorkoutM(clamp(m, 0, 59))
    setWorkoutS(0)
  }, [formData.minWorkoutMinutes])

  useEffect(() => {
    const total = parseInt(formData.minTimeMinutes || 0, 10)
    const h = Math.floor(total / 60)
    const m = total % 60
    setCustomH(clamp(h, 0, 23))
    setCustomM(clamp(m, 0, 59))
    setCustomS(0)
  }, [formData.minTimeMinutes])

  useEffect(() => {
    const total = parseInt(formData.minMealIntervalMinutes || 0, 10)
    const h = Math.floor(total / 60)
    const m = total % 60
    setMealH(clamp(h, 0, 12))
    setMealM(clamp(m, 0, 59))
    setMealS(0)
  }, [formData.minMealIntervalMinutes])

  // Helper para garantir classe do ícone e fallback
  const getIconForType = (type) => {
    switch (type) {
      case 'academia': return 'ph-barbell'
      case 'corrida': return 'ph-person-simple-run'
      case 'dieta': return 'ph-apple-logo'
      case 'estudo': return 'ph-book-open'
      case 'custom': return 'ph-gear'
      default: return ''
    }
  }

  const challengeTypes = [
    {
      type: 'academia',
      title: 'Academia',
      icon: 'ph-barbell',
      image: '/images/modes/academia.png', // NOVO
      color: 'from-emerald-500/20 to-emerald-400/10 border-emerald-400/40',
      badgeClass: 'bg-emerald-500/20 text-emerald-300',
      description: 'Check-ins com tempo mínimo de treino para reforçar consistência.',
      examples: ['Treinar 45min por dia', 'Academia 5x por semana'],
      ideal: 'Quem busca rotina e constância de treinos.'
    },
    {
      type: 'corrida',
      title: 'Corrida',
      icon: 'ph-person-simple-run',
      image: '/images/modes/corrida.png', // NOVO
      color: 'from-cyan-500/20 to-cyan-400/10 border-cyan-400/40',
      badgeClass: 'bg-cyan-500/20 text-cyan-300',
      description: 'Metas de distância e/ou tempo com registro de provas (foto e parâmetros).',
      examples: ['Correr 5km 3x por semana', 'Correr 30min por dia'],
      ideal: 'Quem quer evoluir pace, distância ou frequência.'
    },
    {
      type: 'dieta',
      title: 'Dieta',
      icon: 'ph-apple-logo',
      image: '/images/modes/dieta.png', // NOVO
      color: 'from-amber-500/20 to-amber-400/10 border-amber-400/40',
      badgeClass: 'bg-amber-500/20 text-amber-300',
      description: 'Provas baseadas em fotos de refeições e intervalo mínimo entre elas.',
      examples: ['3 refeições/dia por 14 dias', 'Sem açúcar por 30 dias'],
      ideal: 'Quem quer disciplina alimentar com registro visual.'
    },
    {
      type: 'estudo',
      title: 'Estudo',
      icon: 'ph-book-open',
      image: '/images/modes/estudo.png', // NOVO
      color: 'from-indigo-500/20 to-indigo-400/10 border-indigo-400/40',
      badgeClass: 'bg-indigo-500/20 text-indigo-300',
      description: 'Check-ins de estudo com tempo/quantidade conforme regra definida.',
      examples: ['Estudar 60min/dia', 'Revisar 2 capítulos por dia'],
      ideal: 'Quem precisa ritmo de estudos comprovado.'
    },
    {
      type: 'custom',
      title: 'Customizável',
      icon: 'ph-gear',
      image: '/images/modes/custom.png', // NOVO
      color: 'from-fuchsia-500/20 to-fuchsia-400/10 border-fuchsia-400/40',
      badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300',
      description: 'Monte suas próprias regras: distância, tempo, quantidade e foto.',
      examples: ['Meditar 10min/dia', 'Beber 2L de água', 'Sem celular após 22h'],
      ideal: 'Quem quer liberdade total de configuração.'
    }
  ]

  const handleTypeSelect = (type) => {
    setChallengeType(type)
    setStep('form')
  }

  const showPopup=(t,m,type='info')=>setPopup({open:true,title:t,messages:Array.isArray(m)?m:[m],type})

  const validateForm = () => {
    const errors = []
    
    // Validação de tipo de desafio
    if (!challengeType || challengeType.trim() === '') {
      errors.push('Selecione um tipo de desafio')
    }
    
    // Validação de descrição
    if (!formData.description || formData.description.trim() === '') {
      errors.push('Nome/Descrição do desafio é obrigatório')
    } else if (formData.description.trim().length < 3) {
      errors.push('Nome do desafio deve ter no mínimo 3 caracteres')
    } else if (formData.description.trim().length > 200) {
      errors.push('Nome do desafio deve ter no máximo 200 caracteres')
    }
    
    // Validação de valor
    if (!formData.amount || formData.amount.trim() === '') {
      errors.push('Valor da aposta é obrigatório')
    } else {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount)) {
        errors.push('Valor da aposta deve ser um número válido')
      } else if (amount <= 0) {
        errors.push('Valor da aposta deve ser maior que zero')
      } else if (amount < 0.01) {
        errors.push('Valor mínimo da aposta é R$ 0,01')
      } else if (amount > 10000) {
        errors.push('Valor máximo da aposta é R$ 10.000,00')
      }
    }
    
    // Validação de duração (opcional, mas se preenchida deve ser válida)
    if (formData.duration && formData.duration.trim() !== '') {
      const duration = parseInt(formData.duration)
      if (isNaN(duration)) {
        errors.push('Duração deve ser um número válido')
      } else if (duration < 1) {
        errors.push('Duração deve ser pelo menos 1 dia')
      } else if (duration > 365) {
        errors.push('Duração máxima é 365 dias')
      }
    }
    
    // Validação específica para academia (tempo mínimo de treino)
    if (challengeType === 'academia') {
      if (!formData.minWorkoutMinutes || formData.minWorkoutMinutes.trim() === '') {
        errors.push('Tempo mínimo de treino é obrigatório para desafios de academia')
      } else {
        const minutes = parseInt(formData.minWorkoutMinutes)
        if (isNaN(minutes)) {
          errors.push('Tempo mínimo de treino deve ser um número válido')
        } else if (minutes < 1) {
          errors.push('Tempo mínimo de treino deve ser pelo menos 1 minuto')
        } else if (minutes > 480) {
          errors.push('Tempo máximo de treino é 480 minutos (8 horas)')
        }
      }
    }
    
    // Validação específica para customizável (deve ter pelo menos um parâmetro)
    if (challengeType === 'custom') {
      if (!formData.customProofTypes || formData.customProofTypes.length === 0) {
        errors.push('Selecione pelo menos um parâmetro de prova para desafios customizáveis')
      } else {
        if (formData.customProofTypes.includes('km')) {
          const v = parseFloat(formData.minKm)
          if (isNaN(v) || v <= 0) errors.push('Informe o mínimo de Distância (KM) > 0')
        }
        if (formData.customProofTypes.includes('time')) {
          const v = parseInt(formData.minTimeMinutes, 10)
          if (isNaN(v) || v <= 0) errors.push('Informe o mínimo de Tempo (minutos) > 0')
        }
        if (formData.customProofTypes.includes('count')) {
          const v = parseInt(formData.minCount, 10)
          if (isNaN(v) || v <= 0) errors.push('Informe o mínimo de Quantidade > 0')
        }
      }
    }
    
    // Validação de ícone (opcional, mas se fornecido deve ser válido)
    if (formData.icon && formData.icon.trim() !== '') {
      if (!formData.icon.startsWith('data:image/')) {
        errors.push('Ícone deve ser uma imagem válida')
      }
      const base64Length = formData.icon.length - (formData.icon.indexOf(',') + 1)
      const estimatedSize = (base64Length * 3) / 4
      if (estimatedSize > 700 * 1024) { // ALTERADO 700KB
        errors.push('Ícone deve ter no máximo 700KB')
      }
    }
    
    // Ajuste: validação de provas por dia ou refeições por dia conforme tipo
    if (challengeType === 'dieta') {
      if (!formData.mealsPerDay || String(formData.mealsPerDay).trim() === '') {
        errors.push('Informe a quantidade de refeições por dia')
      } else {
        const m = parseInt(formData.mealsPerDay, 10)
        if (isNaN(m) || m < 1) {
          errors.push('Refeições por dia deve ser um número inteiro maior ou igual a 1')
        } else if (m > 20) {
          errors.push('Refeições por dia deve ser no máximo 20')
        }
      }
      // NOVO: validação do intervalo mínimo entre refeições
      if (String(formData.minMealIntervalMinutes || '').trim() === '') {
        errors.push('Informe o intervalo mínimo entre refeições (minutos)')
      } else {
        const im = parseInt(formData.minMealIntervalMinutes, 10)
        if (isNaN(im) || im < 1) {
          errors.push('Intervalo mínimo entre refeições deve ser um número inteiro maior ou igual a 1')
        } else if (im > 720) {
          errors.push('Intervalo mínimo entre refeições deve ser no máximo 720 minutos (12h)')
        }
      }
    } else {
      if (!formData.proofsPerDay || String(formData.proofsPerDay).trim() === '') {
        errors.push('Informe o limite de provas por dia')
      } else {
        const p = parseInt(formData.proofsPerDay, 10)
        if (isNaN(p) || p < 1) {
          errors.push('Provas por dia deve ser um número inteiro maior ou igual a 1')
        } else if (p > 50) {
          errors.push('Provas por dia deve ser no máximo 50')
        }
      }
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validação completa
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      setShowValidationModal(true)
      return
    }
    
    setLoading(true)

    try {
      // Preparar desafio (não cria ainda, apenas valida)
      const challengeData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        icon: formData.icon || null,
        type: challengeType,
        minWorkoutMinutes: challengeType === 'academia' && formData.minWorkoutMinutes 
          ? parseInt(formData.minWorkoutMinutes) 
          : null,
        customProofTypes: challengeType === 'custom' ? formData.customProofTypes : null,
        // NOVO: enviar mínimos (backend pode ignorar se ainda não suportar)
        customMinKm: formData.customProofTypes.includes('km') ? parseFloat(formData.minKm) : null,
        customMinTimeMinutes: formData.customProofTypes.includes('time') ? parseInt(formData.minTimeMinutes, 10) : null,
        customMinCount: formData.customProofTypes.includes('count') ? parseInt(formData.minCount, 10) : null,
        duration: formData.duration ? parseInt(formData.duration) : null,
        allowGuests: formData.allowGuests,
        invitePermission: formData.invitePermission || 'CREATOR_ONLY',
        maxParticipants: formData.participantLimit === 'limited' && formData.maxParticipants 
          ? parseInt(formData.maxParticipants) 
          : null,
        // NOVO: enviar somente um dos campos conforme o tipo
        proofsPerDay: challengeType !== 'dieta' ? parseInt(formData.proofsPerDay, 10) : null,
        mealsPerDay: challengeType === 'dieta' ? parseInt(formData.mealsPerDay, 10) : null,
        mealCountPerDay: challengeType === 'dieta' ? parseInt(formData.mealsPerDay, 10) : null,
        minMealIntervalMinutes: challengeType === 'dieta' ? parseInt(formData.minMealIntervalMinutes, 10) : null, // NOVO
        // NOVO: enviar flag de participação do criador
        creatorParticipates: !!formData.creatorParticipates,
      }
      
      // Criar desafio sem pagamento (status AWAITING_PAYMENT)
      const response = await api.post('/api/challenges/create-without-payment', {
        ...challengeData,
        selectedFriendIds: selectedFriends, // Array de IDs selecionados
      })
      
      const createdChallenge = response.data
      const challengeId = createdChallenge.id
      
      // Enviar convites para os amigos selecionados (staged)
      let successCount = 0
      if (selectedFriends && selectedFriends.length > 0 && challengeId) {
        for (const friendId of selectedFriends) {
          try {
            await api.post(`/api/challenges/${challengeId}/invite`, { friendId })
            successCount++
          } catch (inviteErr) {
            console.error(`Erro ao convidar amigo ${friendId}:`, inviteErr)
          }
        }
      }
      
      // Mostrar mensagem e redirecionar para Carteira com contexto para pagamento
      showToast('Desafio criado! Vamos adicionar saldo para pagar.', 'success')
      navigate(`/carteira?challengeId=${challengeId}&amount=${challengeData.amount}`)
    } catch (error) {
      console.error('Erro ao preparar desafio:', error)
      const errorMessage = error.response?.data?.error || 'Erro ao preparar desafio. Tente novamente.'
      setValidationErrors([errorMessage])
      setShowValidationModal(true)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'select') {
    return (
      <div>
        {/* NOVO: Cabeçalho com explicação curta */}
        <h2 className="text-3xl font-semibold mb-2 text-neon-green">Novo Desafio</h2>
        <p className="text-gray-300 mb-6">
          Escolha um modo e veja as regras recomendadas. Você pode personalizar os detalhes na próxima etapa.
        </p>

        {/* NOVO: legenda de regras financeiras */}
        <div className="mb-6 bg-black/60 border border-white/10 rounded-lg p-3 text-sm">
          <ul className="list-disc pl-5 space-y-1 text-gray-400">
            <li>Taxa de participação de 15% é aplicada no pagamento; 85% segue como valor líquido.</li>
            <li>O desafio só começa quando todos os participantes tiverem pago e o criador clicar em Iniciar.</li>
            <li>Você pode definir se aceita novas entradas após o início.</li>
          </ul>
        </div>

        {/* NOVO: Grid de cards bonitos e explicativos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {challengeTypes.map(({ type, title, icon, color, badgeClass, description, examples, ideal, image }) => (
            <div
              key={type}
              className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${color} transition-all hover:-translate-y-0.5 hover:shadow-xl`}
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center relative">
                    <i className={`ph-fill ${icon} text-3xl text-neon-green`} />
                    {!icon && (
                      <span className="text-xs text-gray-400">{title?.[0] || '?'}</span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    {title}
                  </h3>
                </div>
                {image && (
                  <div className="rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={image}
                      alt={`Ilustração ${title}`}
                      className="w-full h-28 object-cover opacity-90"
                      loading="lazy"
                      onError={(e)=>{e.currentTarget.style.display='none'}}
                    />
                  </div>
                )}
                {/* REMOVIDO badge "Modo pronto" */}
                <p className="text-sm text-gray-300">{description}</p>

                <div className="text-xs text-gray-400">
                  <p className="font-semibold mb-1 text-gray-300">Exemplos:</p>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {examples.map((ex, idx) => (
                      <li key={idx}>{ex}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-gray-400">
                  <p className="font-semibold mb-1 text-gray-300">Ideal para:</p>
                  <p>{ideal}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleTypeSelect(type)}
                  className="w-full mt-2 bg-neon-green text-black font-bold py-2.5 rounded-lg transition-transform hover:scale-[1.02]"
                >
                  Escolher {title}
                </button>
              </div>
              {/* Accent glow */}
              <div className="pointer-events-none absolute -bottom-8 -right-8 w-40 h-40 rounded-full bg-white/5 blur-2xl" />
            </div>
          ))}
        </div>

        {/* Dica adicional */}
        <p className="text-xs text-gray-500 mt-4">
          Dica: Se não achar um modo perfeito, escolha "Customizável" para configurar regras sob medida.
        </p>
      </div>
    )
  }

  return (
    <>
      <div>
        <h2 className="text-3xl font-semibold mb-6 flex items-center gap-4">
          <span className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-neon-green/40 flex items-center justify-center">
              <i className={`ph-fill ${getIconForType(challengeType)} text-3xl text-neon-green`} />
            </div>
            <span>
              Criar Desafio: <span className="text-neon-green">
                {challengeTypes.find((t) => t.type === challengeType)?.title}
              </span>
            </span>
          </span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8 bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-3xl mx-auto">
          <fieldset>
            <legend className="text-xl font-semibold mb-4 border-b border-neon-green/20 pb-2">
              1. Regras Gerais
            </legend>
            <div className="space-y-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Nome do Desafio
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                  placeholder="Ex: Dieta 30 dias sem açúcar / Academia 5x por semana"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Ícone do Desafio
                  </label>
                  <div className="mt-1 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center relative">
                        {iconPreview ? (
                          <img src={iconPreview} alt="Prévia do ícone" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <i className={`ph-fill ${getIconForType(challengeType)} text-2xl text-neon-green`} />
                            {!getIconForType(challengeType) && (
                              <span className="text-[10px] text-gray-400 absolute">Sem ícone</span>
                            )}
                          </>
                        )}
                      </div>
                    <label className="cursor-pointer bg-neon-green text-black font-semibold py-2 px-3 rounded-lg hover:scale-105 transition-transform">
                      Escolher imagem
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          // Valida tamanho (<= 200KB) e tipo (png/jpeg)
                          const validTypes = ['image/png', 'image/jpeg']
                          if (!validTypes.includes(file.type)) {
                            showPopup('Imagem inválida','Use PNG ou JPEG.','error')
                            return
                          }
                          const maxBytes = 700 * 1024 // ALTERADO 700KB
                          if (file.size > maxBytes) {
                            showPopup('Imagem grande','Limite 700KB.','warning')
                            return
                          }
                          // Converter para base64 data URL
                          const toBase64 = (f) => new Promise((resolve, reject) => {
                            const reader = new FileReader()
                            reader.onload = () => resolve(reader.result)
                            reader.onerror = reject
                            reader.readAsDataURL(f)
                          })
                          try {
                            const dataUrl = await toBase64(file)
                            setFormData((prev) => ({ ...prev, icon: dataUrl }))
                            setIconPreview(String(dataUrl))
                          } catch (err) {
                            console.error('Erro ao ler imagem', err)
                            showPopup('Falha ao carregar','Tente outro arquivo.','error')
                          }
                        }}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">PNG ou JPEG até 700KB.</p>
                </div>
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-300">
                    Valor da Aposta (R$)
                  </label>
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                    placeholder="Ex: 50.00"
                  />
                </div>
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-300">
                    Duração Total (dias)
                  </label>
                  <input
                    type="number"
                    id="duration"
                    min="1"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                    placeholder="Ex: 14"
                  />
                </div>
                {challengeType === 'dieta' ? (
                  <div>
                    <label htmlFor="mealsPerDay" className="block text-sm font-medium text-gray-300">
                      Refeições por dia (mínimo de fotos)
                    </label>
                    <input
                      type="number"
                      id="mealsPerDay"
                      min="1"
                      max="20"
                      value={formData.mealsPerDay}
                      onChange={(e) => setFormData({ ...formData, mealsPerDay: e.target.value })}
                      required
                      className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                      placeholder="Ex: 3"
                    />
                  </div>
                ) : (
                  <div>
                    <label htmlFor="proofsPerDay" className="block text-sm font-medium text-gray-300">
                      Provas permitidas por dia
                    </label>
                    <input
                      type="number"
                      id="proofsPerDay"
                      min="1"
                      max="50"
                      value={formData.proofsPerDay}
                      onChange={(e) => setFormData({ ...formData, proofsPerDay: e.target.value })}
                      required
                      className="mt-1 block w-full bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                      placeholder="Ex: 2"
                    />
                  </div>
                )}
              </div>

              {/* Campo específico para Academia */}
              {challengeType === 'academia' && (
                <div>
                  <label htmlFor="minWorkoutMinutes" className="block text-sm font-medium text-gray-300">
                    Tempo Mínimo de Treino
                  </label>
                  {/* NOVO: Input H:M:S estilizado melhorado */}
                  <div className="mt-1 flex items-center gap-2 bg-gradient-to-r from-black via-gray-900 to-black border border-white/20 rounded-lg p-3 shadow-inner">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="8"
                        value={workoutH}
                        onChange={(e) => handleWorkoutTimeChange('h', e.target.value)}
                        className="w-20 md:w-24 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-semibold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                        placeholder="HH"
                      />
                      <span className="text-neon-green font-bold text-lg">:</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="59"
                        value={workoutM}
                        onChange={(e) => handleWorkoutTimeChange('m', e.target.value)}
                        className="w-16 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                        placeholder="MM"
                      />
                      <span className="text-neon-green font-bold text-lg">:</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="59"
                        value={workoutS}
                        onChange={(e) => handleWorkoutTimeChange('s', e.target.value)}
                        className="w-16 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                        placeholder="SS"
                      />
                    </div>
                    <span className="ml-auto text-xs text-gray-400 font-mono tracking-wide">
                      Total: {Number(formData.minWorkoutMinutes || 0)} min
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Máx. 8h (480 min)</p>
                </div>
              )}

              {/* Campos específicos para Customizável */}
              {challengeType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Parâmetros de Prova (selecione quais serão usados)
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { id: 'km', label: 'Distância (KM)', icon: 'ph-person-simple-run' },
                      { id: 'time', label: 'Tempo (minutos)', icon: 'ph-clock' },
                      { id: 'count', label: 'Quantidade', icon: 'ph-hash' },
                      { id: 'photo', label: 'Foto', icon: 'ph-image' },
                    ].map((param) => (
                      <button
                        key={param.id}
                        type="button"
                        onClick={() => {
                          const current = formData.customProofTypes || []
                          const updated = current.includes(param.id)
                            ? current.filter(p => p !== param.id)
                            : [...current, param.id]
                          setFormData({ ...formData, customProofTypes: updated })
                        }}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          (formData.customProofTypes || []).includes(param.id)
                            ? 'border-neon-green bg-neon-green/10 text-neon-green'
                            : 'border-white/30 bg-black text-gray-400 hover:border-neon-green/50'
                        }`}
                      >
                        <i className={`ph-fill ${param.icon} text-2xl mb-1 block`}></i>
                        <span className="text-sm font-semibold">{param.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* NOVO: Campos de requisitos mínimos dinâmicos */}
                  <div className="mt-4 space-y-4">
                    {formData.customProofTypes.includes('km') && (
                      <div>
                        <label className="block text-xs font-semibold text-neon-green mb-1">
                          Mínimo de Distância (KM)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formData.minKm}
                          onChange={(e) => setFormData({ ...formData, minKm: e.target.value })}
                          className="w-full bg-black border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                          placeholder="Ex: 5.0"
                          required
                        />
                      </div>
                    )}
                    {formData.customProofTypes.includes('time') && (
                      <div>
                        <label className="block text-xs font-semibold text-neon-green mb-1">
                          Mínimo de Tempo
                        </label>
                        {/* NOVO: Input H:M:S estilizado melhorado */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-black via-gray-900 to-black border border-white/20 rounded-lg p-3 shadow-inner">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max="23"
                              value={customH}
                              onChange={(e) => handleCustomMinTimeChange('h', e.target.value)}
                              className="w-20 md:w-24 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-semibold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                              placeholder="HH"
                              required
                            />
                            <span className="text-neon-green font-bold text-lg">:</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max="59"
                              value={customM}
                              onChange={(e) => handleCustomMinTimeChange('m', e.target.value)}
                              className="w-16 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                              placeholder="MM"
                              required
                            />
                            <span className="text-neon-green font-bold text-lg">:</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              max="59"
                              value={customS}
                              onChange={(e) => handleCustomMinTimeChange('s', e.target.value)}
                              className="w-16 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                              placeholder="SS"
                              required
                            />
                          </div>
                          <span className="ml-auto text-xs text-gray-400 font-mono tracking-wide">
                            Total: {Number(formData.minTimeMinutes || 0)} min
                          </span>
                        </div>
                      </div>
                    )}
                    {formData.customProofTypes.includes('count') && (
                      <div>
                        <label className="block text-xs font-semibold text-neon-green mb-1">
                          Mínimo de Quantidade
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.minCount}
                          onChange={(e) => setFormData({ ...formData, minCount: e.target.value })}
                          className="w-full bg-black border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                          placeholder="Ex: 10"
                          required
                        />
                      </div>
                    )}
                    {formData.customProofTypes.includes('photo') && (
                      <p className="text-xs text-gray-400">
                        Foto não requer valor mínimo; apenas será obrigatória no check-in.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Campo específico para Dieta: intervalo mínimo entre refeições */}
              {challengeType === 'dieta' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="minMealIntervalMinutes" className="block text-sm font-medium text-gray-300">
                      Intervalo mínimo entre refeições
                    </label>
                    {/* NOVO: Input H:M:S estilizado melhorado */}
                    <div className="mt-1 flex items-center gap-2 bg-gradient-to-r from-black via-gray-900 to-black border border-white/20 rounded-lg p-3 shadow-inner">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="12"
                          value={mealH}
                          onChange={(e) => handleMealIntervalChange('h', e.target.value)}
                          className="w-20 md:w-24 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-semibold placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                          placeholder="HH"
                          required
                        />
                        <span className="text-neon-green font-bold text-lg">:</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="59"
                          value={mealM}
                          onChange={(e) => handleMealIntervalChange('m', e.target.value)}
                          className="w-16 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                          placeholder="MM"
                          required
                        />
                        <span className="text-neon-green font-bold text-lg">:</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          max="59"
                          value={mealS}
                          onChange={(e) => handleMealIntervalChange('s', e.target.value)}
                          className="w-16 bg-black/60 border border-white/20 rounded-md p-2 text-center text-main-white font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-neon-green/60 focus:border-neon-green transition"
                          placeholder="SS"
                          required
                        />
                      </div>
                      <span className="ml-auto text-xs text-gray-400 font-mono tracking-wide">
                        Total: {Number(formData.minMealIntervalMinutes || 0)} min
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Máx. 12h (720 min)</p>
                  </div>
                </div>
              )}

              {/* Configurações de Convite */}
              <div className="space-y-4 pt-4 border-t border-neon-green/20">
                <h3 className="text-lg font-semibold text-neon-green">Configurações de Convite</h3>
                
                {/* Permissão de Convite */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quem pode convidar?
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="permission_creator"
                        name="invitePermission"
                        type="radio"
                        checked={formData.invitePermission === 'CREATOR_ONLY'}
                        onChange={() => setFormData({ ...formData, invitePermission: 'CREATOR_ONLY' })}
                        className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                      />
                      <label htmlFor="permission_creator" className="ml-2 block text-sm text-main-white">
                        Apenas eu (Criador) posso convidar
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="permission_all"
                        name="invitePermission"
                        type="radio"
                        checked={formData.invitePermission === 'ALL_PARTICIPANTS'}
                        onChange={() => setFormData({ ...formData, invitePermission: 'ALL_PARTICIPANTS' })}
                        className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                      />
                      <label htmlFor="permission_all" className="ml-2 block text-sm text-main-white">
                        Todos os participantes podem convidar
                      </label>
                    </div>
                  </div>
                </div>

                {/* Limite de Participantes */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Limite de Participantes
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="limit_unlimited"
                        name="participantLimit"
                        type="radio"
                        checked={formData.participantLimit === 'unlimited'}
                        onChange={() => setFormData({ ...formData, participantLimit: 'unlimited', maxParticipants: '' })}
                        className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                      />
                      <label htmlFor="limit_unlimited" className="ml-2 block text-sm text-main-white">
                        Ilimitado
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="limit_limited"
                        name="participantLimit"
                        type="radio"
                        checked={formData.participantLimit === 'limited'}
                        onChange={() => setFormData({ ...formData, participantLimit: 'limited' })}
                        className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                      />
                      <label htmlFor="limit_limited" className="text-sm text-main-white">
                        Limitado:
                      </label>
                      <input
                        type="number"
                        min="2"
                        value={formData.maxParticipants}
                        onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                        disabled={formData.participantLimit !== 'limited'}
                        className="w-24 bg-black border-white/30 rounded-md shadow-sm p-2 text-main-white focus:border-neon-green focus:ring-neon-green disabled:opacity-50"
                        placeholder="Ex: 10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Componente Padronizado de Convidar Amigos (Modo Staged) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Convidar Amigos (opcional)
                </label>
                <InviteFriends
                  mode="staged"
                  selectedFriends={selectedFriends}
                  onSelectionChange={setSelectedFriends}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Os amigos selecionados receberão convites após o pagamento ser confirmado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Permitir entrada durante o desafio?
                </label>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center">
                    <input
                      id="convidados_sim"
                      name="convidados"
                      type="radio"
                      checked={formData.allowGuests}
                      onChange={() => setFormData({ ...formData, allowGuests: true })}
                      className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                    />
                    <label htmlFor="convidados_sim" className="ml-2 block text-sm text-main-white">
                      Sim, aceitar novos participantes após o início
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="convidados_nao"
                      name="convidados"
                      type="radio"
                      checked={!formData.allowGuests}
                      onChange={() => setFormData({ ...formData, allowGuests: false })}
                      className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                    />
                    <label htmlFor="convidados_nao" className="ml-2 block text-sm text-main-white">
                      Não, bloquear novas entradas após o início
                    </label>
                  </div>
                </div>
              </div>

              {/* NOVO: Opção de participação do criador */}
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Você quer participar deste desafio?
                </label>
                <div className="flex items-center space-x-6 mt-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="creatorParticipates"
                      checked={!!formData.creatorParticipates}
                      onChange={() => setFormData({ ...formData, creatorParticipates: true })}
                      className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                    />
                    <span>Sim</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="creatorParticipates"
                      checked={!formData.creatorParticipates}
                      onChange={() => setFormData({ ...formData, creatorParticipates: false })}
                      className="h-4 w-4 text-neon-green bg-black border-white/30 focus:ring-neon-green"
                    />
                    <span>Não</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Se não participar, você não paga entrada e terá acesso ao Painel do Criador (analytics do desafio).
                </p>
              </div>
            </div>
          </fieldset>

          <div className="flex justify-between items-center pt-4 border-t border-neon-green/20">
            <button
              type="button"
              onClick={() => setStep('select')}
              className="bg-transparent border border-white/50 text-main-white font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-neon-green text-black font-bold py-3 px-6 rounded-lg transition-transform hover:scale-105 disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Desafio'}
            </button>
          </div>
        </form>

        <ValidationModal
          isOpen={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          errors={validationErrors}
          title="Erros no Formulário de Desafio"
        />
      </div>
      <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={()=>setPopup(p=>({...p,open:false}))}/>
    </>
  )
}

export default CriarDesafio

