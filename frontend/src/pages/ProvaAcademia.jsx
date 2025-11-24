import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import CheckinSuccessModal from '../components/CheckinSuccessModal'
import PopupMessage from '../components/PopupMessage'
import { useAuth } from '../contexts/AuthContext'

const ProvaAcademia = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [checkinTime, setCheckinTime] = useState(null)              // Date
  const [checkinLocation, setCheckinLocation] = useState('Aguardando GPS...')
  const [photo, setPhoto] = useState(null)
  const [description, setDescription] = useState('')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)           // NOVO
  const [minWorkoutMinutes, setMinWorkoutMinutes] = useState(45)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successTitle, setSuccessTitle] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [proofsPerDay, setProofsPerDay] = useState(null)
  const [popup, setPopup] = useState({ open: false, title: '', messages: [], type: 'info' })
  const [preview, setPreview] = useState(null)

  const showPopup = (t, m, type='info') => setPopup({ open:true, title:t, messages:Array.isArray(m)?m:[m], type })

  // Restaurar check-in
  useEffect(() => {
    const saved = localStorage.getItem(`checkin:gym:${id}`)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data?.startAt) setCheckinTime(new Date(data.startAt))
      } catch {}
    }
  }, [id])

  // Carregar desafio + GPS
  useEffect(() => {
    const loadChallenge = async () => {
      try {
        const r = await api.get(`/api/challenges/${id}`)
        if (r.data?.minWorkoutMinutes) setMinWorkoutMinutes(r.data.minWorkoutMinutes)
        if (r.data?.proofsPerDay != null) setProofsPerDay(parseInt(r.data.proofsPerDay,10))
      } catch {}
    }
    loadChallenge()
    setTimeout(()=>setCheckinLocation('Localização da Academia XYZ - Capturada'),1000)
  }, [id])

  // Intervalo contínuo (segundos desde o check-in)
  useEffect(() => {
    if (!checkinTime) { setElapsedSeconds(0); return }
    const startMs = checkinTime.getTime()
    const tick = () => {
      const diff = Date.now() - startMs
      setElapsedSeconds(Math.max(0, Math.floor(diff / 1000)))
    }
    tick()
    const i = setInterval(tick, 1000)
    return () => clearInterval(i)
  }, [checkinTime])

  const minutesElapsed = Math.floor(elapsedSeconds / 60)
  const canCheckout = minutesElapsed >= minWorkoutMinutes

  // Limite diário
  const countTodayProofs = async () => {
    const today = new Date()
    let backend=[]
    try {
      const r1 = await api.get(`/api/proofs/challenge/${id}/lite`)
      if (Array.isArray(r1.data)) backend=r1.data
    } catch {
      try {
        const r2 = await api.get(`/api/proofs/challenge/${id}`)
        if (Array.isArray(r2.data)) backend=r2.data
      } catch {
        try {
          const r3 = await api.get('/api/proofs',{ params:{ challengeId:id } })
          backend = Array.isArray(r3.data?.items)?r3.data.items:(Array.isArray(r3.data)?r3.data:[])
        } catch {}
      }
    }
    let local=[]
    try { local=JSON.parse(localStorage.getItem(`localProofs:${id}`)||'[]') } catch {}
    const all=[...backend,...local]
    const seen=new Set()
    return all.filter(p=>{
      const t=p?.timestamp||p?.createdAt
      if(!t) return false
      const d=new Date(t)
      if(d.getFullYear()!==today.getFullYear()||d.getMonth()!==today.getMonth()||d.getDate()!==today.getDate()) return false
      // somente do usuário atual (ou sem userId assume atual)
      if (user?.id && p.userId && p.userId !== user.id) return false
      const k=p.id!=null?`id:${p.id}`:`ts:${t}:${p.userId||'local'}`
      if(seen.has(k)) return false
      seen.add(k)
      return true
    }).length
  }

  const handleCheckin = () => {
    if (checkinLocation === 'Aguardando GPS...') {
      showPopup('Localização pendente','Aguarde captura antes de iniciar.','warning')
      return
    }
    const now = new Date()
    setCheckinTime(now)
    localStorage.setItem(`checkin:gym:${id}`, JSON.stringify({ startAt: now.toISOString() }))
    setSuccessTitle('Check-in Iniciado')
    setSuccessMessage('Cronômetro iniciado. Aguarde o tempo mínimo.')
    setShowSuccessModal(true)
  }

  const handleCheckout = async () => {
    if (!photo) {
      showPopup('Foto obrigatória','Adicione uma foto do treino.','error')
      return
    }
    if (!canCheckout) {
      showPopup('Tempo insuficiente',`Faltam ${minWorkoutMinutes - minutesElapsed} minuto(s).`,'warning')
      return
    }
    if (proofsPerDay && proofsPerDay > 0) {
      const used = await countTodayProofs()
      if (used >= proofsPerDay) {
        showPopup('Limite diário',`Limite ${proofsPerDay} prova(s) atingido.`, 'warning')
        return
      }
    }
    try {
      const compressImage = (file) => new Promise((resolve,reject)=>{
        const img=new Image()
        const rd=new FileReader()
        rd.onload=e=>{
          img.onload=()=>{
            const cv=document.createElement('canvas')
            const maxW=1200
            const scale=Math.min(1,maxW/img.width)
            cv.width=Math.round(img.width*scale)
            cv.height=Math.round(img.height*scale)
            cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height)
            resolve(cv.toDataURL('image/jpeg',0.7))
          }
          img.onerror=reject
          img.src=e.target.result
        }
        rd.onerror=reject
        rd.readAsDataURL(file)
      })
      const imageBase64 = await compressImage(photo)

      // ALTERADO: payload achatado conforme solicitado
      const payload = {
        challengeId: Number(id),
        type: 'academia',
        description: description || 'Treino concluído',
        imageUrl: imageBase64,
        elapsedMinutes: minutesElapsed,
        checkinTime: checkinTime?.getTime(),
        checkoutTime: Date.now(),
        timestamp: Date.now(),
        userId: user?.id
      }

      console.log('📤 Enviando payload:', payload)

      const resp = await api.post('/api/proofs', payload, {
        headers: (() => { const t = localStorage.getItem('token'); return t ? { Authorization: `Bearer ${t}` } : {} })()
      })

      if (resp?.data?.error) {
        showPopup('Erro ao enviar', resp.data.message || 'Serviço de provas indisponível.', 'error')
        return
      }

      // cache local
      try {
        const k = `localProofs:${id}`
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        const uid = user?.id || null
        const cached = { ...resp.data.proof || payload, userId: uid }
        if (!cached.timestamp) cached.timestamp = Date.now()
        arr.push(cached)
        localStorage.setItem(k, JSON.stringify(arr.slice(-200)))
      } catch {}

      localStorage.removeItem(`checkin:gym:${id}`)
      setSuccessTitle('Check-out Concluído')
      setSuccessMessage(`Tempo total: ${minutesElapsed} minuto(s).`)
      setShowSuccessModal(true)
    } catch (e) {
      console.error('❌ ERRO NO POST:', {
        message: e.message,
        status: e.response?.status,
        responseData: e.response?.data,
        responseText: e.response?.statusText
      })
      showPopup('Erro', e.response?.data?.error || e.message || 'Falha ao enviar', 'error')
    }
  }

  // Visual progress (minutos)
  const radius=80
  const circumference=2*Math.PI*radius
  const total=Math.max(minWorkoutMinutes||1,1)
  const progress=Math.min(minutesElapsed/total,1)
  const dash=circumference*progress
  const remaining=Math.max(total-minutesElapsed,0)
  const formatHMS = (sec) => {
    const h=Math.floor(sec/3600)
    const m=Math.floor((sec%3600)/60)
    const s=sec%60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  return (
    <>
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <i className="ph-fill ph-barbell text-6xl text-neon-green"></i>
          <h2 className="text-3xl font-semibold">Prova: Academia</h2>
        </div>

        {!checkinTime ? (
          <fieldset className="border border-neon-green/30 p-4 rounded-lg">
            <legend className="text-xl font-semibold px-2 text-neon-green">1. Check-in</legend>
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Capture sua localização para iniciar o cronômetro.</p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Localização</label>
                <input
                  type="text"
                  value={checkinLocation}
                  readOnly
                  className={`mt-1 block w-full bg-black border rounded-md p-2 ${
                    checkinLocation.includes('Capturada')
                      ? 'text-neon-green border-neon-green'
                      : 'text-gray-400 border-white/30'
                  }`}
                />
              </div>
              <button
                onClick={handleCheckin}
                className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105"
              >
                Fazer Check-in (Iniciar Cronômetro)
              </button>
            </div>
          </fieldset>
        ) : (
          <fieldset className="border border-neon-green/30 p-4 rounded-lg">
            <legend className="text-xl font-semibold px-2 text-neon-green">2. Check-out</legend>
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="relative w-56 h-56">
                  <svg className="w-56 h-56 -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="14" fill="none"/>
                    <circle
                      cx="100" cy="100" r={radius}
                      stroke={progress>=1?'#22c55e':'#39FF14'}
                      strokeWidth="14" fill="none" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - dash}
                      style={{transition:'stroke-dashoffset .3s ease'}}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-extrabold ${progress>=1?'text-green-400':'text-neon-green'}`}>
                      {minutesElapsed} min
                    </span>
                    <span className="text-xs text-gray-400">de {total} min</span>
                    <span className="mt-2 text-xs text-gray-500 font-mono">{formatHMS(elapsedSeconds)}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  {progress>=1
                    ? <span className="text-green-400 font-semibold">Tempo mínimo atingido. Faça o check-out.</span>
                    : <span className="text-gray-300">Faltam <span className="text-yellow-400 font-semibold">{remaining}</span> min</span>}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e)=>setDescription(e.target.value)}
                  rows="3"
                  className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white"
                  placeholder="Ex: Treino de superiores + cardio leve"
                />
              </div>
              {proofsPerDay && (
                <p className="text-xs text-gray-400">
                  Limite diário: {proofsPerDay} prova(s).
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300">Foto do Treino (Obrigatório)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e)=>setPhoto(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-green file:text-black hover:file:bg-green-400"
                />
              </div>
              <button
                onClick={handleCheckout}
                disabled={!photo || !canCheckout}
                className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fazer Check-out { !canCheckout && `(mínimo ${minWorkoutMinutes}min)` }
              </button>
            </div>
          </fieldset>
        )}

        <button
          onClick={()=>navigate(`/desafio/${id}`)}
          className="w-full bg-transparent border border-white/50 text-main-white font-bold py-2 px-4 rounded-lg hover:bg-white/10 transition-colors"
        >
          Voltar
        </button>

        <CheckinSuccessModal
          isOpen={showSuccessModal}
          title={successTitle}
          message={successMessage}
          challengeId={id}
          onClose={()=>setShowSuccessModal(false)}
        />
      </div>

      <PopupMessage
        open={popup.open}
        title={popup.title}
        messages={popup.messages}
        type={popup.type}
        onClose={()=>setPopup(p=>({...p,open:false}))}
      />

      {/* Exemplo de visualização do preview (adicione onde desejar na UI) */}
      {preview && (
        <div className="bg-black border border-neon-green/30 rounded p-4 mt-4">
          <h3 className="text-lg font-semibold mb-2">Preview do Envio</h3>
          <pre className="text-xs text-gray-300">{JSON.stringify(preview, null, 2)}</pre>
          {/* Corrigido: mostra imagem do preview se imageUrl for válido, senão mostra preview do arquivo selecionado */}
          {(preview.imageUrl && preview.imageUrl.startsWith('data:image')) ? (
            <img src={preview.imageUrl} alt="Preview" className="mt-2 rounded max-w-xs" />
          ) : (photo ? (
            <img src={URL.createObjectURL(photo)} alt="Preview" className="mt-2 rounded max-w-xs" />
          ) : null)}
        </div>
      )}
    </>
  )
}

export default ProvaAcademia

