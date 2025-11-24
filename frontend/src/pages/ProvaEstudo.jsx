import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import CheckinSuccessModal from '../components/CheckinSuccessModal'
import PopupMessage from '../components/PopupMessage'
import { useAuth } from '../contexts/AuthContext'

const ProvaEstudo = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const intervalRef = useRef(null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false) // NOVO
  const [successMessage, setSuccessMessage] = useState('') // NOVO
  const [proofsPerDay, setProofsPerDay] = useState(null) // NOVO
  const [minStudyMinutes, setMinStudyMinutes] = useState(null) // meta mínima (se existir)
  const [startAt, setStartAt] = useState(null) // Date ISO string
  const [offsetSeconds, setOffsetSeconds] = useState(0) // acumulo quando pausado
  const [popup,setPopup] = useState({open:false,title:'',messages:[],type:'info'})

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1)
    }, 1000)
  }

  useEffect(() => {
    // Detectar quando a janela perde o foco
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        // Pausar o cronômetro quando a aba/janela perde o foco
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      } else if (!document.hidden && isActive && !intervalRef.current) {
        // Retomar o cronômetro quando a aba/janela volta ao foco
        // O elapsedTime já está correto, só precisa retomar o intervalo
        startTimer()
      }
    }

    // Detectar quando a janela perde o foco (blur)
    const handleBlur = () => {
      if (isActive && intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Detectar quando a janela volta ao foco (focus)
    const handleFocus = () => {
      if (isActive && !intervalRef.current) {
        // Retomar o cronômetro - o elapsedTime já está correto
        startTimer()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive])

  // Restaurar estado do timer ao abrir a tela
  useEffect(() => {
    const key = `checkin:study:${id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data?.startAt) setStartAt(data.startAt)
        if (typeof data?.offsetSeconds === 'number') setOffsetSeconds(data.offsetSeconds)
        if (typeof data?.isActive === 'boolean') setIsActive(data.isActive)
      } catch {}
    }
  }, [id])

  // Carregar challenge para proofsPerDay e meta mínima de tempo (se houver)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/challenges/${id}`)
        if (res.data?.proofsPerDay !== undefined && res.data?.proofsPerDay !== null) {
          setProofsPerDay(parseInt(res.data.proofsPerDay, 10))
        }
        // tentar encontrar algum campo de meta mínima de estudo
        const meta =
          res.data?.minStudyMinutes ??
          res.data?.studyMinMinutes ??
          null
        if (meta !== null && meta !== undefined) {
          setMinStudyMinutes(parseInt(meta, 10))
        }
      } catch {}
    }
    load()
  }, [id])
  
  // Tick do timer: calcula a partir de startAt + offsetSeconds
  useEffect(() => {
    if (!isActive || !startAt) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - new Date(startAt).getTime()) / 1000)
      setElapsedTime(offsetSeconds + Math.max(diff, 0))
    }, 1000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isActive, startAt, offsetSeconds])

  // Controles do timer com persistência
  const handleStart = () => {
    const key = `checkin:study:${id}`
    const nowIso = new Date().toISOString()
    setIsActive(true)
    if (!startAt) setStartAt(nowIso)
    const data = { startAt: startAt || nowIso, offsetSeconds, isActive: true }
    localStorage.setItem(key, JSON.stringify(data))
  }

  const handleStop = () => {
    const key = `checkin:study:${id}`
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    // acumular tempo até agora
    const current = startAt ? Math.floor((Date.now() - new Date(startAt).getTime()) / 1000) : 0
    const newOffset = offsetSeconds + Math.max(current, 0)
    setOffsetSeconds(newOffset)
    setIsActive(false)
    setStartAt(null)
    localStorage.setItem(key, JSON.stringify({ startAt: null, offsetSeconds: newOffset, isActive: false }))
  }

  const handleReset = () => {
    const key = `checkin:study:${id}`
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsActive(false)
    setElapsedTime(0)
    setOffsetSeconds(0)
    setStartAt(null)
    localStorage.removeItem(key)
  }

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const countTodayProofs = async () => {
    try {
      const res = await api.get(`/api/proofs/challenge/${id}`)
      const items = Array.isArray(res.data) ? res.data : []
      const today = new Date()
      return items.filter(p => {
        const t = p.timestamp || p.createdAt
        if (!t) return false
        const d = new Date(Number(t))
        if (d.getFullYear()!==today.getFullYear() || d.getMonth()!==today.getMonth() || d.getDate()!==today.getDate()) return false
        if (user?.id && p.userId && p.userId !== user.id) return false
        return true
      }).length
    } catch {
      return 0
    }
  }

  const showPopup = (t,m,type='info') => setPopup({open:true,title:t,messages:Array.isArray(m)?m:[m],type})

  const compressImage = (file) => new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = e => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 1200
        const scale = Math.min(1, maxW / img.width)
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const handleSubmit = async () => {
    if (elapsedTime === 0) {
      showPopup('Tempo insuficiente', 'Você precisa estudar alguns segundos antes de enviar.', 'warning')
      return
    }
    if (!photo) {
      showPopup('Foto obrigatória', 'Adicione uma foto para comprovar o estudo.', 'error')
      return
    }

    // NOVO: checar limite diário
    if (proofsPerDay && proofsPerDay > 0) {
      const used = await countTodayProofs()
      if (used >= proofsPerDay) {
        showPopup('Limite diário atingido', `Você já enviou ${used} de ${proofsPerDay} prova(s) hoje.`, 'warning')
        return
      }
    }

    try {
      // Converter foto para base64
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const healthy = await (await import('../services/api.js')).checkProofHealth?.()
      if (healthy === false) {
        console.warn('[prova] health falhou, tentando envio mesmo assim')
      }
      const imageBase64 = await compressImage(photo)

      const payload = {
        challengeId: id,
        description: description || `Estudo de ${formatTime(elapsedTime)}`,
        imageUrl: imageBase64,
        studyTime: elapsedTime, // tempo em segundos
        studyTimeFormatted: formatTime(elapsedTime),
        timestamp: new Date().getTime()
      }

      const resp = await api.post('/api/proofs', payload, { headers: (() => { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} })() })
      if (resp?.data?.error) {
        showPopup('Erro ao enviar', resp.data.message || 'Serviço de provas indisponível.', 'error')
        return
      }
      try {
        const k = `localProofs:${id}`
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        const uid = user?.id || null
        const cached = { ...(resp.data.proof || payload), userId: uid }
        if (!cached.timestamp) cached.timestamp = Date.now()
        arr.push(cached)
        localStorage.setItem(k, JSON.stringify(arr.slice(-200)))
      } catch {}
      // Limpar persistência do timer ao concluir
      localStorage.removeItem(`checkin:study:${id}`)
      setSuccessMessage(`Tempo de estudo: ${formatTime(elapsedTime)}`)
      setShowSuccessModal(true)
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao enviar prova'
      showPopup('Erro ao enviar', msg, 'error')
    }
  }

  // Visual: anel de progresso
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const elapsedMin = Math.floor(elapsedTime / 60)
  const goal = Math.max(minStudyMinutes || 0, 0)
  const progress = goal > 0 ? Math.min(elapsedMin / goal, 1) : 0
  const dash = circumference * progress
  const remaining = goal > 0 ? Math.max(goal - elapsedMin, 0) : null

  return (
    <>
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <i className="ph-fill ph-book-open text-6xl text-neon-green"></i>
          <h2 className="text-3xl font-semibold">Prova: Estudo</h2>
          <p className="text-sm text-gray-400 mt-2">
            {goal > 0 ? 'Estude até atingir a meta mínima e envie sua prova.' : 'Inicie o cronômetro e envie sua prova quando desejar.'}
          </p>
        </div>

        <fieldset className="border border-neon-green/30 p-4 rounded-lg">
          <legend className="text-xl font-semibold px-2 text-neon-green">Cronômetro de Estudo</legend>
          <div className="space-y-4">
            {/* Novo timer em destaque */}
            <div className="flex flex-col items-center">
              <div className="relative w-56 h-56">
                <svg className="w-56 h-56 -rotate-90" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="14" fill="none" />
                  {goal > 0 && (
                    <circle
                      cx="100"
                      cy="100"
                      r={radius}
                      stroke={progress >= 1 ? '#22c55e' : '#39FF14'}
                      strokeWidth="14"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - dash}
                      style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                    />
                  )}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-extrabold ${progress >= 1 ? 'text-green-400' : 'text-neon-green'}`}>
                    {elapsedMin} min
                  </span>
                  {goal > 0 ? (
                    <span className="text-xs text-gray-400">de {goal} min</span>
                  ) : (
                    <span className="text-xs text-gray-400">sem meta definida</span>
                  )}
                </div>
              </div>
              {goal > 0 && (
                <p className="mt-2 text-sm">
                  {progress >= 1 ? (
                    <span className="text-green-400 font-semibold">Meta atingida! Envie sua prova.</span>
                  ) : (
                    <span className="text-gray-300">
                      Faltam <span className="text-yellow-400 font-semibold">{remaining} min</span> para atingir a meta
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="text-center">
              <div className="flex gap-2 justify-center">
                {!isActive ? (
                  <button onClick={handleStart} className="bg-neon-green text-black font-bold py-2 px-6 rounded-lg hover:bg-green-400">
                    Iniciar
                  </button>
                ) : (
                  <>
                    <button onClick={handleStop} className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600">
                      Pausar
                    </button>
                    <button onClick={handleReset} className="bg-gray-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600">
                      Resetar
                    </button>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Descrição (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="3"
                className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white"
                placeholder="Descreva o que você estudou..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Foto do Estudo (Obrigatório)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-green file:text-black hover:file:bg-green-400"
              />
              <p className="text-xs text-gray-400 mt-1">Ex: Foto da tela de estudo, material, etc.</p>
            </div>

            {proofsPerDay && (
              <p className="text-xs text-gray-400">
                Limite diário: {proofsPerDay} prova(s) por participante.
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!photo || elapsedTime === 0}
              className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar Prova
            </button>
          </div>
        </fieldset>

        <button
          onClick={() => navigate(`/desafio/${id}`)}
          className="w-full bg-transparent border border-white/50 text-main-white font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
        >
          Voltar (Cancelar)
        </button>

        <CheckinSuccessModal
          isOpen={showSuccessModal}
          title="Check-in de Estudo"
          message={successMessage}
          challengeId={id}
          onClose={() => setShowSuccessModal(false)}
        />
      </div>

      <PopupMessage
        open={popup.open}
        title={popup.title}
        messages={popup.messages}
        type={popup.type}
        onClose={() => setPopup(p=>({...p,open:false}))}
      />
    </>
  )
}

export default ProvaEstudo

