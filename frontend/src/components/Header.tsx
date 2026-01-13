import { Gift, Menu as MenuIcon } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export default function Header({ onMenuClick, onLoginClick, onRegisterClick }: HeaderProps) {
  return (
    <header className="w-full bg-[#0a4d3e] text-white sticky top-0 z-40 shadow-md">
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
        <div className="flex items-center justify-between">
          {/* Logo e Menu Mobile */}
          <div className="flex items-center gap-2 md:gap-3">
            {onMenuClick && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-1.5 hover:bg-[#0d5d4b] rounded transition-colors"
                aria-label="Abrir menu"
              >
                <MenuIcon size={20} />
              </button>
            )}
            <a href="/" className="flex items-center gap-1 md:gap-2 hover:opacity-80 transition-opacity">
              <div className="fv-logo-img w-10 h-10 md:w-12 md:h-12 rounded bg-center bg-contain bg-no-repeat border border-white/10" />
              <Gift className="text-[#d4af37] w-4 h-4 md:w-5 md:h-5" />
            </a>
          </div>
          
          {/* Navegação CASSINO/ESPORTES - Na mesma linha */}
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="/cassino" 
              className="py-2 px-3 border-b-2 border-[#ff6b35] text-white font-medium text-sm md:text-base hover:text-[#d4af37] transition-colors"
            >
              CASSINO
            </a>
            <a 
              href="/esportes" 
              className="py-2 px-3 border-b-2 border-transparent text-gray-300 font-medium text-sm md:text-base hover:text-[#d4af37] hover:border-[#d4af37] transition-colors"
            >
              ESPORTES
            </a>
          </nav>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={onLoginClick}
              className="px-2 md:px-4 py-1.5 md:py-2 text-sm md:text-base hover:text-[#d4af37] transition-colors font-medium"
            >
              Entrar
            </button>
            <button 
              onClick={onRegisterClick}
              className="px-3 md:px-6 py-1.5 md:py-2 bg-[#ff6b35] rounded-md hover:bg-[#ff7b35] transition-colors font-semibold text-sm md:text-base"
            >
              Registre-se
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
