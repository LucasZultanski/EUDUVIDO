import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import api from '../services/api';
import ChallengeSuccessModal from '../components/ChallengeSuccessModal';
import PaymentConfirmationModal from '../components/PaymentConfirmationModal';
import PopupMessage from '../components/PopupMessage';

export default function Wallet() {
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshWallet, walletBalance } = useWallet();
  
  // Verificar se veio de um desafio que precisa de pagamento ou criação de desafio
  const challengeId = searchParams.get('challengeId');
  const challengeAmount = searchParams.get('amount') ? parseFloat(searchParams.get('amount')) : null;
  const createChallenge = searchParams.get('createChallenge') === 'true';
  const [pendingChallenge, setPendingChallenge] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdChallengeId, setCreatedChallengeId] = useState(null);
  const [invitedCount, setInvitedCount] = useState(0);
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);
  const [pendingPaymentAction, setPendingPaymentAction] = useState(null); // 'create' ou 'pay'
  const [popup,setPopup] = useState({open:false,title:'',messages:[],type:'info'});

  const showPopup = (t, m, type = 'info') => setPopup({ open: true, title: t, messages: Array.isArray(m) ? m : [m], type });

  const fetchData = async () => {
    try {
      setError(null);
      const [walletRes, txRes] = await Promise.all([
        api.get('/api/wallet'),
        api.get('/api/wallet/transactions')
      ]);
      setWallet(walletRes.data);
      setTransactions(txRes.data || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Erro ao carregar carteira');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Verificar se há um desafio pendente para criar
    if (createChallenge) {
      const stored = sessionStorage.getItem('pendingChallenge');
      if (stored) {
        try {
          setPendingChallenge(JSON.parse(stored));
        } catch (e) {
          console.error('Erro ao carregar desafio pendente:', e);
        }
      }
    }
  }, [createChallenge]);

  // Auto abrir modal se já houver saldo suficiente ao chegar na carteira
  useEffect(() => {
    if (!challengeAmount || walletBalance === null) return;
    if (challengeId && walletBalance >= challengeAmount) {
      setPendingPaymentAction('pay');
      setShowPaymentConfirmModal(true);
    } else if (createChallenge && pendingChallenge && walletBalance >= challengeAmount) {
      setPendingPaymentAction('create');
      setShowPaymentConfirmModal(true);
    }
  }, [challengeId, createChallenge, pendingChallenge, challengeAmount, walletBalance]);

  const doDeposit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showPopup('Valor inválido','Informe um valor positivo.', 'warning')
      return;
    }
    if (amountNum > 10000) {
      showPopup('Valor excede limite','Máximo R$ 10.000,00.', 'warning')
      return;
    }
    try {
      await api.post('/api/wallet/deposit', { amount: amountNum });
      setSuccess('Depósito realizado com sucesso!');
      setDepositAmount('');
      await refreshWallet();
      fetchData();
      
      // Se veio de criação de desafio ou pagamento de desafio e agora tem saldo suficiente
      const newBalance = (walletBalance || 0) + amountNum;
      if (challengeAmount && newBalance >= challengeAmount) {
        setTimeout(() => {
          if (createChallenge && pendingChallenge) {
            // Se está criando desafio, mostrar modal customizado
            setPendingPaymentAction('create');
            setShowPaymentConfirmModal(true);
          } else if (challengeId) {
            // Se está pagando desafio existente, mostrar modal customizado
            setPendingPaymentAction('pay');
            setShowPaymentConfirmModal(true);
          }
        }, 500);
      }
    } catch (e) {
      setError(null)
      showPopup('Erro no depósito', e.response?.data?.message || 'Erro ao depositar', 'error')
    }
  };

  const handlePayChallenge = async () => {
    if (!challengeId) return;
    
    try {
      setError(null);
      setLoading(true);
      await api.post(`/api/challenges/${challengeId}/pay`);
      setSuccess('Pagamento do desafio realizado com sucesso!');
      await refreshWallet();
      fetchData();
      
      // Redirecionar para o desafio após 1.5 segundos
      setTimeout(() => {
        navigate(`/desafio/${challengeId}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao pagar desafio');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAndPayChallenge = async () => {
    if (!pendingChallenge) return;
    
    try {
      setError(null);
      setLoading(true);
      
      // Criar desafio (isso já debita o saldo)
      const response = await api.post('/api/challenges/create', pendingChallenge);
      const createdChallenge = response.data;
      // O endpoint retorna o desafio diretamente, então o ID está em response.data.id
      const challengeId = createdChallenge.id || createdChallenge.challenge?.id || String(createdChallenge.id);
      
      // Limpar desafio pendente
      sessionStorage.removeItem('pendingChallenge');
      setPendingChallenge(null);
      
      await refreshWallet();
      fetchData();
      
      // Enviar convites para os amigos selecionados (staged)
      let successCount = 0;
      if (pendingChallenge.selectedFriendIds && Array.isArray(pendingChallenge.selectedFriendIds) && pendingChallenge.selectedFriendIds.length > 0) {
        // Buscar informações dos amigos selecionados
        try {
          const friendsResponse = await api.get('/api/friends');
          const allFriends = friendsResponse.data || [];
          
          // Enviar convites para cada amigo selecionado
          for (const friendId of pendingChallenge.selectedFriendIds) {
            try {
              await api.post(`/api/challenges/${challengeId}/invite`, { friendId });
              successCount++;
            } catch (inviteErr) {
              console.error(`Erro ao convidar amigo ${friendId}:`, inviteErr);
            }
          }
        } catch (friendsErr) {
          console.error('Erro ao carregar amigos:', friendsErr);
        }
      }
      
      // Mostrar modal de sucesso
      setCreatedChallengeId(challengeId);
      setInvitedCount(successCount);
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Erro ao criar desafio');
      setLoading(false);
    }
  };

  if (loading && !wallet) {
    return <div className="p-6 text-center text-main-white">Carregando...</div>;
  }

  const hasSufficientBalance = challengeAmount && walletBalance !== null && walletBalance >= challengeAmount;
  const needsMoreBalance = challengeAmount && walletBalance !== null && walletBalance < challengeAmount;
  const isCreatingChallenge = createChallenge && pendingChallenge;

  return (
    <>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-main-white">Carteira</h1>
          {(challengeId || isCreatingChallenge) && (
            <button
              onClick={() => {
                if (isCreatingChallenge) {
                  sessionStorage.removeItem('pendingChallenge');
                  navigate('/criar-desafio');
                } else {
                  navigate(`/desafio/${challengeId}`);
                }
              }}
              className="px-4 py-2 bg-transparent border border-white/30 text-main-white rounded-lg hover:bg-white/10 transition-colors"
            >
              ← {isCreatingChallenge ? 'Voltar' : 'Voltar ao Desafio'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-600/20 border border-red-600 text-red-200 p-3 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-neon-green/20 border border-neon-green text-neon-green p-3 rounded-md">
            {success}
          </div>
        )}

        {/* Alerta para pagamento/criação de desafio */}
        {(challengeId || isCreatingChallenge) && challengeAmount && (
          <div className={`p-4 rounded-lg border ${
            hasSufficientBalance 
              ? 'bg-neon-green/10 border-neon-green/30' 
              : 'bg-yellow-600/10 border-yellow-600/30'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-main-white mb-1">
                  {isCreatingChallenge 
                    ? (hasSufficientBalance ? 'Saldo suficiente para criar o desafio!' : 'Saldo insuficiente para criar o desafio')
                    : (hasSufficientBalance ? 'Saldo suficiente para pagar o desafio!' : 'Saldo insuficiente para pagar o desafio')
                  }
                </h3>
                <p className="text-sm text-gray-300">
                  {isCreatingChallenge && pendingChallenge && (
                    <span className="block mb-1">Desafio: <span className="font-semibold">{pendingChallenge.description}</span></span>
                  )}
                  Valor necessário: <span className="font-semibold text-neon-green">R$ {challengeAmount.toFixed(2)}</span>
                  {walletBalance !== null && (
                    <span className="ml-2">
                      | Saldo atual: <span className={`font-semibold ${walletBalance >= challengeAmount ? 'text-neon-green' : 'text-yellow-400'}`}>R$ {walletBalance.toFixed(2)}</span>
                    </span>
                  )}
                </p>
              </div>
              {hasSufficientBalance && (
                <button
                  onClick={isCreatingChallenge ? handleCreateAndPayChallenge : handlePayChallenge}
                  disabled={loading}
                  className="px-6 py-2 bg-neon-green text-black font-semibold rounded-lg hover:bg-neon-green/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processando...' : isCreatingChallenge ? 'Criar e Pagar' : 'Pagar Desafio'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card de Saldo */}
          <div className="md:col-span-1 card-glass p-6 rounded-xl border border-white/10 shadow-lg">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-main-white mb-2">Saldo Atual</h2>
              <p className="text-5xl font-mono text-neon-green">
                R$ {wallet?.balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full bg-neon-green/20 border border-neon-green/30 text-neon-green font-semibold py-2 rounded-md hover:bg-neon-green/30 transition-colors"
              >
                Ver Desafios
              </button>
              {needsMoreBalance && (
                <button
                  onClick={() => {
                    document.getElementById('deposit-input')?.focus();
                    document.getElementById('deposit-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  className="w-full bg-transparent border border-white/30 text-main-white font-semibold py-2 rounded-md hover:bg-white/10 transition-colors"
                >
                  Adicionar Saldo
                </button>
              )}
            </div>
          </div>

          {/* Card de Depósito */}
          <div className="md:col-span-2 card-glass p-6 rounded-xl border border-white/10 shadow-lg">
            <h2 className="text-lg font-semibold text-main-white mb-4">Depositar Saldo</h2>
            <form onSubmit={doDeposit} className="space-y-4">
              <div>
                <label className="block text-sm text-main-white mb-2">Valor a depositar (R$)</label>
                <input
                  id="deposit-input"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000"
                  className="w-full bg-dark-surface border border-white/10 rounded-md p-3 text-main-white focus:outline-none focus:ring-2 focus:ring-neon-green text-lg"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Ex: 75.00"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-neon-green text-dark-bg font-semibold px-6 py-3 rounded-md hover:bg-neon-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processando...' : 'Depositar'}
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmount('')}
                  className="px-4 py-3 bg-transparent border border-white/30 text-main-white rounded-md hover:bg-white/10 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Histórico de Transações */}
        <div className="card-glass p-6 rounded-xl border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-main-white">Histórico de Transações</h2>
            <button
              onClick={fetchData}
              className="text-sm text-gray-400 hover:text-neon-green transition-colors"
            >
              Atualizar
            </button>
          </div>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-main-white/70">Nenhuma transação registrada ainda.</p>
              <p className="text-xs text-gray-500 mt-2">As transações aparecerão aqui após você fazer depósitos ou pagamentos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-main-white/70 border-b border-white/10">
                    <th className="text-left font-medium pb-3">Data</th>
                    <th className="text-left font-medium pb-3">Tipo</th>
                    <th className="text-left font-medium pb-3">Descrição</th>
                    <th className="text-left font-medium pb-3">Valor</th>
                    <th className="text-left font-medium pb-3">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => {
                    const isDeposit = tx.type === 'WALLET_DEPOSIT' || tx.type === 'DEPOSIT'
                    const isRefund = isDeposit && /reembolso/i.test(tx.description || '')
                    return (
                    <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 text-main-white/80">
                        {new Date(tx.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          isRefund
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : isDeposit
                              ? 'bg-neon-green/20 text-neon-green'
                              : 'bg-red-500/20 text-red-400'
                        }`}>
                          {isRefund ? 'Reembolso' : isDeposit ? 'Depósito' : 'Débito'}
                        </span>
                      </td>
                      <td className="py-3 text-main-white/80">{tx.description || '-'}</td>
                      <td className={`py-3 font-mono font-semibold ${
                        isRefund
                          ? 'text-yellow-400'
                          : isDeposit 
                            ? 'text-neon-green' 
                            : 'text-red-400'
                      }`}>
                        {isDeposit ? '+' : '-'}R$ {tx.amount.toFixed(2)}
                      </td>
                      <td className="py-3 font-mono text-main-white/60">
                        R$ {tx.balance?.toFixed(2) || '0.00'}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Confirmação de Pagamento */}
        <PaymentConfirmationModal
          isOpen={showPaymentConfirmModal}
          onClose={() => {
            setShowPaymentConfirmModal(false);
            setPendingPaymentAction(null);
          }}
          onConfirm={() => {
            if (pendingPaymentAction === 'create') {
              handleCreateAndPayChallenge();
            } else if (pendingPaymentAction === 'pay') {
              handlePayChallenge();
            }
          }}
          title="Saldo Suficiente!"
          message={
            pendingPaymentAction === 'create'
              ? `Você agora tem saldo suficiente! Deseja criar e pagar o desafio de R$ ${challengeAmount?.toFixed(2) || '0.00'}?`
              : `Você agora tem saldo suficiente! Deseja pagar o desafio de R$ ${challengeAmount?.toFixed(2) || '0.00'}?`
          }
          confirmText={pendingPaymentAction === 'create' ? 'Criar e Pagar' : 'Pagar Desafio'}
          cancelText="Cancelar"
        />

        {/* Modal de Sucesso */}
        <ChallengeSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedChallengeId(null);
            setInvitedCount(0);
          }}
          challengeId={createdChallengeId}
          invitedCount={invitedCount}
        />
      </div>
      <PopupMessage open={popup.open} title={popup.title} messages={popup.messages} type={popup.type} onClose={()=>setPopup(p=>({...p,open:false}))}/>
    </>
  );
}
