import { MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function ChatWidget() {
  const [supportPhone, setSupportPhone] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupportPhone = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/site-settings/support_phone`);
        if (res.ok) {
          const data = await res.json();
          if (data.value) {
            setSupportPhone(data.value);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar número de suporte:', err);
      }
    };
    fetchSupportPhone();
  }, []);

  const handleClick = () => {
    if (supportPhone) {
      // Formatar número para WhatsApp (remover caracteres não numéricos)
      const phoneNumber = supportPhone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}`, '_blank');
    } else {
      // Se não houver número configurado, apenas mostrar mensagem
      alert('Número de suporte não configurado. Entre em contato através do email de suporte.');
    }
  };

  return (
    <div className="fixed bottom-16 md:bottom-20 right-2 md:right-4 z-40">
      <button
        onClick={handleClick}
        className="bg-green-500 text-white px-3 py-2.5 md:px-4 md:py-3 rounded-lg shadow-lg hover:bg-green-600 transition-colors flex items-center gap-2"
        aria-label="Abrir chat"
      >
        <MessageCircle size={18} className="md:w-5 md:h-5" />
        <span className="text-xs md:text-sm font-medium hidden lg:block">
          Bem Vindo a VertixBet, em que posso ajudar?
        </span>
        <span className="text-xs md:text-sm font-medium lg:hidden">Chat</span>
      </button>
    </div>
  );
}
