import { useEffect, useState } from 'react';
import { X, Megaphone, Gift, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { API_URL } from '../utils/api';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  link?: string;
  created_at: string;
}

const typeConfig: Record<string, { bg: string; iconColor: string; icon: React.ReactNode }> = {
  promotion: { bg: 'bg-purple-500/20 border-purple-500/50', iconColor: 'text-purple-400', icon: <Gift size={18} /> },
  success: { bg: 'bg-green-500/20 border-green-500/50', iconColor: 'text-green-400', icon: <Megaphone size={18} /> },
  warning: { bg: 'bg-yellow-500/20 border-yellow-500/50', iconColor: 'text-yellow-400', icon: <AlertTriangle size={18} /> },
  error: { bg: 'bg-red-500/20 border-red-500/50', iconColor: 'text-red-400', icon: <AlertCircle size={18} /> },
  info: { bg: 'bg-blue-500/20 border-blue-500/50', iconColor: 'text-blue-400', icon: <Info size={18} /> },
};

export default function NotificationsBanner() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`${API_URL}/api/public/notifications?limit=5`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (err) {
        console.error('Erro ao buscar notificações:', err);
      }
    };
    fetchNotifications();
  }, []);

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  const dismiss = (id: number) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  return (
    <div className="space-y-2 px-4 py-2">
      {visible.map((n) => {
        const config = typeConfig[n.type] || typeConfig.info;
        return (
          <div
            key={n.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${config.bg}`}
          >
            <div className={`${config.iconColor} flex-shrink-0 mt-0.5`}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{n.title}</p>
              <p className="text-sm text-gray-300 mt-0.5">{n.message}</p>
              {n.link && (
                <a
                  href={n.link}
                  className="inline-block mt-2 text-sm text-[#d4af37] hover:underline"
                >
                  Saiba mais →
                </a>
              )}
            </div>
            <button
              onClick={() => dismiss(n.id)}
              className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              aria-label="Fechar"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
