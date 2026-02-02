import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

interface SearchBarProps {
  filters: { query: string; provider: string };
  onFiltersChange: (partial: { query?: string; provider?: string }) => void;
  providers?: string[];
}

export default function SearchBar({ filters, onFiltersChange, providers = [] }: SearchBarProps) {
  const [providerOpen, setProviderOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProviderOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedProviderLabel = filters.provider
    ? providers.find((p) => p.toLowerCase() === filters.provider.toLowerCase()) || filters.provider
    : 'Por Provedor';

  return (
    <div className="w-full bg-gradient-to-b from-[#0a0e0f] to-[#0d1415] py-4 md:py-5 px-3 md:px-4 border-y border-gray-800/50">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Pesquise um jogo..."
              value={filters.query}
              onChange={(e) => onFiltersChange({ query: e.target.value })}
              className="w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl px-4 md:px-5 py-3 md:py-3.5 pr-11 md:pr-12 text-white placeholder-gray-400 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all duration-200"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProviderOpen(!providerOpen)}
              className="w-full sm:w-auto bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl px-4 md:px-5 py-3 md:py-3.5 text-white flex items-center justify-between sm:justify-center gap-2 hover:bg-gray-700/80 hover:border-gray-600 transition-all duration-200 text-sm md:text-base whitespace-nowrap min-w-[140px]"
            >
              <span className="truncate">{selectedProviderLabel}</span>
              <ChevronDown
                size={18}
                className={`md:w-5 md:h-5 flex-shrink-0 transition-transform ${providerOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {providerOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange({ provider: '' });
                    setProviderOpen(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-700/80 transition-colors first:rounded-t-xl ${
                    !filters.provider ? 'text-[#d4af37] font-medium' : 'text-gray-300'
                  }`}
                >
                  Todos os provedores
                </button>
                {providers.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onFiltersChange({ provider: p });
                      setProviderOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-700/80 transition-colors last:rounded-b-xl ${
                      filters.provider?.toLowerCase() === p.toLowerCase() ? 'text-[#d4af37] font-medium' : 'text-gray-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {providers.length === 0 && (
                  <div className="px-4 py-3 text-sm text-gray-500">Carregando provedores...</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
