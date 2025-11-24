import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import CheckinSuccessModal from '../components/CheckinSuccessModal'
import PopupMessage from '../components/PopupMessage'

const ProvaCorrida = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [distance, setDistance] = useState('')
  const [photo, setPhoto] = useState(null)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Aguardando GPS...')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [proofsPerDay, setProofsPerDay] = useState(null) // NOVO
  const [popup,setPopup]=useState({open:false,title:'',messages:[],type:'info'})

  const showPopup=(t,m,type='info')=>setPopup({open:true,title:t,messages:Array.isArray(m)?m:[m],type})

  useEffect(() => {
    // Simular captura de GPS
    setTimeout(() => {
      setLocation('Localização capturada')
    }, 1000)
    // NOVO: carregar desafio para obter proofsPerDay
    const load = async () => {
      try {
        const res = await api.get(`/api/challenges/${id}`)
        if (res.data?.proofsPerDay !== undefined && res.data?.proofsPerDay !== null) {
          setProofsPerDay(parseInt(res.data.proofsPerDay, 10))
        }
      } catch {}
    }
    load()
  }, [id])

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
      const dayMatch = d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
      if (!dayMatch) return false
      const key = p.id != null ? `id:${p.id}` : `ts:${t}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).length
  }

  const compressImage = (file) => new Promise((resolve, reject) => {
    const img = new Image()
    const r = new FileReader()
    r.onload = e => {
      img.onload = () => {
        const c = document.createElement('canvas')
        const maxW = 1200
        const scale = Math.min(1, maxW / img.width)
        c.width = Math.round(img.width * scale)
        c.height = Math.round(img.height * scale)
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
        resolve(c.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    r.onerror = reject
    r.readAsDataURL(file)
  })

  const handleSubmit = async () => {
    if (!distance || parseFloat(distance) <= 0) {
      showPopup('Distância inválida', 'Informe a distância percorrida em KM (> 0).', 'warning')
      return
    }

    if (!photo) {
      showPopup('Foto obrigatória', 'Adicione uma foto para comprovar a corrida.', 'error')
      return
    }

    // NOVO: checar limite diário
    if (proofsPerDay && proofsPerDay > 0) {
      const used = await countTodayProofs()
      if (used >= proofsPerDay) {
        showPopup('Limite diário', `Você já atingiu ${used}/${proofsPerDay} prova(s) hoje.`, 'warning')
        return
      }
    }
    try {
      const healthy = await (await import('../services/api.js')).checkProofHealth?.()
      if (healthy === false) {
        console.warn('[prova] health falhou, tentando envio mesmo assim')
      }
      const imageBase64 = await compressImage(photo)

      const payload = {
        challengeId: id,
        description: description || `Corrida de ${distance} KM`,
        imageUrl: imageBase64,
        distance: parseFloat(distance),
        location: location,
        timestamp: new Date().getTime()
      }

      const t = localStorage.getItem('token')
      const resp = await api.post('/api/proofs', payload)
      if (resp?.data?.error) {
        showPopup('Erro ao enviar', resp.data.message || 'Serviço indisponível.', 'error')
        return
      }
      try {
        const k = `localProofs:${id}`
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        const uid = (JSON.parse(localStorage.getItem('user') || '{}').id) || null
        const cached = { ...resp.data.proof || payload, userId: uid }
        if (!cached.timestamp) cached.timestamp = Date.now()
        arr.push(cached)
        localStorage.setItem(k, JSON.stringify(arr.slice(-200)))
      } catch {}
      setSuccessMessage(`Distância registrada: ${distance} KM`)
      setShowSuccessModal(true)
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao enviar prova'
      showPopup('Erro ao enviar', msg, 'error')
    }
  }

  return (
    <>
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <i className="ph-fill ph-person-simple-run text-6xl text-neon-green"></i>
          <h2 className="text-3xl font-semibold">Prova: Corrida</h2>
        </div>

        <fieldset className="border border-neon-green/30 p-4 rounded-lg">
          <legend className="text-xl font-semibold px-2 text-neon-green">Check-in de Corrida</legend>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Distância percorrida (KM)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
                placeholder="Ex: 5.20"
              />
            </div>

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
                placeholder="Ex: Corrida matinal ritmo leve..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Foto da Corrida (Obrigatório)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files[0])}
                className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-green file:text-black hover:file:bg-green-400"
              />
            </div>

            {proofsPerDay && (
              <p className="text-xs text-gray-400">
                Limite diário: {proofsPerDay} prova(s) por participante.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!photo || !distance || parseFloat(distance) <= 0}
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
          title="Check-in de Corrida"
          message={successMessage}
          challengeId={id}
          onClose={() => setShowSuccessModal(false)}
        />
      </div>

      <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={()=>setPopup(p=>({...p,open:false}))}/>
    </>
  )
}

export default ProvaCorrida

