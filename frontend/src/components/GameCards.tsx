import { useEffect, useState } from 'react';

interface GameCard {
  id: string;
  title: string;
  code?: string;
  banner?: string;
  provider?: string;
  tag?: string;
  tagColor?: string;
}

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Lista de jogos que queremos exibir (com tags e cores)
const featuredGamesConfig = [
  { title: 'Aviator', tag: 'HOT', tagColor: 'red' },
  { title: 'Cachorro Sortudo', tag: 'NEW', tagColor: 'yellow' },
  { title: 'Roleta', tag: undefined, tagColor: undefined },
  { title: 'Fortune Tiger', tag: undefined, tagColor: undefined },
  { title: 'Mine', tag: undefined, tagColor: undefined },
  { title: 'Fortune Snake', tag: undefined, tagColor: undefined },
  { title: 'Spaceman', tag: undefined, tagColor: undefined },
  { title: 'Gate of Olympus', tag: undefined, tagColor: undefined },
  { title: 'Bac Bo', tag: undefined, tagColor: undefined },
  { title: 'Slot Da Sorte', tag: 'HOT', tagColor: 'red' },
  { title: 'Big Bass', tag: undefined, tagColor: undefined },
  { title: 'Sweet Bonanza', tag: undefined, tagColor: undefined },
  { title: 'JetX', tag: undefined, tagColor: undefined },
];

export default function GameCards() {
  const [games, setGames] = useState<GameCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/public/games`);
        if (!res.ok) throw new Error('Falha ao carregar jogos');
        const data = await res.json();
        const allGames: GameCard[] = (data.games || []).map((g: any) => ({
          id: g.code || g.name || '',
          title: g.name || g.title || 'Jogo',
          code: g.code,
          banner: g.banner,
          provider: g.provider,
        }));

        // Filtrar e mapear os jogos destacados
        const featuredGames: GameCard[] = [];
        for (const config of featuredGamesConfig) {
          // Buscar jogo que corresponde ao título (busca parcial, case-insensitive)
          const normalizedConfigTitle = config.title.toLowerCase().trim();
          const matchedGame = allGames.find((g) => {
            const normalizedGameTitle = g.title.toLowerCase().trim();
            return normalizedGameTitle.includes(normalizedConfigTitle) || 
                   normalizedConfigTitle.includes(normalizedGameTitle);
          });

          if (matchedGame) {
            featuredGames.push({
              id: matchedGame.id,
              title: matchedGame.title,
              code: matchedGame.code,
              banner: matchedGame.banner,
              provider: matchedGame.provider,
              tag: config.tag,
              tagColor: config.tagColor,
            });
          }
        }

        setGames(featuredGames);
      } catch (err) {
        console.error('Erro ao buscar jogos', err);
        // Em caso de erro, usar lista estática como fallback
        setGames(featuredGamesConfig.map((config, idx) => ({
          id: String(idx),
          title: config.title,
          tag: config.tag,
          tagColor: config.tagColor,
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const getTagStyles = (color?: string) => {
    switch (color) {
      case 'green':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30';
      case 'red':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30';
      case 'yellow':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black shadow-lg shadow-yellow-400/30';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#0a0e0f] to-[#0d1415] py-8 px-4">
      <div className="container mx-auto">
        <div className="flex gap-5 overflow-x-auto pb-5 scrollbar-hide scroll-smooth">
          {loading ? (
            // Skeleton loading
            Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-shrink-0 w-36 h-36 bg-gray-800/50 rounded-2xl animate-pulse"
              />
            ))
          ) : games.length === 0 ? (
            <div className="text-gray-400 text-sm">Nenhum jogo encontrado</div>
          ) : (
            games.map((game) => {
              const gameCode = game.code || game.id;
              const gameUrl = gameCode ? `/jogo/${gameCode}` : '#';
              
              return (
                <a
                  key={game.id}
                  href={gameUrl}
                  className="flex-shrink-0 w-36 h-36 bg-gradient-to-br from-gray-800/90 via-gray-900/90 to-gray-950/90 backdrop-blur-sm rounded-2xl overflow-hidden cursor-pointer hover:scale-110 hover:-translate-y-2 transition-all duration-300 relative border border-gray-700/50 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/20 group"
                >
                  {/* Banner do jogo */}
                  {game.banner ? (
                    <img
                      src={game.banner}
                      alt={game.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-700/50 to-gray-800/50" />
                  )}
                  
                  {/* Overlay escuro para melhorar legibilidade do texto */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Efeito de brilho no hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/0 to-transparent group-hover:from-[#d4af37]/10 group-hover:to-transparent rounded-2xl transition-all duration-300"></div>
                  
                  {/* Tag */}
                  {game.tag && (
                    <div
                      className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${getTagStyles(
                        game.tagColor
                      )} z-10 animate-pulse shadow-lg`}
                    >
                      {game.tag}
                    </div>
                  )}
                  
                  {/* Título do jogo */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <div className="text-white text-xs font-bold text-center line-clamp-2 leading-tight group-hover:text-[#d4af37] transition-colors duration-300 drop-shadow-lg">
                      {game.title}
                    </div>
                  </div>
                </a>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
