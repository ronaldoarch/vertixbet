import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Game() {
  const { gameCode } = useParams<{ gameCode: string }>();
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aguardar o AuthContext terminar de carregar
    if (authLoading) {
      return;
    }

    // Debug: verificar estado de autenticação
    console.log('Game - Auth state:', { token: !!token, user: !!user, authLoading });

    if (!token || !user) {
      console.log('Game - Usuário não autenticado, redirecionando...');
      setError('Você precisa estar logado para jogar');
      setLoading(false);
      return;
    }

    if (!gameCode) {
      setError('Código do jogo não encontrado');
      setLoading(false);
      return;
    }

    const launchGame = async () => {
      try {
        console.log('Game - Iniciando jogo:', { gameCode, token: token?.substring(0, 20) + '...' });
        const res = await fetch(`${API_URL}/api/public/games/${gameCode}/launch?lang=pt`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Game - Resposta do servidor:', { status: res.status, ok: res.ok });

        if (!res.ok) {
          const data = await res.json().catch(() => ({ detail: 'Erro ao iniciar jogo' }));
          console.error('Game - Erro na resposta:', data);
          throw new Error(data.detail || 'Erro ao iniciar jogo');
        }

        const data = await res.json();
        console.log('Game - Dados recebidos:', { hasGameUrl: !!data.game_url, hasLaunchUrl: !!data.launch_url });
        setGameUrl(data.game_url || data.launch_url);
      } catch (err: any) {
        console.error('Game - Erro ao carregar jogo:', err);
        setError(err.message || 'Erro ao carregar jogo');
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
      {/* Header com botão voltar */}
      <div className="bg-[#0a4d3e] border-b border-[#0d5d4b] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white hover:text-[#d4af37] transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Voltar</span>
          </button>
        </div>
      </div>

      {/* Iframe do jogo */}
      {gameUrl && (
        <div className="w-full h-[calc(100vh-60px)]">
          <iframe
            src={gameUrl}
            className="w-full h-full border-0"
            title="Jogo"
            allow="fullscreen; autoplay; payment; geolocation"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
