import { useEffect, useState, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
import { API_URL } from '../utils/api';

// Intervalo de atualização de saldo na página do jogo (evita re-renders que podem afetar a sessão)
const BALANCE_POLL_INTERVAL_MS = 30000; // 30 segundos

export default function Game() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const { user, token, loading: authLoading, refreshUser } = useAuth();
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const launchCalledRef = useRef(false);
  const refreshUserRef = useRef(refreshUser);
  refreshUserRef.current = refreshUser;

  useEffect(() => {
    if (authLoading) return;
    if (!token || !user) {
      setError('Você precisa estar logado para jogar');
      setLoading(false);
      return;
    }
    const totalBalance = (user.balance ?? 0) + (user.bonus_balance ?? 0);
    if (totalBalance <= 0) {
      setError('Você precisa ter saldo para jogar. Faça um depósito primeiro.');
      setLoading(false);
      return;
    }
    if (!gameCode) {
      setError('Código do jogo não encontrado');
      setLoading(false);
      return;
    }
    if (launchCalledRef.current) return;
    launchCalledRef.current = true;

    const launchGame = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/games/${gameCode}/launch?lang=pt`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ detail: 'Erro ao iniciar jogo' }));
          throw new Error(data.detail || 'Erro ao iniciar jogo');
        }
        const data = await res.json();
        setGameUrl(data.game_url || data.launch_url);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar jogo');
        launchCalledRef.current = false;
      } finally {
        setLoading(false);
      }
    };
    launchGame();
  }, [gameCode, token, user, authLoading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e0f] text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-[#d4af37] mx-auto mb-4" />
          <p className="text-lg">Carregando jogo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0e0f] text-white">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[#d4af37] hover:text-[#ffd700] mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 flex items-start gap-4">
            <AlertCircle className="text-red-400 flex-shrink-0 mt-1" size={24} />
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Erro ao carregar jogo</h2>
              <p className="text-red-200">{error}</p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-4 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] rounded-lg transition-colors"
              >
                Voltar para Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e0f] text-white">
      {/* Header com botão voltar e aviso de sessão */}
      <div className="bg-[#0a4d3e] border-b border-[#0d5d4b] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white hover:text-[#d4af37] transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Voltar</span>
            </button>
            <p className="text-xs text-[#d4af37]/90 max-w-md">
              Evite atualizar a página ou abrir o jogo em outra aba durante a partida; isso pode encerrar sua sessão.
            </p>
          </div>
        </div>
      </div>

      {/* Iframe do jogo - estável: não re-renderiza para não afetar a sessão */}
      {gameUrl && (
        <GameIframeWrapper
          gameUrl={gameUrl}
          token={token}
          onBalanceUpdateRef={refreshUserRef}
        />
      )}
    </div>
  );
}

// Wrapper memoizado: evita re-renders que possam afetar a sessão do jogo
const GameIframeWrapper = memo(function GameIframeWrapper({ 
  gameUrl, 
  token, 
  onBalanceUpdateRef,
}: {
  gameUrl: string;
  token: string | null;
  onBalanceUpdateRef: React.MutableRefObject<() => void | Promise<void>>;
}) {
  useEffect(() => {
    if (!token) return;

    // Atualizar saldo quando a página recebe foco (usuário volta da aba do jogo)
    const handleFocus = () => {
      onBalanceUpdateRef.current?.();
    };
    window.addEventListener('focus', handleFocus);

    // Atualizar saldo quando a página fica visível novamente
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        onBalanceUpdateRef.current?.();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Atualizar saldo a cada 30s (intervalo maior para não afetar a sessão do jogo)
    const balanceInterval = setInterval(() => {
      onBalanceUpdateRef.current?.();
    }, BALANCE_POLL_INTERVAL_MS);

    return () => {
      clearInterval(balanceInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, onBalanceUpdateRef]);

  return (
    <div className="w-full h-[calc(100vh-60px)]">
      <iframe
        src={gameUrl}
        className="w-full h-full border-0"
        title="Jogo"
        allow="fullscreen; autoplay; payment; geolocation"
        allowFullScreen
      />
    </div>
  );
});
