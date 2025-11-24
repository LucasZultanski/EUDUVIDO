import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import CheckinSuccessModal from '../components/CheckinSuccessModal'
import PopupMessage from '../components/PopupMessage'

const ProvaDieta = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [meals, setMeals] = useState([{ photo: null, description: '' }])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [proofsPerDay, setProofsPerDay] = useState(null) // NOVO
  const [targetMeals, setTargetMeals] = useState(1) // NOVO: quantidade requerida
  const [popup,setPopup] = useState({open:false,title:'',messages:[],type:'info'})
  const [minInterval, setMinInterval] = useState(null) // NOVO: intervalo mínimo entre refeições

  const showPopup = (t,m,type='info') => setPopup({open:true,title:t,messages:Array.isArray(m)?m:[m],type})

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/api/challenges/${id}`)
        // NOVO: ler mealsPerDay definido pelo criador
        const mealsRequired = res.data?.mealsPerDay ?? res.data?.mealCountPerDay ?? null
        if (mealsRequired !== null && mealsRequired !== undefined) {
          setTargetMeals(parseInt(mealsRequired, 10) || 1)
        }
        // Dieta não usa proofsPerDay; limpar se vier algo
        setProofsPerDay(null)
        // NOVO: ler intervalo mínimo
        if (res.data?.minMealIntervalMinutes !== undefined && res.data?.minMealIntervalMinutes !== null) {
          setMinInterval(parseInt(res.data.minMealIntervalMinutes, 10))
        }
      } catch {}
    }
    load()
  }, [id])

  // NOVO: ajustar lista para ter exatamente 'targetMeals' entradas
  useEffect(() => {
    setMeals(prev => {
      const clone = [...prev]
      if (targetMeals <= 0) return [{ photo: null, description: '' }]
      if (clone.length === targetMeals) return clone
      if (clone.length < targetMeals) {
        const toAdd = targetMeals - clone.length
        return [...clone, ...Array.from({ length: toAdd }).map(() => ({ photo: null, description: '' }))]
      } else {
        return clone.slice(0, targetMeals)
      }
    })
  }, [targetMeals])

  // Revogar objectURLs ao desmontar
  useEffect(() => {
    return () => {
      meals.forEach(m => {
        if (m?.previewUrl) {
          try { URL.revokeObjectURL(m.previewUrl) } catch {}
        }
      })
    }
  }, [meals])

  const updateMeal = (index, field, value) => {
    const updated = [...meals]
    updated[index][field] = value
    setMeals(updated)
  }

  // NOVO: valida intervalo mínimo (em minutos) entre as fotos selecionadas
  const validateMealIntervals = () => {
    if (!minInterval || minInterval <= 0) return { ok: true }
    const withPhotos = meals
      .map((m, idx) => ({
        idx,
        time: new Date(m?.postedAt || new Date().toISOString()).getTime(),
        hasPhoto: !!m?.photo,
      }))
      .filter(x => x.hasPhoto)
      .sort((a, b) => a.time - b.time)

    if (withPhotos.length <= 1) return { ok: true }

    for (let i = 1; i < withPhotos.length; i++) {
      const diffMin = (withPhotos[i].time - withPhotos[i - 1].time) / 60000
      if (diffMin < minInterval) {
        return { ok: false, a: withPhotos[i - 1], b: withPhotos[i], diffMin }
      }
    }
    return { ok: true }
  }

  const handleSubmit = async () => {
    const countWithPhotos = meals.filter(m => m.photo).length
    if (countWithPhotos < targetMeals) {
      showPopup('Fotos insuficientes', `São necessárias ${targetMeals} foto(s). Enviadas: ${countWithPhotos}.`, 'warning')
      return
    }

    // NOVO: checar intervalo mínimo entre refeições desta submissão
    const intervalCheck = validateMealIntervals()
    if (!intervalCheck.ok) {
      const { a, b, diffMin } = intervalCheck
      const diffFmt = Math.max(0, Math.floor(diffMin))
      showPopup(
        'Intervalo mínimo não respeitado',
        `Entre os pratos ${a.idx + 1} e ${b.idx + 1} há ${diffFmt} min. O mínimo exigido é ${minInterval} min.`,
        'warning'
      )
      return
    }

    try {
      const toBase64 = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const resolved = await Promise.all(
        meals.map(async (meal, index) => {
          if (!meal.photo) return null
          return {
            imageUrl: await toBase64(meal.photo),
            description: meal.description || `Prato ${index + 1} do dia`,
            postedAt: meal.postedAt || new Date().toISOString(),
          }
        })
      )
      const mealsWithPhotos = resolved.filter(Boolean)

      const payload = {
        challengeId: id,
        description: `${mealsWithPhotos.length} prato(s) registrado(s) no dia ${date}`,
        meals: JSON.stringify(mealsWithPhotos), // serializa para string
        photos: mealsWithPhotos.map(m => m.imageUrl),
        mealCount: mealsWithPhotos.length,
        requiredMeals: targetMeals,
        date,
        timestamp: Date.now(),
        // ...adicione outros campos se necessário...
      }

      const resp = await api.post('/api/proofs', payload, {
        headers: (() => {
          const t = localStorage.getItem('token')
          return t ? { Authorization: `Bearer ${t}` } : {}
        })()
      })

      // cache local
      try {
        const k = `localProofs:${id}`
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        const uid = (JSON.parse(localStorage.getItem('user') || '{}').id) || null
        const cached = { ...resp.data?.proof || payload, userId: uid }
        if (!cached.timestamp) cached.timestamp = Date.now()
        arr.push(cached)
        localStorage.setItem(k, JSON.stringify(arr.slice(-200)))
      } catch {}

      setSuccessMessage(`${mealsWithPhotos.length} prato(s) registrado(s) no dia ${date}`)
      setShowSuccessModal(true)
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'Erro ao enviar prova'
      showPopup('Erro ao enviar', msg, 'error')
    }
  }

  const countTodayMeals = async () => {
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
      const match = d.getFullYear()===today.getFullYear() && d.getMonth()===today.getMonth() && d.getDate()===today.getDate()
      if (!match) return false
      const key = p.id != null ? `id:${p.id}` : `ts:${t}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).length
  }

  return (
    <>
      <div className="bg-black border border-neon-green/30 p-6 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <i className="ph-fill ph-apple-logo text-6xl text-neon-green"></i>
          <h2 className="text-3xl font-semibold">Prova: Dieta</h2>
        </div>

        <fieldset className="border border-neon-green/30 p-4 rounded-lg">
          <legend className="text-xl font-semibold px-2 text-neon-green">Registro de Refeições</legend>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white focus:border-neon-green focus:ring-neon-green"
              />
            </div>

            {/* Removido input para o usuário escolher quantidade; mostrar aviso com a meta */}
            <div className="bg-black/40 border border-white/10 p-3 rounded">
              <p className="text-sm text-gray-300">
                Este desafio exige <span className="text-neon-green font-semibold">{targetMeals}</span> refeição(ões) por dia.
                Envie uma foto nítida de cada prato (evite fotos repetidas ou sem iluminação).
              </p>
              {minInterval ? (
                <p className="text-xs text-gray-400 mt-1">
                  Intervalo mínimo entre refeições: <span className="text-neon-green font-semibold">{minInterval} min</span>.
                </p>
              ) : null}
            </div>

            <div className="space-y-4">
              {/* ...existing code that renders each meal input and preview... */}
              {meals.map((meal, index) => (
                <div key={index} className="bg-black border border-neon-green/20 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-neon-green">Prato {index + 1}</h4>
                    {/* ...removed remove button... */}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Foto do Prato {index + 1} (Obrigatório)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0]
                        if (!file) return
                        const updated = [...meals]
                        const prevUrl = updated[index]?.previewUrl
                        if (prevUrl) {
                          try { URL.revokeObjectURL(prevUrl) } catch {}
                        }
                        const previewUrl = URL.createObjectURL(file)
                        updated[index] = {
                          ...(updated[index] || { description: '' }),
                          photo: file,
                          postedAt: new Date().toISOString(),
                          previewUrl // corrigido
                        }
                        setMeals(updated)
                      }}
                      className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neon-green file:text-black hover:file:bg-green-400"
                    />
                    {meal.photo && (
                      <>
                        <p className="text-xs text-neon-green mt-1">✓ Foto selecionada (garanta boa iluminação)</p>
                        {meal.previewUrl && (
                          <img
                            src={meal.previewUrl}
                            alt={`Prévia prato ${index + 1}`}
                            className="mt-2 w-full h-40 object-cover rounded border border-white/10"
                          />
                        )}
                        {meal.postedAt && (
                          <p className="text-xs text-gray-400">
                            Registrado às {new Date(meal.postedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descrição (opcional)
                    </label>
                    <input
                      type="text"
                      value={meal.description}
                      onChange={(e) => updateMeal(index, 'description', e.target.value)}
                      className="mt-1 block w-full bg-black border-white/30 rounded-md p-2 text-main-white"
                      placeholder="Ex: Salada + frango grelhado"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* NOVO: Galeria de pré-visualização com todas as fotos e horários */}
            {meals.some(m => m.photo) && (
              <div className="mt-4">
                <h4 className="text-lg font-semibold text-neon-green mb-2">Pré-visualização das Fotos</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {meals.map((m, idx) => m.photo && (
                    <div key={`preview-${idx}`} className="bg-black border border-white/10 rounded p-2">
                      {m.previewUrl && (
                        <img
                          src={m.previewUrl}
                          alt={`Prato ${idx + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                      )}
                      <p className="text-xs text-gray-300 mt-1">
                        Foto {idx + 1}{m.postedAt ? ` — ${new Date(m.postedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={meals.filter(m => m.photo).length < targetMeals}
              className="w-full bg-neon-green text-black font-bold py-3 px-4 rounded-lg transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enviar Prova (mínimo {targetMeals} foto{targetMeals !== 1 ? 's' : ''})
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
          title="Check-in de Dieta"
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
        onClose={()=>setPopup(p=>({...p,open:false}))}
      />
    </>
  )
}

export default ProvaDieta

