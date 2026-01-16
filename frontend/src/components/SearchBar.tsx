import { Search, ChevronDown } from 'lucide-react';

export default function SearchBar() {
  return (
    <div className="w-full bg-gradient-to-b from-[#0a0e0f] to-[#0d1415] py-4 md:py-5 px-3 md:px-4 border-y border-gray-800/50">
      <div className="container mx-auto">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Pesquise um jogo..."
              className="w-full bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl px-4 md:px-5 py-3 md:py-3.5 pr-11 md:pr-12 text-white placeholder-gray-400 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all duration-200"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          </div>
          <button className="bg-gray-800/80 backdrop-blur-sm border border-gray-700/50 rounded-xl px-4 md:px-5 py-3 md:py-3.5 text-white flex items-center justify-between sm:justify-center gap-2 hover:bg-gray-700/80 hover:border-gray-600 transition-all duration-200 text-sm md:text-base whitespace-nowrap hover:scale-105">
            <span>Q Provedor</span>
            <ChevronDown size={18} className="md:w-5 md:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
