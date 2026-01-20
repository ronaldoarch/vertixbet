import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, DollarSign, Users, TrendingUp, Copy, Check, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AffiliatePanel() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    fetchAffiliateData();
  }, [token, navigate]);

  const fetchAffiliateData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/affiliate/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError('Você não é um afiliado. Entre em contato com o suporte.');
        } else {
          throw new Error('Erro ao carregar dados do afiliado');
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setAffiliate(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const copyAffiliateLink = () => {
    if (affiliate?.affiliate_code) {
      const link = `${window.location.origin}?ref=${affiliate.affiliate_code}`;
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e0f] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-[#d4af37]" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !affiliate) {
    return (
      <div className="min-h-screen bg-[#0a0e0f] text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6">
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e0f] text-white">
      {/* Header */}
      <div className="bg-[#0a4d3e] border-b border-[#0d5d4b] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/conta')}
              className="p-2 hover:bg-[#0d5d4b] rounded transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl md:text-2xl font-bold">Painel do Afiliado</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Link de Afiliado */}
        <div className="bg-gradient-to-br from-[#0a4d3e] to-[#0d5d4b] rounded-2xl p-6 mb-6 border border-[#d4af37]/20">
          <h2 className="text-xl font-bold mb-4">Seu Link de Afiliado</h2>
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-400 mb-2">Código:</p>
            <p className="text-2xl font-bold text-[#d4af37] mb-4">{affiliate?.affiliate_code}</p>
            <p className="text-sm text-gray-400 mb-2">Link completo:</p>
            <p className="text-sm break-all font-mono">
              {typeof window !== 'undefined' ? `${window.location.origin}?ref=${affiliate?.affiliate_code}` : ''}
            </p>
          </div>
          <button
            onClick={copyAffiliateLink}
            className="w-full bg-[#d4af37] hover:bg-[#ffd700] text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={20} />
                Link Copiado!
              </>
            ) : (
              <>
                <Copy size={20} />
                Copiar Link
              </>
            )}
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-[#d4af37]" size={24} />
              <h3 className="text-sm text-gray-400">Total Ganho</h3>
            </div>
            <p className="text-2xl font-bold">R$ {affiliate?.total_earnings.toFixed(2).replace('.', ',') || '0,00'}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-[#d4af37]" size={24} />
              <h3 className="text-sm text-gray-400">Indicações</h3>
            </div>
            <p className="text-2xl font-bold">{affiliate?.total_referrals || 0}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-400" size={24} />
              <h3 className="text-sm text-gray-400">CPA Ganho</h3>
            </div>
            <p className="text-2xl font-bold">R$ {affiliate?.total_cpa_earned.toFixed(2).replace('.', ',') || '0,00'}</p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="text-blue-400" size={24} />
              <h3 className="text-sm text-gray-400">Revshare Ganho</h3>
            </div>
            <p className="text-2xl font-bold">R$ {affiliate?.total_revshare_earned.toFixed(2).replace('.', ',') || '0,00'}</p>
          </div>
        </div>

        {/* Configurações */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
          <h2 className="text-xl font-bold mb-4">Configurações da Comissão</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400 mb-1">CPA (Cost Per Acquisition)</p>
              <p className="text-2xl font-bold text-[#d4af37]">
                R$ {affiliate?.cpa_amount.toFixed(2).replace('.', ',') || '0,00'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Ganho por cada novo jogador indicado</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Revshare</p>
              <p className="text-2xl font-bold text-[#d4af37]">
                {affiliate?.revshare_percentage.toFixed(2) || '0,00'}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Percentual sobre os depósitos dos indicados</p>
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 mt-6">
          <h2 className="text-xl font-bold mb-4">Informações</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Depositado pelos Indicados:</span>
              <span className="font-semibold">R$ {affiliate?.total_deposits.toFixed(2).replace('.', ',') || '0,00'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-semibold ${affiliate?.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {affiliate?.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
