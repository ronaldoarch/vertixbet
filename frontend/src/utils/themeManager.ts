export type ThemePalette = {
  id: string;
  name: string;
  bg: string;
  surface: string;
  card: string;
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
};

export type BrandAssets = {
  logo?: string;
  banner?: string;
  banners?: string[];
};

const THEME_LIST_KEY = 'fv_theme_list';
const ACTIVE_THEME_KEY = 'fv_theme_active';
const BRAND_KEY = 'fv_brand_assets';
const THEME_STYLE_ID = 'fv-dynamic-theme-style';
const BRAND_STYLE_ID = 'fv-brand-style';

const defaultTheme: ThemePalette = {
  id: 'default',
  name: 'Padrão Fortune',
  bg: '#0a0e0f',
  surface: '#0d1415',
  card: '#0f1b1d',
  accent: '#d4af37',
  accentSoft: '#0f6f5a',
  text: '#ffffff',
  muted: '#cbd5e1'
};

function ensureStyleEl(id: string) {
  if (typeof document === 'undefined') return null;
  let style = document.getElementById(id) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = id;
    document.head.appendChild(style);
  }
  return style;
}

export function getThemeList(): ThemePalette[] {
  if (typeof localStorage === 'undefined') return [defaultTheme];
  try {
    const raw = localStorage.getItem(THEME_LIST_KEY);
    const list: ThemePalette[] = raw ? JSON.parse(raw) : [];
    if (!list.find((t) => t.id === defaultTheme.id)) {
      return [defaultTheme, ...list];
    }
    return list;
  } catch {
    return [defaultTheme];
  }
}

export function saveThemeList(list: ThemePalette[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(THEME_LIST_KEY, JSON.stringify(list));
}

export function getActiveTheme(): ThemePalette {
  const list = getThemeList();
  if (typeof localStorage === 'undefined') return list[0] || defaultTheme;
  const activeId = localStorage.getItem(ACTIVE_THEME_KEY);
  const found = list.find((t) => t.id === activeId);
  return found || list[0] || defaultTheme;
}

export function setActiveTheme(theme: ThemePalette) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ACTIVE_THEME_KEY, theme.id);
  }
  applyThemeToDocument(theme);
}

export function applyThemeToDocument(theme?: ThemePalette) {
  if (typeof document === 'undefined') return;
  const chosen = theme || getActiveTheme();
  const style = ensureStyleEl(THEME_STYLE_ID);
  if (!style) return;
  style.innerHTML = `
:root {
  --fv-bg: ${chosen.bg};
  --fv-surface: ${chosen.surface};
  --fv-card: ${chosen.card};
  --fv-accent: ${chosen.accent};
  --fv-accent-soft: ${chosen.accentSoft};
  --fv-text: ${chosen.text};
  --fv-muted: ${chosen.muted};
}

body {
  background: var(--fv-bg) !important;
  color: var(--fv-text);
}

header, .bg-[#0a4d3e] {
  background-color: var(--fv-accent-soft) !important;
}

.text-[#d4af37], .border-[#d4af37], .hover\\:text-[#d4af37]:hover {
  color: var(--fv-accent) !important;
  border-color: var(--fv-accent) !important;
}

.bg-gray-900, .bg-gray-800, .bg-[#0a0e0f], .bg-[#0d1415], .bg-[#0f1b1d] {
  background-color: var(--fv-bg) !important;
}

.card-surface, .bg-gray-700, .bg-gray-800\\/60, .bg-gray-800\\/50, .bg-gray-800\\/90, .bg-gray-900\\/90 {
  background-color: var(--fv-card) !important;
}

.text-gray-100, .text-white { color: var(--fv-text) !important; }
.text-gray-400, .text-gray-300 { color: var(--fv-muted) !important; }

.btn-accent {
  background: var(--fv-accent);
  color: #000;
}
`;
}

export function getBrandAssets(): BrandAssets {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(BRAND_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (parsed.banner && !parsed.banners) {
      parsed.banners = [parsed.banner];
    }
    return parsed;
  } catch {
    return {};
  }
}

export function saveBrandAssets(assets: BrandAssets) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(BRAND_KEY, JSON.stringify(assets));
}

export function applyBrandAssets(assets?: BrandAssets) {
  if (typeof document === 'undefined') return;
  const current = assets || getBrandAssets();
  const style = ensureStyleEl(BRAND_STYLE_ID);
  if (!style) return;
  const logoVar = current.logo ? `url(${current.logo})` : 'none';
  const bannerVar = current.banner ? `url(${current.banner})` : 'none';
  style.innerHTML = `
:root {
  --fv-logo-url: ${logoVar};
  --fv-banner-url: ${bannerVar};
}

.fv-logo-img {
  background-image: var(--fv-logo-url);
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

.fv-hero-banner {
  background-image: var(--fv-banner-url);
  background-size: cover;
  background-position: center;
}
`;
}

export function initThemeAndBrandFromStorage() {
  applyThemeToDocument();
  applyBrandAssets();
}
