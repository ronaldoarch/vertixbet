import { useEffect, useMemo, useState } from 'react';
import './HeroBanner.css';
import { getBrandAssets } from '../utils/themeManager';

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [assets, setAssets] = useState(getBrandAssets());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'fv_brand_assets') {
        setAssets(getBrandAssets());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const slides = useMemo(() => {
    const list = assets.banners?.length ? assets.banners : assets.banner ? [assets.banner] : [];
    return list;
  }, [assets.banners, assets.banner]);

  useEffect(() => {
    if (slides.length > 1) {
      const id = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
      return () => clearInterval(id);
    }
    setCurrentSlide(0);
  }, [slides.length]);

  const heroStyle =
    slides.length > 0
      ? {
          backgroundImage: `url(${slides[currentSlide]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }
      : undefined;

  if (!slides.length) {
    return <div className="relative w-full h-[300px] sm:h-[360px] md:h-[420px] bg-gradient-to-br from-[#0a0e0f] via-[#0d1a1a] to-[#0a0e0f]" />;
  }

  return (
    <div
      className={`relative w-full h-[400px] sm:h-[450px] md:h-[500px] lg:h-[550px] overflow-hidden`}
      style={heroStyle}
    >
      <div className="absolute inset-0 bg-black/20"></div>
      {slides.length > 1 && (
        <>
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all z-20"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % slides.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-3 rounded-full transition-all z-20"
            aria-label="Próximo"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`w-3 h-3 rounded-full ${idx === currentSlide ? 'bg-white' : 'bg-white/50'}`}
                aria-label={`Banner ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
