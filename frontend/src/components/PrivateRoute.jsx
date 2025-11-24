import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Header from './Header'

const PrivateRoute = () => {
  const { token, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <Header />
      <main className="container mx-auto p-4 md:p-8">
        <Outlet />
      </main>
    </>
  )
}

export default PrivateRoute
