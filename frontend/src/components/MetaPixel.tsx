import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_URL } from '../utils/api';

// Declaração global do fbq para TypeScript
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: (...args: any[]) => void;
  }
}

/**
 * Função helper para disparar eventos do Meta Pixel
 * @param eventName Nome do evento (ex: 'PageView', 'Purchase', 'Lead')
 * @param params Parâmetros do evento (opcional)
 */
export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.fbq) {
    console.warn('[Meta Pixel] Pixel não carregado ainda');
    return;
  }

  try {
    if (eventName === 'PageView') {
      window.fbq('track', 'PageView');
    } else {
      window.fbq('track', eventName, params || {});
    }
    console.log(`[Meta Pixel] Evento disparado: ${eventName}`, params || '');
  } catch (error) {
    console.error(`[Meta Pixel] Erro ao disparar evento ${eventName}:`, error);
  }
}

export default function MetaPixel() {
  const location = useLocation();
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Buscar configuração do pixel do backend
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/tracking-config?platform=meta`);
        if (res.ok) {
          const data = await res.json();
          if (data.is_active && data.pixel_id) {
            setPixelId(data.pixel_id);
            setIsActive(true);
            console.log(`[Meta Pixel] Carregando pixel: ${data.pixel_id}`);
          } else {
            console.log('[Meta Pixel] Pixel não está ativo ou não configurado');
          }
        }
      } catch (error) {
        console.error('[Meta Pixel] Erro ao buscar configuração:', error);
      }
    };

    fetchConfig();
  }, []);

  // Carregar script do Meta Pixel quando pixelId estiver disponível
  useEffect(() => {
    if (!pixelId || !isActive) return;

    // Verificar se já foi carregado
    if (window.fbq) {
      console.log('[Meta Pixel] Pixel já carregado');
      return;
    }

    // Criar script do Meta Pixel
    const script = document.createElement('script');
    script.innerHTML = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${pixelId}');
      fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    console.log(`[Meta Pixel] Script injetado para pixel: ${pixelId}`);

    return () => {
      // Limpar script ao desmontar (opcional)
      // document.head.removeChild(script);
    };
  }, [pixelId, isActive]);

  // Disparar PageView em mudanças de rota (SPA)
  useEffect(() => {
    if (!window.fbq || !isActive) return;

    // Pequeno delay para garantir que a página foi renderizada
    const timer = setTimeout(() => {
      trackMetaEvent('PageView');
      console.log(`[Meta Pixel] PageView disparado para: ${location.pathname}`);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname, isActive]);

  return null; // Componente não renderiza nada
}
