import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
import { API_URL } from '../utils/api';

interface AdminLoginRouteProps {
  children: React.ReactNode;
}

export default function AdminLoginRoute({ children }: AdminLoginRouteProps) {
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        // Sem token, pode ver a página de login
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const user = await response.json();
          // Se já é admin logado, redireciona para o painel
          if (user.role === 'admin' || user.role === 'ADMIN') {
            setRedirectTo('/admin');
          } else {
            // Não é admin, redireciona para home e remove token
            localStorage.removeItem('admin_token');
            setRedirectTo('/');
          }
        } else {
          // Token inválido, pode ver a página de login
          localStorage.removeItem('admin_token');
        }
      } catch (error) {
        console.error('Erro ao verificar admin:', error);
        localStorage.removeItem('admin_token');
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  // Se precisa redirecionar, redireciona
  if (redirectTo) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
