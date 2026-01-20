import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  textSecondary: string;
  success: string;
  error: string;
  warning: string;
}

interface ThemeContextType {
  theme: ThemeColors | null;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeColors | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = (colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-warning', colors.warning);
    
    // Aplicar também como classes CSS para compatibilidade
    root.style.setProperty('background-color', colors.background);
    root.style.setProperty('color', colors.text);
  };

  const loadTheme = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/themes/active`);
      if (res.ok) {
        const data = await res.json();
        const colors = JSON.parse(data.colors_json);
        setTheme(colors);
        applyTheme(colors);
      } else {
        // Usar tema padrão se não houver tema ativo
        const defaultTheme: ThemeColors = {
          primary: '#0a4d3e',
          secondary: '#0d5d4b',
          accent: '#d4af37',
          background: '#0a0e0f',
          text: '#ffffff',
          textSecondary: '#9ca3af',
          success: '#10b981',
          error: '#ef4444',
          warning: '#f59e0b'
        };
        setTheme(defaultTheme);
        applyTheme(defaultTheme);
      }
    } catch (err) {
      console.error('Erro ao carregar tema:', err);
      // Aplicar tema padrão em caso de erro
      const defaultTheme: ThemeColors = {
        primary: '#0a4d3e',
        secondary: '#0d5d4b',
        accent: '#d4af37',
        background: '#0a0e0f',
        text: '#ffffff',
        textSecondary: '#9ca3af',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b'
      };
      setTheme(defaultTheme);
      applyTheme(defaultTheme);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTheme();
    // Recarregar tema a cada 30 segundos para pegar mudanças
    const interval = setInterval(loadTheme, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
