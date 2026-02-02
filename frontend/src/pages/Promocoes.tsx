import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Promotion {
  id: number;
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  display_order: number;
  is_active: boolean;
  valid_from?: string;
  valid_until?: string;
}

export default function Promocoes() {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/public/promotions`)
      .then((res) => res.ok ? res.json() : [])
      .then((data) => setPromotions(data))
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePromoClick = (p: Promotion) => {
    if (p.link_url) {
      if (p.link_url.startsWith('http')) {
        window.open(p.link_url, '_blank');
      } else {
        navigate(p.link_url);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e0f] text-white">
      {/* Header */}
      <div className="bg-[#0a4d3e] border-b border-[#0d5d4b] sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-[#0d5d4b] rounded transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Gift size={24} className="text-[#d4af37]" />
              Promoções
            </h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <p className="text-gray-400 text-sm mb-6">
          Confira nossas promoções exclusivas e aproveite!
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-800/50 rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <div className="bg-gradient-to-br from-[#0a4d3e] to-[#0d5d4b] rounded-2xl p-12 text-center border border-[#d4af37]/20">
            <Gift size={48} className="mx-auto text-[#d4af37]/60 mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhuma promoção no momento</h2>
            <p className="text-gray-300 text-sm">
              Volte em breve para conferir nossas ofertas especiais!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {promotions.map((p) => (
              <div
                key={p.id}
                onClick={() => handlePromoClick(p)}
                className={`bg-gradient-to-br from-[#0a4d3e] to-[#0d5d4b] rounded-2xl overflow-hidden border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all ${
                  p.link_url ? 'cursor-pointer hover:scale-[1.02]' : ''
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  {p.image_url ? (
                    <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-gray-900/50">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="sm:w-48 h-32 sm:h-auto flex-shrink-0 bg-[#d4af37]/10 flex items-center justify-center">
                      <Gift size={48} className="text-[#d4af37]/60" />
                    </div>
                  )}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-bold text-white">{p.title}</h3>
                      {p.link_url && (
                        <ExternalLink size={18} className="text-[#d4af37] flex-shrink-0" />
                      )}
                    </div>
                    {p.description && (
                      <p className="text-gray-300 text-sm mt-2 line-clamp-2">{p.description}</p>
                    )}
                    {p.link_url && (
                      <span className="inline-block mt-3 text-[#d4af37] text-sm font-medium">
                        {p.link_url.startsWith('http') ? 'Abrir link' : 'Ver mais'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
