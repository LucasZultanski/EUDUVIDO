import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { WalletProvider } from './contexts/WalletContext'
import { ToastProvider } from './contexts/ToastContext'
import Login from './pages/Login'
import Register from './pages/Register'
import MeusDesafios from './pages/MeusDesafios'
import CriarDesafio from './pages/CriarDesafio'
import DetalheDesafio from './pages/DetalheDesafio'
import Wallet from './pages/Wallet';
import ProvaDesafio from './pages/ProvaDesafio'
import Perfil from './pages/Perfil'
import Amigos from './pages/Amigos'
import PrivateRoute from './components/PrivateRoute'
import Pagamento from './pages/Pagamento'
import EntrarDesafio from './pages/EntrarDesafio'
import ConvitesDesafios from './pages/ConvitesDesafios'

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen bg-dark-bg text-main-white">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Área autenticada usando Outlet; evita <Routes> aninhado */}
                <Route element={<PrivateRoute />}>
                  <Route path="/" element={<MeusDesafios />} />
                  <Route path="/criar-desafio" element={<CriarDesafio />} />
                  <Route path="/desafio/:id/pagamento" element={<Pagamento />} />
                  <Route path="/desafio/:id" element={<DetalheDesafio />} />
                  <Route path="/desafio/:id/prova" element={<ProvaDesafio />} />
                  <Route path="/desafio/invite/:shareLink" element={<EntrarDesafio />} />
                  <Route path="/carteira" element={<Wallet />} />
                  <Route path="/perfil" element={<Perfil />} />
                  <Route path="/amigos" element={<Amigos />} />
                  <Route path="/convites" element={<ConvitesDesafios />} />
                </Route>
                
                {/* Rota catch-all: redireciona para login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </div>
          </Router>
        </ToastProvider>
      </WalletProvider>
    </AuthProvider>
  )
}
export default App
