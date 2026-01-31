import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: number;
  username: string;
  email: string;
  cpf?: string;
  phone?: string;
  role: string;
  balance: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  cpf?: string;
  phone?: string;
  affiliate_code?: string; // ref do link de afiliado (?ref=CODIGO)
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar token do localStorage ao iniciar
  useEffect(() => {
    const storedToken = localStorage.getItem('user_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Atualizar saldo periodicamente quando usuário está logado
  useEffect(() => {
    if (!token || !user) return;

    // Atualizar saldo a cada 10 segundos
    const balanceInterval = setInterval(() => {
      fetchUser(token);
    }, 10000);

    // Atualizar saldo quando a janela recebe foco (usuário volta para a aba)
    const handleFocus = () => {
      fetchUser(token);
    };
    window.addEventListener('focus', handleFocus);

    // Atualizar saldo quando a página fica visível novamente
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchUser(token);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(balanceInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token, user]);

  const fetchUser = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setLoading(false);
      } else {
        // Token inválido, limpar
        localStorage.removeItem('user_token');
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Erro ao buscar usuário:', err);
      localStorage.removeItem('user_token');
      setToken(null);
      setUser(null);
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Traduzir mensagens de erro comuns
      let errorMessage = data.detail || 'Erro ao fazer login';
      
      if (res.status === 429) {
        errorMessage = 'Muitas tentativas de login foram realizadas. Tente novamente mais tarde.';
      } else if (data.detail && (data.detail.includes('Too many') || data.detail.includes('Muitas tentativas'))) {
        errorMessage = 'Muitas tentativas de login foram realizadas. Tente novamente mais tarde.';
      }
      
      throw new Error(errorMessage);
    }

    const authToken = data.access_token;
    localStorage.setItem('user_token', authToken);
    setToken(authToken);
    await fetchUser(authToken);
  };

  const register = async (userData: RegisterData) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || 'Erro ao criar conta');
    }

    // Após registro, fazer login automaticamente
    await login(userData.username, userData.password);
  };

  const logout = () => {
    localStorage.removeItem('user_token');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUser(token);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
