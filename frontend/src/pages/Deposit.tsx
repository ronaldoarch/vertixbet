import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Copy, Check, Loader2, QrCode, AlertCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Deposit() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [amount, setAmount] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponBonus, setCouponBonus] = useState<number | null>(null);
  const [couponError, setCouponError] = useState('');
  const [minDeposit, setMinDeposit] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deposit, setDeposit] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/public/minimums`)
      .then((res) => res.ok ? res.json() : ({} as Record<string, unknown>))
      .then((data: { min_deposit?: number }) => {
        if (typeof data.min_deposit === 'number' && data.min_deposit > 0) {
          setMinDeposit(data.min_deposit);
        }
      })
      .catch(() => {});
  }, []);

  const validateCoupon = () => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!couponCode.trim() || isNaN(value) || value < minDeposit) {
      setCouponBonus(null);
      setCouponError('');
      return;
    }
    setCouponError('');
    fetch(`${API_URL}/api/public/payments/validate-coupon?code=${encodeURIComponent(couponCode.trim())}&amount=${value}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid && data.bonus_amount > 0) {
          setCouponBonus(data.bonus_amount);
          setCouponError('');
        } else {
          setCouponBonus(null);
          setCouponError(data.message || 'Cupom inválido');
        }
      })
      .catch(() => {
        setCouponBonus(null);
        setCouponError('Erro ao validar cupom');
      });
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDeposit(null);

    if (!token || !user) {
      setError('Você precisa estar logado para depositar');
      return;
    }

    const value = parseFloat(amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setError('Valor inválido. Digite um valor maior que zero.');
      return;
    }

    if (value < minDeposit) {
      setError(`Valor mínimo de depósito é R$ ${minDeposit.toFixed(2).replace('.', ',')}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/public/payments/deposit/pix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: value,
          payer_name: user.username || user.email,
          payer_tax_id: user.cpf || '',
          payer_email: user.email,
          payer_phone: user.phone || undefined,
          coupon_code: couponCode.trim() || undefined
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Erro ao gerar PIX' }));
        // Tratar erros de validação (422) que podem ter formato diferente
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            // FastAPI retorna array de erros de validação
            const errors = data.detail.map((err: any) => err.msg || err.message || JSON.stringify(err)).join(', ');
            throw new Error(errors);
          } else if (typeof data.detail === 'string') {
            throw new Error(data.detail);
          } else {
            throw new Error(JSON.stringify(data.detail));
          }
        }
        throw new Error('Erro ao gerar código PIX');
      }

      const data = await response.json();
      setDeposit(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao processar depósito. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const copyPixCode = () => {
    if (deposit?.metadata_json) {
      try {
        const metadata = JSON.parse(deposit.metadata_json);
        const pixCode = metadata.pix_code;
        if (pixCode) {
          navigator.clipboard.writeText(pixCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (e) {
        console.error('Erro ao copiar código PIX:', e);
      }
    }
  };

  const getPixCode = () => {
    if (deposit?.metadata_json) {
      try {
        const metadata = JSON.parse(deposit.metadata_json);
        return metadata.pix_code || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  };

  const getPixQrCode = () => {
    if (deposit?.metadata_json) {
      try {
        const metadata = JSON.parse(deposit.metadata_json);
        return metadata.pix_qr_code_base64 || '';
      } catch (e) {
        return '';
      }
    }
    return '';
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
            <h1 className="text-xl md:text-2xl font-bold">Depositar</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {!deposit ? (
          <form onSubmit={handleDeposit} className="space-y-6">
            {/* Informações */}
            <div className="bg-gradient-to-br from-[#0a4d3e] to-[#0d5d4b] rounded-2xl p-6 border border-[#d4af37]/20">
              <h2 className="text-xl font-bold mb-4">Depósito via PIX</h2>
              <p className="text-gray-300 text-sm mb-4">
                Digite o valor que deseja depositar. O código PIX será gerado automaticamente.
              </p>
              <p className="text-yellow-400 text-sm">
                ⚠️ Valor mínimo: R$ {minDeposit.toFixed(2).replace('.', ',')}
              </p>
            </div>

            {/* Formulário */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Valor do Depósito (R$)
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
                    Cupom (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponBonus(null);
                        setCouponError('');
                      }}
                      onBlur={validateCoupon}
                      placeholder="Ex: BEMVINDO10"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-[#d4af37] focus:outline-none"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={validateCoupon}
                      disabled={loading || !amount || !couponCode.trim()}
                      className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg font-medium"
                    >
                      Validar
                    </button>
                  </div>
                  {couponBonus != null && couponBonus > 0 && (
                    <p className="mt-2 text-sm text-green-400">
                      Cupom válido! Bônus: R$ {couponBonus.toFixed(2).replace('.', ',')}
                    </p>
                  )}
                  {couponError && (
                    <p className="mt-2 text-sm text-red-400">{couponError}</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !amount}
                  className="w-full bg-[#ff6b35] hover:bg-[#ff7b35] disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Gerando código PIX...
                    </>
                  ) : (
                    'Gerar Código PIX'
                  )}
                </button>
              </div>
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
                  <h2 className="text-xl font-bold">Código PIX Gerado!</h2>
                  <p className="text-gray-300 text-sm">Escaneie o QR Code ou copie o código PIX</p>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400 mb-1">Valor a pagar:</p>
                <p className="text-2xl font-bold text-[#d4af37]">
                  R$ {deposit.amount.toFixed(2).replace('.', ',')}
                </p>
                {(() => {
                  try {
                    const meta = deposit.metadata_json ? JSON.parse(deposit.metadata_json) : {};
                    const bonus = meta.bonus_amount;
                    if (bonus && bonus > 0) {
                      return (
                        <p className="text-sm text-green-400">
                          + Bônus do cupom: R$ {Number(bonus).toFixed(2).replace('.', ',')} (creditado após confirmação do pagamento)
                        </p>
                      );
                    }
                  } catch (_) {}
                  return null;
                })()}
              </div>
            </div>

            {/* QR Code */}
            {getPixQrCode() && (
              <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 text-center">
                <h3 className="text-lg font-bold mb-4 flex items-center justify-center gap-2">
                  <QrCode size={20} className="text-[#d4af37]" />
                  QR Code PIX
                </h3>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img
                    src={`data:image/png;base64,${getPixQrCode()}`}
                    alt="QR Code PIX"
                    className="w-64 h-64 mx-auto"
                  />
                </div>
              </div>
            )}

            {/* Código PIX */}
            <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
              <h3 className="text-lg font-bold mb-4">Código PIX (Copiar e Colar)</h3>
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-300 break-all font-mono">
                  {getPixCode()}
                </p>
              </div>
              <button
                onClick={copyPixCode}
                className="w-full bg-[#d4af37] hover:bg-[#ffd700] text-black font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={20} />
                    Código Copiado!
                  </>
                ) : (
                  <>
                    <Copy size={20} />
                    Copiar Código PIX
                  </>
                )}
              </button>
            </div>

            {/* Instruções */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-3">Como pagar:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                <li>Abra o app do seu banco</li>
                <li>Escolha a opção PIX</li>
                <li>Escaneie o QR Code ou cole o código PIX</li>
                <li>Confirme o pagamento</li>
                <li>Seu saldo será creditado automaticamente após confirmação</li>
              </ol>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeposit(null);
                  setAmount('');
                  setError('');
                }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Novo Depósito
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
