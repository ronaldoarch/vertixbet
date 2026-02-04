import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { trackMetaEvent } from './MetaPixel';
import { API_URL } from '../utils/api';

/**
 * Componente que monitora notificações do usuário e dispara eventos do Meta Pixel
 * quando detecta depósitos aprovados
 */
export default function NotificationToast() {
  const { user, token } = useAuth();
  const [processedNotifications, setProcessedNotifications] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user || !token) return;

    const fetchUserNotifications = async () => {
      try {
        // Buscar notificações do usuário
        const res = await fetch(`${API_URL}/api/public/payments/my-notifications`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) return;
        
        const notifications = await res.json();
        
        // Processar cada notificação
        notifications.forEach((notification: any) => {
          // Evitar processar a mesma notificação múltiplas vezes
          if (processedNotifications.has(notification.id)) return;
          
          // Verificar se é notificação de depósito aprovado
          if (
            notification.type === 'success' &&
            (notification.title?.toLowerCase().includes('depósito') ||
             notification.title?.toLowerCase().includes('confirmado') ||
             notification.message?.toLowerCase().includes('depósito'))
          ) {
            // Marcar como processada
            setProcessedNotifications(prev => new Set(prev).add(notification.id));
            
            // Extrair valor da mensagem usando regex
            const valueMatch = notification.message?.match(/R\$\s*([\d.,]+)/);
            let depositValue = 0;
            
            if (valueMatch) {
              depositValue = parseFloat(valueMatch[1].replace(',', '.'));
            }
            
            // Buscar depósito mais recente aprovado via API para obter valor exato
            const fetchLatestDeposit = async () => {
              try {
                const transactionsRes = await fetch(`${API_URL}/api/public/payments/my-transactions`, {
                  headers: {
                    Authorization: `Bearer ${token}`
                  }
                });
                
                if (transactionsRes.ok) {
                  const transactions = await transactionsRes.json();
                  const deposits = transactions.filter((t: any) => 
                    t.type === 'deposit' && t.status === 'approved'
                  );
                  
                  if (deposits.length > 0) {
                    // Ordenar por data (mais recente primeiro)
                    deposits.sort((a: any, b: any) => 
                      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    );
                    
                    const latestDeposit = deposits[0];
                    depositValue = latestDeposit.amount || depositValue;
                    
                    // Verificar se é FTD (First Time Deposit)
                    const isFTD = deposits.length === 1;
                    
                    // Disparar evento Purchase
                    trackMetaEvent('Purchase', {
                      value: depositValue,
                      currency: 'BRL',
                      content_name: isFTD ? 'First Time Deposit (FTD)' : 'Deposit',
                      content_category: isFTD ? 'FTD' : 'Deposit'
                    });
                    
                    console.log(`[Meta Pixel] Purchase disparado: R$ ${depositValue.toFixed(2)}${isFTD ? ' (FTD)' : ''}`);
                  } else {
                    // Fallback: usar valor extraído da mensagem
                    if (depositValue > 0) {
                      trackMetaEvent('Purchase', {
                        value: depositValue,
                        currency: 'BRL',
                        content_name: 'Deposit',
                        content_category: 'Deposit'
                      });
                      console.log(`[Meta Pixel] Purchase disparado (fallback): R$ ${depositValue.toFixed(2)}`);
                    }
                  }
                }
              } catch (error) {
                console.error('[NotificationToast] Erro ao buscar depósito:', error);
                // Fallback: usar valor extraído da mensagem
                if (depositValue > 0) {
                  trackMetaEvent('Purchase', {
                    value: depositValue,
                    currency: 'BRL',
                    content_name: 'Deposit',
                    content_category: 'Deposit'
                  });
                }
              }
            };
            
            fetchLatestDeposit();
          }
        });
      } catch (error) {
        console.error('[NotificationToast] Erro ao buscar notificações:', error);
      }
    };

    // Buscar notificações a cada 5 segundos
    const interval = setInterval(fetchUserNotifications, 5000);
    fetchUserNotifications(); // Buscar imediatamente

    return () => clearInterval(interval);
  }, [user, token, processedNotifications]);

  return null; // Componente não renderiza nada visualmente
}
