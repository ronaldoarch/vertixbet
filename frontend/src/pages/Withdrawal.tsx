import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Loader2, AlertCircle, Check } from 'lucide-react';
import { API_URL } from '../utils/api';

export default function Withdrawal() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [amount, setAmount] = useState('');
  const [minWithdrawal, setMinWithdrawal] = useState(10);
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<'document' | 'email' | 'phoneNumber' | 'randomKey'>('document');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [withdrawal, setWithdrawal] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/public/minimums`)
      .then((res) => res.ok ? res.json() : ({} as Record<string, unknown>))
      .then((data: { min_withdrawal?: number }) => {
        if (typeof data.min_withdrawal === 'number' && data.min_withdrawal > 0) {
          setMinWithdrawal(data.min_withdrawal);
        }
      })
      .catch(() => {});
  }, []);

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setWithdrawal(null);

    if (!token || !user) {
      setError('Você precisa estar logado para sacar');
      return;
    }

    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setError('Valor inválido. Digite um valor maior que zero.');
      return;
    }

    if (value < minWithdrawal) {
      setError(`Valor mínimo de saque é R$ ${minWithdrawal.toFixed(2).replace('.', ',')}`);
      return;
    }

    if ((user.balance ?? 0) < value) {
      setError('Saldo sacável insuficiente. Bônus não pode ser sacado.');
      return;
    }

    if (!pixKey.trim()) {
      setError('Digite a chave PIX de destino.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/public/payments/withdrawal/pix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: value,
          pix_key: (pixKeyType === 'document' || pixKeyType === 'phoneNumber')
            ? pixKey.trim().replace(/\D/g, '')
            : pixKey.trim(),
          pix_key_type: pixKeyType,
          document_validation: undefined
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Erro ao processar saque' }));
        throw new Error(data.detail || 'Erro ao processar saque');
      }

      const data = await response.json();
      setWithdrawal(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar saque. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-xl md:text-2xl font-bold">Sacar</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {!success ? (
          <form onSubmit={handleWithdrawal} className="space-y-6">
            {/* Informações */}
            <div className="bg-gradient-to-br from-[#0a4d3e] to-[#0d5d4b] rounded-2xl p-6 border border-[#d4af37]/20">
              <h2 className="text-xl font-bold mb-4">Saque via PIX</h2>
              <p className="text-gray-300 text-sm mb-4">
                Digite o valor e a sua chave PIX de destino. Você pode usar CPF, CNPJ, e-mail, celular ou chave aleatória. O saque será processado automaticamente.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-yellow-400">⚠️ Valor mínimo: R$ {minWithdrawal.toFixed(2).replace('.', ',')}</p>
                <p className="text-white">💰 Saldo sacável: R$ {(user?.balance ?? 0).toFixed(2).replace('.', ',')}</p>
                {(user?.bonus_balance ?? 0) > 0 && (
                  <p className="text-gray-400 text-xs">Bônus (R$ {(user?.bonus_balance ?? 0).toFixed(2).replace('.', ',')}) só pode ser usado nos jogos.</p>
                )}
              </div>
            </div>

            {/* Formulário */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Valor do Saque (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9,]/g, '');
                    setAmount(value);
                  }}
                  placeholder="0,00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-xl font-semibold focus:border-[#d4af37] focus:outline-none"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Tipo da sua Chave PIX
                </label>
                <select
                  value={pixKeyType}
                  onChange={(e) => {
                    setPixKeyType(e.target.value as typeof pixKeyType);
                    setPixKey('');
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-[#d4af37] focus:outline-none"
                  disabled={loading}
                >
                  <option value="document">CPF ou CNPJ</option>
                  <option value="email">E-mail</option>
                  <option value="phoneNumber">Celular</option>
                  <option value="randomKey">Chave Aleatória</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  {pixKeyType === 'document' && 'Digite seu CPF ou CNPJ'}
                  {pixKeyType === 'email' && 'Digite seu E-mail'}
                  {pixKeyType === 'phoneNumber' && 'Digite seu Celular (DDD + Número)'}
                  {pixKeyType === 'randomKey' && 'Digite sua Chave Aleatória'}
                </label>
                <input
                  type={pixKeyType === 'email' ? 'email' : 'text'}
                  inputMode={pixKeyType === 'phoneNumber' ? 'numeric' : undefined}
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder={
                    pixKeyType === 'document' ? '000.000.000-00' :
                    pixKeyType === 'email' ? 'seu@email.com' :
                    pixKeyType === 'phoneNumber' ? '11999999999' :
                    'Sua chave aleatória PIX'
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-[#d4af37] focus:outline-none"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  O valor será enviado para esta chave PIX
                </p>
              </div>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !amount || !pixKey}
                className="w-full bg-[#d4af37] hover:bg-[#ffd700] disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Processando saque...
                  </>
                ) : (
                  'Confirmar Saque'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Sucesso */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-500/20 p-2 rounded-lg">
                  <Check className="text-green-400" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Saque Solicitado!</h2>
                  <p className="text-gray-300 text-sm">Seu saque está sendo processado</p>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                <div>
                  <p className="text-sm text-gray-400">Valor do saque:</p>
                  <p className="text-2xl font-bold text-[#d4af37]">
                    R$ {withdrawal?.amount.toFixed(2).replace('.', ',')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status:</p>
                  <p className="text-lg font-semibold text-yellow-400">
                    {withdrawal?.status === 'PENDING' ? 'Pendente' : withdrawal?.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Informações */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-3">Informações:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• O saque será processado em até 24 horas</li>
                <li>• Você receberá uma notificação quando o saque for concluído</li>
                <li>• O valor foi bloqueado da sua conta</li>
                <li>• Em caso de cancelamento, o valor será revertido automaticamente</li>
              </ul>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSuccess(false);
                  setAmount('');
                  setPixKey('');
                  setError('');
                  setWithdrawal(null);
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Novo Saque
              </button>
              <button
                onClick={() => navigate('/conta')}
                className="flex-1 bg-[#0a4d3e] hover:bg-[#0d5d4b] text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Voltar para Conta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
