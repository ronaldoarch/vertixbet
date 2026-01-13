import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './HeroBanner.css';
import { getBrandAssets } from '../utils/themeManager';

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [mounted, setMounted] = useState(false);
  const brand = getBrandAssets();

  const banners = [
    {
      title: 'SAQUES ILIMITADOS',
      subtitle: 'QUANTAS VEZES QUISER NO DIA!',
      cta: 'CADASTRE-SE',
      bgGradient: 'from-[#0a0e0f] via-[#0a1a1a] to-[#0a0e0f]',
      banner: brand.banner
    }
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  return (
    <div
      className={`relative w-full h-[400px] sm:h-[450px] md:h-[500px] lg:h-[550px] overflow-hidden bg-gradient-to-br from-[#0a0e0f] via-[#0d1a1a] to-[#0a0e0f] ${brand.banner ? 'fv-hero-banner' : ''}`}
      style={brand.banner ? { backgroundImage: `url(${brand.banner})` } : undefined}
    >
      {/* Overlay gradiente para profundidade */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e0f]/80 via-transparent to-[#0a0e0f]/40 z-0"></div>

      <div className="relative container mx-auto px-4 h-full flex items-center z-10">
        <div className="grid grid-cols-1 items-center w-full">
          <div className="text-center md:text-left z-10 max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#ffd700] to-[#d4af37] mb-3 md:mb-4 drop-shadow-2xl animate-gradient">
              {banners[currentSlide].title}
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 md:mb-8 font-medium leading-relaxed">
              {banners[currentSlide].subtitle}
            </p>
            <button className="group relative bg-gradient-to-r from-[#d4af37] to-[#ffd700] text-black px-6 md:px-8 py-3 md:py-4 rounded-xl text-sm md:text-base font-black hover:from-[#ffd700] hover:to-[#d4af37] transition-all duration-300 shadow-2xl shadow-[#d4af37]/30 hover:shadow-[#d4af37]/50 hover:scale-105 transform">
              <span className="relative z-10">{banners[currentSlide].cta}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#ffd700] to-[#d4af37] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
