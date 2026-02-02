import { useEffect, useState, useRef } from 'react';
import { Gift, Menu as MenuIcon, Wallet, User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
import { API_URL } from '../utils/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  created_at: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
  onLoginClick?: () => void;
  onRegisterClick?: () => void;
}

export default function Header({ onMenuClick, onLoginClick, onRegisterClick }: HeaderProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/notifications?limit=10`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Erro ao buscar notificações:', err);
      }
    };
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/media/logo`);
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            // Se a URL já começar com /api, usa direto; senão constrói com API_URL
            const url = data.url.startsWith('/api') 
              ? `${API_URL}${data.url}`
              : `${API_URL}/api/public/media${data.url}`;
            setLogoUrl(url);
          } else {
            setLogoUrl(null);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar logo:', err);
      }
    };
    fetchLogo();
    
    // Polling para atualizar logo (a cada 5 segundos)
    const interval = setInterval(fetchLogo, 5000);
    return () => clearInterval(interval);
  }, []);

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
              {logoUrl ? (
                <img src={logoUrl} alt="VertixBet" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
              ) : (
                <>
                  <div className="text-lg md:text-2xl font-bold tracking-tight">VERTIX</div>
                  <div className="text-base md:text-xl font-semibold hidden sm:block">BET</div>
                </>
              )}
              <Gift className="text-[#d4af37] w-4 h-4 md:w-5 md:h-5" />
            </a>
          </div>
          
          {/* Navegação CASSINO - Na mesma linha */}
          <nav className="hidden md:flex items-center gap-6">
            <a 
              href="/cassino" 
              className="py-2 px-3 border-b-2 border-[#ff6b35] text-white font-medium text-sm md:text-base hover:text-[#d4af37] transition-colors"
            >
              CASSINO
            </a>
          </nav>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Ícone de Notificações */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen((o) => !o)}
                className="p-2 hover:bg-[#0d5d4b] rounded transition-colors relative"
                aria-label="Notificações"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#ff6b35] rounded-full text-[10px] font-bold flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-full mt-1 w-80 max-h-96 overflow-y-auto bg-[#0d1a1a] border border-gray-700 rounded-lg shadow-xl z-50 py-2">
                  {!user ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-gray-300 text-sm mb-3">
                        Você precisa estar logado para ver as notificações.
                      </p>
                      <button
                        onClick={() => {
                          setNotificationsOpen(false);
                          onLoginClick?.();
                        }}
                        className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] rounded font-semibold text-sm"
                      >
                        Entrar
                      </button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="px-4 py-6 text-gray-400 text-sm text-center">
                      Nenhuma notificação
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50 last:border-0"
                        >
                          <p className="font-semibold text-white text-sm">{n.title}</p>
                          <p className="text-gray-400 text-xs mt-0.5">{n.message}</p>
                          {n.link && (
                            <a
                              href={n.link}
                              className="inline-block mt-1 text-xs text-[#d4af37] hover:underline"
                            >
                              Saiba mais →
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {user ? (
              <>
                {/* Saldo */}
                <button
                  onClick={() => navigate('/conta')}
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0d5d4b] hover:bg-[#0f6d5b] rounded-md transition-colors"
                >
                  <Wallet size={18} className="text-[#d4af37]" />
                  <span className="text-sm font-semibold">
                    R$ {user.balance.toFixed(2).replace('.', ',')}
                  </span>
                </button>
                {/* Perfil */}
                <button
                  onClick={() => navigate('/conta')}
                  className="p-2 hover:bg-[#0d5d4b] rounded transition-colors"
                  aria-label="Minha conta"
                >
                  <User size={20} />
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
