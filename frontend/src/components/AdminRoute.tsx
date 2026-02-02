import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
import { API_URL } from '../utils/api';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setIsAdmin(false);
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
          // Verificar se o usuário tem role ADMIN
          if (user.role === 'admin' || user.role === 'ADMIN') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
            localStorage.removeItem('admin_token');
          }
        } else {
          setIsAdmin(false);
          localStorage.removeItem('admin_token');
        }
      } catch (error) {
        console.error('Erro ao verificar admin:', error);
        setIsAdmin(false);
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

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
