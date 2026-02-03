import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, RefreshCw, Loader2, Trophy, X } from 'lucide-react';
import { API_URL } from '../utils/api';

export default function Bets() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchBets();
  }, [token, navigate]);

  const fetchBets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/public/payments/my-bets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar apostas');
      const data = await res.json();
      setBets(data || []);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar apostas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'WON':
        return 'text-green-400';
      case 'LOST':
        return 'text-red-400';
      case 'PENDING':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'WON':
        return 'Ganhou';
      case 'LOST':
        return 'Perdeu';
      case 'PENDING':
        return 'Pendente';
      default:
        return status || 'Desconhecido';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'WON':
        return <Trophy className="text-green-400" size={20} />;
      case 'LOST':
        return <X className="text-red-400" size={20} />;
      default:
        return null;
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
              <h1 className="text-xl md:text-2xl font-bold">Minhas Apostas</h1>
            </div>
            <button
              onClick={fetchBets}
              disabled={loading}
              className="p-2 hover:bg-[#0d5d4b] rounded transition-colors disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {loading && bets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#d4af37]" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        ) : bets.length === 0 ? (
          <div className="bg-gray-900 rounded-2xl p-8 text-center border border-gray-800">
            <p className="text-gray-400">Nenhuma aposta encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(bet.status)}
                      <p className="font-semibold">{bet.game_name || bet.game_id || 'Jogo'}</p>
                      {bet.provider && (
                        <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                          {bet.provider}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      {new Date(bet.created_at).toLocaleString('pt-BR')}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Aposta: </span>
                        <span className="text-red-400 font-semibold">
                          R$ {bet.amount.toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                      {bet.win_amount > 0 && (
                        <div>
                          <span className="text-gray-400">Ganho: </span>
                          <span className="text-green-400 font-semibold">
                            R$ {bet.win_amount.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${getStatusColor(bet.status)}`}>
                      {getStatusLabel(bet.status)}
                    </p>
                    {bet.win_amount > 0 && bet.status === 'WON' && (
                      <p className="text-xs text-green-400 mt-1">
                        +R$ {(bet.win_amount - bet.amount).toFixed(2).replace('.', ',')}
                      </p>
                    )}
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
