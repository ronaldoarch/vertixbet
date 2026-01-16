import { useState } from 'react';
import { X } from 'lucide-react';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-[#ff6b35] text-white py-2 px-3 md:px-4 flex flex-col sm:flex-row items-center justify-between gap-2 relative z-50">
      <p className="text-xs sm:text-sm md:text-base flex-1 text-center sm:text-left">
        Faça o download do nosso aplicativo e tenha a melhor experiência de apostas!
      </p>
      <div className="flex items-center gap-2">
        <button className="bg-white text-[#ff6b35] px-3 md:px-4 py-1 rounded-md text-xs md:text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap">
          Download
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-[#ff7b35] rounded transition-colors"
          aria-label="Fechar banner"
        >
          <X size={16} className="md:w-[18px] md:h-[18px]" />
        </button>
      </div>
    </div>
  );
}
