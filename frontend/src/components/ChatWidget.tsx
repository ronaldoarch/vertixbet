import { MessageCircle } from 'lucide-react';

export default function ChatWidget() {
  return (
    <div className="fixed bottom-16 md:bottom-20 right-2 md:right-4 z-40">
      <button
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
