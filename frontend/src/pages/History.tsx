import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, RefreshCw, Loader2 } from 'lucide-react';
import { API_URL } from '../utils/api';

export default function History() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchTransactions();
  }, [token, navigate]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/public/payments/my-transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar transações');
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
      case 'COMPLETED':
        return 'text-green-400';
      case 'PENDING':
        return 'text-yellow-400';
      case 'CANCELLED':
      case 'REJECTED':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'Aprovado';
      case 'PENDING':
        return 'Pendente';
      case 'CANCELLED':
        return 'Cancelado';
      case 'REJECTED':
        return 'Rejeitado';
      case 'COMPLETED':
        return 'Concluído';
      default:
        return status || 'Desconhecido';
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e0f] text-white">
      {/* Header */}
      <div className="bg-[#0a4d3e] border-b border-[#0d5d4b] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/conta')}
                className="p-2 hover:bg-[#0d5d4b] rounded transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl md:text-2xl font-bold">Histórico de Transações</h1>
            </div>
            <button
              onClick={fetchTransactions}
              disabled={loading}
              className="p-2 hover:bg-[#0d5d4b] rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {loading && transactions.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#d4af37]" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
            <p className="text-gray-400">Nenhuma transação encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={`${tx.type}-${tx.id}`}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {tx.type === 'deposit' ? (
                      <div className="bg-green-500/20 p-2 rounded-lg">
                        <ArrowDownCircle className="text-green-400" size={20} />
                      </div>
                    ) : (
                      <div className="bg-red-500/20 p-2 rounded-lg">
                        <ArrowUpCircle className="text-red-400" size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        {tx.type === 'deposit' ? 'Depósito' : 'Saque'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(tx.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'deposit' ? '+' : '-'}R$ {tx.amount.toFixed(2).replace('.', ',')}
                    </p>
                    <p className={`text-sm ${getStatusColor(tx.status)}`}>
                      {getStatusLabel(tx.status)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
