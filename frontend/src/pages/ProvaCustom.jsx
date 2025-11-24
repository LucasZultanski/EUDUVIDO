import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import CheckinSuccessModal from '../components/CheckinSuccessModal'
import PopupMessage from '../components/PopupMessage'
import { useAuth } from '../contexts/AuthContext'

const ProvaCustom = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [challenge, setChallenge] = useState(null)
  const [values, setValues] = useState({})
  const [photos, setPhotos] = useState([])
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Aguardando GPS...')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [timeStartAt, setTimeStartAt] = useState(null)
  const [timeActive, setTimeActive] = useState(false)
  const [timeOffset, setTimeOffset] = useState(0)
  const [timeElapsed, setTimeElapsed] = useState(0)
  const [minCustomTime, setMinCustomTime] = useState(null)
  const [popup,setPopup]=useState({open:false,title:'',messages:[],type:'info'})

  // proofsPerDay já pode ser lido de challenge (carregado acima)

  useEffect(() => {
    // Carregar informações do desafio para obter os parâmetros definidos
    const loadChallenge = async () => {
      try {
        const response = await api.get(`/api/challenges/${id}`)
        setChallenge(response.data)
      } catch (error) {
        console.error('Erro ao carregar desafio:', error)
        // Fallback: tentar buscar na lista
        try {
          const listResponse = await api.get('/api/challenges')
          const challenges = Array.isArray(listResponse.data) ? listResponse.data : []
          const found = challenges.find((c) => String(c.id) === String(id))
          if (found) {
            setChallenge(found)
          }
        } catch (e) {
          console.error('Erro ao buscar na lista:', e)
        }
      }
    }
    loadChallenge()

    // Simular captura de GPS
    setTimeout(() => {
      setLocation('Localização capturada')
    }, 1000)

    // Restaurar cronômetro se existir
    const key = `checkin:custom:time:${id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data?.startAt) setTimeStartAt(data.startAt)
        if (typeof data?.offsetSeconds === 'number') setTimeOffset(data.offsetSeconds)
        if (typeof data?.isActive === 'boolean') setTimeActive(data.isActive)
      } catch {}
    }
  }, [id])

  useEffect(() => {
    if (!challenge) return
    // meta mínima opcional para tempo (se existir no challenge)
    const meta =
      challenge.minTimeMinutes ??
      challenge.customMinTimeMinutes ??
      null
    if (meta !== null && meta !== undefined) {
      setMinCustomTime(parseInt(meta, 10))
    }
  }, [challenge])

  // Tick do timer do tipo "time"
  useEffect(() => {
    if (!timeActive || !timeStartAt) return
    const i = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(timeStartAt).getTime()) / 1000)
      setTimeElapsed(timeOffset + Math.max(diff, 0))
    }, 1000)
    return () => clearInterval(i)
  }, [timeActive, timeStartAt, timeOffset])

  // Enquanto o timer roda, preenche automaticamente o campo "time" (minutos)
  useEffect(() => {
    if (customProofTypes.includes('time')) {
      const mins = Math.floor(timeElapsed / 60)
      setValues((prev) => ({ ...prev, time: mins }))
    }
  }, [timeElapsed, customProofTypes])

  const proofTypes = [
    { id: 'km', label: 'Distância (KM)', icon: 'ph-person-simple-run', placeholder: 'Ex: 5.5', inputType: 'number' },
    { id: 'time', label: 'Tempo (minutos)', icon: 'ph-clock', placeholder: 'Ex: 60', inputType: 'number' },
    { id: 'count', label: 'Quantidade', icon: 'ph-hash', placeholder: 'Ex: 10', inputType: 'number' },
    { id: 'photo', label: 'Foto', icon: 'ph-image', placeholder: '', inputType: 'file' },
  ]

  const customProofTypes = challenge?.customProofTypes || []

  const updateValue = (typeId, value) => {
    setValues({ ...values, [typeId]: value })
  }

  const handlePhotoChange = (index, file) => {
    const newPhotos = [...photos]
    newPhotos[index] = file
    setPhotos(newPhotos)
  }

  const addPhoto = () => {
    setPhotos([...photos, null])
  }

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const countTodayProofs = async () => {
    const today = new Date()
    let backend = []
    try {
      const rLite = await api.get(`/api/proofs/challenge/${id}/lite`)
      if (Array.isArray(rLite.data)) backend = rLite.data
    } catch {
      try {
        const rPath = await api.get(`/api/proofs/challenge/${id}`)
        if (Array.isArray(rPath.data)) backend = rPath.data
      } catch {
        try {
          const rQ = await api.get('/api/proofs', { params: { challengeId: id } })
          backend = Array.isArray(rQ.data?.items) ? rQ.data.items : (Array.isArray(rQ.data) ? rQ.data : [])
        } catch {}
      }
    }
    let localArr = []
    try { localArr = JSON.parse(localStorage.getItem(`localProofs:${id}`) || '[]') } catch {}
    const all = [...backend, ...localArr]
    const seen = new Set()
    return all.filter(p => {
      const t = p?.timestamp || p?.createdAt
      if (!t) return false
      const d = new Date(t)
      if (d.getFullYear()!==today.getFullYear() || d.getMonth()!==today.getMonth() || d.getDate()!==today.getDate()) return false
      if (user?.id && p.userId && p.userId !== user.id) return false
      const key = p.id != null ? `id:${p.id}` : `ts:${t}:${p.userId||'local'}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).length
  }

  const startCustomTimer = () => {
    const key = `checkin:custom:time:${id}`
    const nowIso = new Date().toISOString()
    setTimeActive(true)
    if (!timeStartAt) setTimeStartAt(nowIso)
    localStorage.setItem(key, JSON.stringify({ startAt: timeStartAt || nowIso, offsetSeconds: timeOffset, isActive: true }))
  }

  const pauseCustomTimer = () => {
    const key = `checkin:custom:time:${id}`
    const current = timeStartAt ? Math.floor((Date.now() - new Date(timeStartAt).getTime()) / 1000) : 0
    const newOffset = timeOffset + Math.max(current, 0)
    setTimeOffset(newOffset)
    setTimeActive(false)
    setTimeStartAt(null)
    localStorage.setItem(key, JSON.stringify({ startAt: null, offsetSeconds: newOffset, isActive: false }))
  }

  const resetCustomTimer = () => {
    const key = `checkin:custom:time:${id}`
    setTimeActive(false)
    setTimeStartAt(null)
    setTimeOffset(0)
    setTimeElapsed(0)
    setValues((prev) => ({ ...prev, time: '' }))
    localStorage.removeItem(key)
  }

  const showPopup=(t,m,type='info')=>setPopup({open:true,title:t,messages:Array.isArray(m)?m:[m],type})

  const handleSubmit = async () => {
    // Validar que todos os parâmetros obrigatórios foram preenchidos
    for (const typeId of customProofTypes) {
      if (typeId !== 'photo') {
        if (!values[typeId] || parseFloat(values[typeId]) <= 0) {
          showPopup('Valor ausente', `Informe um valor válido para ${typeId}.`, 'warning')
          return
        }
      }
    }

    // Validar que há pelo menos uma foto se 'photo' estiver nos parâmetros
    if (customProofTypes.includes('photo')) {
      if (photos.length === 0 || photos.some(p => !p)) {
        showPopup('Foto obrigatória','Adicione pelo menos uma foto.', 'error')
        return
      }
    } else {
      // Se não tem 'photo' nos parâmetros, ainda precisa de pelo menos uma foto para comprovar
      if (photos.length === 0 || photos.some(p => !p)) {
        showPopup('Foto de comprovação','Adicione pelo menos uma foto para comprovar.', 'warning')
        return
      }
    }

    // NOVO: checar limite diário
    const proofsPerDay = challenge?.proofsPerDay ? parseInt(challenge.proofsPerDay, 10) : null
    if (proofsPerDay && proofsPerDay > 0) {
      const used = await countTodayProofs()
      if (used >= proofsPerDay) {
        showPopup('Limite diário', `Você já enviou ${used}/${proofsPerDay} prova(s).`, 'warning')
        return
      }
    }

    try {
      // Converter todas as fotos para base64
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const compressImage = (file) => new Promise((resolve, reject) => {
        const img = new Image()
        const rd = new FileReader()
        rd.onload = e => {
          img.onload = () => {
            const cv = document.createElement('canvas')
            const maxW = 1200
            const scale = Math.min(1, maxW / img.width)
            cv.width = Math.round(img.width * scale)
            cv.height = Math.round(img.height * scale)
            cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
            resolve(cv.toDataURL('image/jpeg', 0.7))
          }
          img.onerror = reject
          img.src = e.target.result
        }
        rd.onerror = reject
        rd.readAsDataURL(file)
      })

      const healthy = await (await import('../services/api.js')).checkProofHealth?.()
      if (healthy === false) {
        console.warn('[prova] health falhou, tentando envio mesmo assim')
      }
      const photosBase64 = await Promise.all(photos.filter(p => p).map(f => compressImage(f)))

      const payload = {
        challengeId: id,
        description: description || 'Check-in customizado',
        photos: photosBase64,
        proofTypes: customProofTypes,
        proofValues: values,
        location: location,
        timestamp: new Date().getTime()
      }

      const resp = await api.post('/api/proofs', payload, {
        headers: (() => { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} })()
      })
      if (resp?.data?.error) {
        showPopup('Erro ao enviar', resp.data.message || 'Serviço indisponível.', 'error')
        return
      }
      try {
        const k = `localProofs:${id}`
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        const uid = (JSON.parse(localStorage.getItem('user') || '{}').id) || null
        const cached = { ...resp.data?.proof || payload, userId: uid }
        if (!cached.timestamp) cached.timestamp = Date.now()
        arr.push(cached)
        localStorage.setItem(k, JSON.stringify(arr.slice(-200)))
      } catch {}

      // Limpar persistência do timer "time" após concluir
      localStorage.removeItem(`checkin:custom:time:${id}`)

      const summary = Object.entries(values)
        .filter(([k]) => k !== 'photo')
        .map(([k,v]) => `${k}: ${v}`)
        .join('\n')
      setSuccessMessage(summary || 'Check-in registrado')
      setShowSuccessModal(true)
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao enviar prova'
      showPopup('Erro ao enviar', msg, 'error')
    }
  }

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const elapsedMin = Math.floor(timeElapsed / 60)
  const goal = Math.max(minCustomTime || 0, 0)
  const progress = goal > 0 ? Math.min(elapsedMin / goal, 1) : 0
  const dash = circumference * progress
  const remaining = goal > 0 ? Math.max(goal - elapsedMin, 0) : null

  if (!challenge) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Carregando formulário...</p>
      </div>
    )
  }

  if (!customProofTypes || customProofTypes.length === 0) {
    return (
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <i className="ph-fill ph-warning text-6xl text-yellow-400"></i>
          <h2 className="text-3xl font-semibold">Erro</h2>
          <p className="text-gray-400 mt-2">
            Este desafio customizável não possui parâmetros definidos.
          </p>
          <button
            onClick={() => navigate(`/desafio/${id}`)}
            className="mt-4 bg-neon-green text-black font-bold py-2 px-4 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <i className="ph-fill ph-gear text-6xl text-neon-green"></i>
          <h2 className="text-3xl font-semibold">Prova: Customizável</h2>
          <p className="text-sm text-gray-400 mt-2">
            Preencha os parâmetros definidos pelo criador do desafio
          </p>
        </div>

        <fieldset className="border border-neon-green/30 p-4 rounded-lg">
          <legend className="text-xl font-semibold px-2 text-neon-green">Check-in Customizado</legend>
          <div className="space-y-4">
            {/* Se o parâmetro "time" foi selecionado, mostrar o temporizador */}
            {customProofTypes.includes('time') && (
              <div className="bg-black/40 border border-white/10 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-40 h-40 -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                      {goal > 0 && (
                        <circle
                          cx="100"
                          cy="100"
                          r={radius}
                          stroke={progress >= 1 ? '#22c55e' : '#39FF14'}
                          strokeWidth="12"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference - dash}
                          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-extrabold ${progress >= 1 ? 'text-green-400' : 'text-neon-green'}`}>
                        {elapsedMin} min
                      </span>
                      {goal > 0 ? (
                        <span className="text-xs text-gray-400">de {goal} min</span>
                      ) : (
                        <span className="text-xs text-gray-400">sem meta</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-sm text-gray-300">
                      O campo “Tempo (minutos)” é preenchido automaticamente pelo cronômetro — não edite manualmente.
                    </div>
                    <div className="flex gap-2">
                      {!timeActive ? (
                        <button onClick={startCustomTimer} className="bg-neon-green text-black font-bold py-2 px-4 rounded-lg hover:bg-neon-green/90">
                          Iniciar
                        </button>
                      ) : (
                        <>
                          <button onClick={pauseCustomTimer} className="bg-red-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-600">
                            Pausar
                          </button>
                          <button onClick={resetCustomTimer} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600">
                            Resetar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {customProofTypes.map((typeId) => {
              const type = proofTypes.find(t => t.id === typeId)
              if (!type) return null

              if (typeId === 'photo') {
                return (
                  <div key={typeId}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {type.label} (Obrigatório)
                    </label>
                    <div className="space-y-2">
                      {photos.map((photo, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handlePhotoChange(index, e.target.files[0])}
                            className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-green file:text-black hover:file:bg-green-400"
                          />
                          {photos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removePhoto(index)}
                              className="text-red-400 hover:text-red-300 px-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addPhoto}
                        className="bg-neon-green text-black font-bold py-1 px-3 rounded text-sm hover:bg-green-400"
                      >
                        + Adicionar Foto
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={typeId}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {type.label}
                  </label>
                  <input
                    type={type.inputType}
                    step={typeId === 'km' ? '0.01' : '1'}
                    min="0.01"
                    value={values[typeId] || ''}
                    onChange={(e) => updateValue(typeId, e.target.value)}
                    className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                    placeholder={
                      typeId === 'km' ? 'Ex: 4.50 (KM)'
                      : typeId === 'time' ? 'Ex: 45 (min)'
                      : typeId === 'count' ? 'Ex: 12 (repetições)'
                      : ''
                    }
                  />
                </div>
              )
            })}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Localização</label>
              <input
                type="text"
                value={location}
                readOnly
                className={`mt-1 block w-full bg-black border rounded-md p-2 ${
                  location.includes('capturada')
                    ? 'text-neon-green border-neon-green'
                    : 'text-gray-400 border-white/30'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white"
                placeholder="Ex: Concluí a meta com foco constante..."
              />
            </div>

            {/* Se não tem 'photo' nos parâmetros, ainda precisa de pelo menos uma foto para comprovar */}
            {!customProofTypes.includes('photo') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Foto de Comprovação (Obrigatório)
                </label>
                <div className="space-y-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(index, e.target.files[0])}
                        className="flex-1 text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-green file:text-black hover:file:bg-green-400"
                      />
                      {photos.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="text-red-400 hover:text-red-300 px-2"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhoto}
                    className="bg-neon-green text-black font-bold py-1 px-3 rounded text-sm hover:bg-green-400"
                  >
                    + Adicionar Foto
                  </button>
                </div>
              </div>
            )}

            {challenge?.proofsPerDay && (
              <p className="text-xs text-gray-400">
                Limite diário: {challenge.proofsPerDay} prova(s) por participante.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                customProofTypes.some(typeId => typeId !== 'photo' && (!values[typeId] || parseFloat(values[typeId]) <= 0)) ||
                photos.length === 0 ||
                photos.some(p => !p)
              }
              className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar Prova
            </button>
          </div>
        </fieldset>
      </div>
      <CheckinSuccessModal
        isOpen={showSuccessModal}
        title="Check-in Customizável"
        message={successMessage}
        challengeId={id}
        onClose={() => setShowSuccessModal(false)}
      />
      <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={()=>setPopup(p=>({...p,open:false}))}/>
    </>
  )
}

export default ProvaCustom
