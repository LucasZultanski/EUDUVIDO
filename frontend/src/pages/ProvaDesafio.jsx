import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import api from '../services/api'
import ProvaAcademia from './ProvaAcademia'
import ProvaCorrida from './ProvaCorrida'
import ProvaDieta from './ProvaDieta'
import ProvaEstudo from './ProvaEstudo'
import ProvaCustom from './ProvaCustom'
import PopupMessage from '../components/PopupMessage'

const ProvaDesafio = () => {
  const { id } = useParams()
  const [challenge, setChallenge] = useState(null)
  const [loading, setLoading] = useState(true)
  const [popup, setPopup] = useState({ open: false, title: '', messages: [], type: 'info' })

  const showPopup = (t, m, type = 'info') => setPopup({ open: true, title: t, messages: Array.isArray(m) ? m : [m], type })

  useEffect(() => {
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
          } else {
            showPopup('Desafio não encontrado', 'O desafio que você está procurando não existe.', 'error')
          }
        } catch (e) {
          console.error('Erro ao buscar na lista:', e)
          showPopup('Erro ao buscar desafios', 'Ocorreu um erro ao tentar buscar na lista de desafios.', 'error')
        }
      } finally {
        setLoading(false)
      }
    }
    loadChallenge()
  }, [id])

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Carregando formulário...</p>
      </div>
    )
  }

  // Renderizar formulário baseado no tipo do desafio
  let content
  switch (challenge.type) {
    case 'academia':
      content = <ProvaAcademia />
      break
    case 'corrida':
      content = <ProvaCorrida />
      break
    case 'dieta':
      content = <ProvaDieta />
      break
    case 'estudo':
      content = <ProvaEstudo />
      break
    case 'custom':
      content = <ProvaCustom />
      break
    default:
      // Fallback para desafios sem tipo definido ou tipo desconhecido
      content = <ProvaCustom />
  }

  return (
    <div>
      {content}
      <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={() => setPopup({ ...popup, open: false })} />
    </div>
  )
}

export default ProvaDesafio

