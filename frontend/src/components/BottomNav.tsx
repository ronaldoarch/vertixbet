import { useState } from 'react';
import { Menu, Wallet, User, MessageCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function BottomNav() {
  const [supportLoading, setSupportLoading] = useState(false);

  const handleSuporte = async () => {
    setSupportLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/public/site-settings/support_phone`);
      if (res.ok) {
        const data = await res.json();
        const phone = data.value?.replace(/\D/g, '');
        if (phone) {
          window.open(`https://wa.me/${phone}`, '_blank');
        } else {
          alert('Suporte não configurado. Configure o número no painel admin.');
        }
      } else {
        alert('Suporte não configurado.');
      }
    } catch {
      alert('Suporte não disponível.');
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a4d3e] text-white border-t border-[#0d5d4b] z-50 md:hidden">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around py-3">
          <a href="/menu" className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors">
            <Menu size={24} />
            <span className="text-xs">Menu</span>
          </a>
          <a href="/depositar" className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors">
            <div className="bg-[#ff6b35] p-2 rounded-lg">
              <Wallet size={20} className="text-white" />
            </div>
            <span className="text-xs">Depositar</span>
          </a>
          <a href="/conta" className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors">
            <User size={24} />
            <span className="text-xs">Conta</span>
          </a>
          <button
            type="button"
            onClick={handleSuporte}
            disabled={supportLoading}
            className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors disabled:opacity-70"
          >
            <MessageCircle size={24} />
            <span className="text-xs">Suporte</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
