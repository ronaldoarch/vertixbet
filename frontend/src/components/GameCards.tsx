interface GameCard {
  id: string;
  title: string;
  tag?: string;
  tagColor?: string;
  emoji?: string;
}

export default function GameCards() {
  const games: GameCard[] = [
    { id: '1', title: 'Baixar Aplicativo', tag: 'GRÁTIS', tagColor: 'green' },
    { id: '2', title: 'Cashback de até 25%', tag: 'DEPOSITE', tagColor: 'green' },
    { id: '3', title: 'Esportes Ao Vivo', tag: 'HOT', tagColor: 'red' },
    { id: '4', title: 'Cupom De Bônus', tag: 'GRÁTIS', tagColor: 'green' },
    { id: '5', title: 'Aviator Spribe', tag: 'HOT', tagColor: 'red' },
    { id: '6', title: 'Mundial de Clubes', tag: 'HOT', tagColor: 'red' },
    { id: '7', title: 'NBA USA', tag: 'HOT', tagColor: 'red' },
    { id: '8', title: 'Cachorro Sortudo', tag: 'NEW', tagColor: 'yellow' },
    { id: '9', title: 'Roleta Ao Vivo' },
    { id: '10', title: 'Fortune Tiger' },
    { id: '11', title: 'Mine Spribe' },
    { id: '12', title: 'Fortune Snake' },
    { id: '13', title: 'Spaceman Pragmatic' },
    { id: '14', title: 'Gate of Olympus' },
    { id: '15', title: 'Bac Bo Evolution' },
    { id: '16', title: 'Slot Da Sorte', tag: 'HOT', tagColor: 'red' },
    { id: '17', title: 'Big Bass Pragmatic' },
    { id: '18', title: 'Sweet Bonanza' },
    { id: '19', title: 'JetX SmartSoft' },
  ];

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
          {games.map((game) => (
            <div
              key={game.id}
              className="flex-shrink-0 w-36 h-36 bg-gradient-to-br from-gray-800/90 via-gray-900/90 to-gray-950/90 backdrop-blur-sm rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:scale-110 hover:-translate-y-2 transition-all duration-300 relative border border-gray-700/50 hover:border-[#d4af37]/50 hover:shadow-2xl hover:shadow-[#d4af37]/20 group"
            >
              {/* Efeito de brilho no hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/0 to-[#d4af37]/0 group-hover:from-[#d4af37]/5 group-hover:to-transparent rounded-2xl transition-all duration-300"></div>
              
              {game.tag && (
                <div
                  className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${getTagStyles(
                    game.tagColor
                  )} z-10 animate-pulse`}
                >
                  {game.tag}
                </div>
              )}
              <div className="text-white text-xs font-bold text-center line-clamp-2 leading-tight relative z-10 group-hover:text-[#d4af37] transition-colors duration-300">
                {game.title}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
