import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, DollarSign, Activity, ArrowDownCircle, ArrowUpCircle, Percent } from 'lucide-react';

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
import { API_URL } from '../utils/api';

// Componente auxiliar para cards de estatísticas
function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800/60 p-4 rounded border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <div className="text-[#d4af37]">{icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
}

// Componente auxiliar para tabelas
function TabTable({ title, loading, error, onRefresh, columns, rows }: { 
  title: string; 
  loading: boolean; 
  error: string; 
  onRefresh: () => void; 
  columns: string[]; 
  rows: any[][] 
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Carregando...</div>}
      {!loading && rows.length === 0 && <div className="text-gray-400">Nenhum dado encontrado</div>}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto border border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                {columns.map((col, i) => (
                  <th key={i} className="px-3 py-2 text-left">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-gray-800">
                  {row.map((cell: any, j: number) => (
                    <td key={j} className="px-3 py-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ========== GGR TAB ==========
export function GGRTab({ token }: { token: string }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const res = await fetch(`${API_URL}/api/admin/ggr/report?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar relatório');
      setReport(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">GGR / Relatório</h2>
        <button onClick={fetchReport} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-gray-300">Data Inicial</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onBlur={fetchReport}
            className="w-full bg-gray-700 rounded px-3 py-2 mt-1"
          />
        </div>
        <div>
          <label className="text-sm text-gray-300">Data Final</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onBlur={fetchReport}
            className="w-full bg-gray-700 rounded px-3 py-2 mt-1"
          />
        </div>
      </div>

      {error && <div className="text-red-400">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Carregando...</div>}

      {report && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="GGR" value={`R$ ${report.ggr?.toFixed(2) || '0.00'}`} icon={<TrendingUp />} />
          <StatCard title="NGR" value={`R$ ${report.ngr?.toFixed(2) || '0.00'}`} icon={<DollarSign />} />
          <StatCard title="Total Apostado" value={`R$ ${report.bets?.total_amount?.toFixed(2) || '0.00'}`} icon={<Activity />} />
          <StatCard title="Total Ganho" value={`R$ ${report.bets?.total_wins?.toFixed(2) || '0.00'}`} icon={<DollarSign />} />
          <StatCard title="Depósitos" value={`R$ ${report.deposits?.total?.toFixed(2) || '0.00'}`} subtitle={`${report.deposits?.count || 0} transações`} icon={<ArrowDownCircle />} />
          <StatCard title="Saques" value={`R$ ${report.withdrawals?.total?.toFixed(2) || '0.00'}`} subtitle={`${report.withdrawals?.count || 0} transações`} icon={<ArrowUpCircle />} />
          <StatCard title="Apostas" value={report.bets?.count || 0} subtitle={`R$ ${report.bets?.total_amount?.toFixed(2) || '0.00'}`} icon={<Activity />} />
          <StatCard title="Taxa GGR" value={`${report.ggr_rate?.toFixed(2) || '0.00'}%`} icon={<Percent />} />
        </div>
      )}
    </div>
  );
}

// ========== BETS TAB ==========
export function BetsTab({ token }: { token: string }) {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/bets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar apostas');
      setBets(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, []);

  return (
    <TabTable
      title="Apostas"
      loading={loading}
      error={error}
      onRefresh={fetchBets}
      columns={['ID', 'Usuário', 'Jogo', 'Provedor', 'Valor', 'Ganho', 'Status', 'Data']}
      rows={bets.map(b => [
        b.id,
        b.username || `User ${b.user_id}`,
        b.game_name || b.game_id || '-',
        b.provider || '-',
        `R$ ${b.amount?.toFixed(2)}`,
        `R$ ${b.win_amount?.toFixed(2)}`,
        b.status,
        new Date(b.created_at).toLocaleString('pt-BR')
      ])}
    />
  );
}

// ========== NOTIFICATIONS TAB ==========
export function NotificationsTab({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    user_id: '',
    link: ''
  });

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar notificações');
      setNotifications(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async () => {
    if (!form.title || !form.message) {
      setError('Título e mensagem são obrigatórios');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const body: any = {
        title: form.title,
        message: form.message,
        type: form.type
      };
      if (form.user_id) body.user_id = parseInt(form.user_id);
      if (form.link) body.link = form.link;

      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = Array.isArray(err.detail)
          ? err.detail.map((e: any) => e.msg || e.loc?.join('.')).join(', ')
          : (err.detail || 'Falha ao criar notificação');
        throw new Error(typeof msg === 'string' ? msg : 'Falha ao criar notificação');
      }
      await fetchNotifications();
      setShowForm(false);
      setForm({ title: '', message: '', type: 'info', user_id: '', link: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta notificação?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao deletar');
      await fetchNotifications();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Notificações</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black rounded font-semibold">
            {showForm ? 'Cancelar' : 'Nova Notificação'}
          </button>
          <button onClick={fetchNotifications} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <h3 className="font-semibold">Criar Notificação</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <input
              placeholder="Título *"
              value={form.title}
              onChange={(e) => setForm({...form, title: e.target.value})}
              className="bg-gray-700 rounded px-3 py-2 text-sm"
              required
            />
            <select
              value={form.type}
              onChange={(e) => setForm({...form, type: e.target.value})}
              className="bg-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="info">Info</option>
              <option value="success">Sucesso</option>
              <option value="warning">Aviso</option>
              <option value="error">Erro</option>
              <option value="promotion">Promoção</option>
            </select>
            <textarea
              placeholder="Mensagem *"
              value={form.message}
              onChange={(e) => setForm({...form, message: e.target.value})}
              className="bg-gray-700 rounded px-3 py-2 text-sm md:col-span-2"
              rows={3}
              required
            />
            <input
              placeholder="User ID (opcional, deixe vazio para global)"
              value={form.user_id}
              onChange={(e) => setForm({...form, user_id: e.target.value})}
              className="bg-gray-700 rounded px-3 py-2 text-sm"
              type="number"
            />
            <input
              placeholder="Link (opcional)"
              value={form.link}
              onChange={(e) => setForm({...form, link: e.target.value})}
              className="bg-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>
          <button onClick={createNotification} disabled={loading} className="bg-[#ff6b35] hover:bg-[#ff7b35] text-white py-2 px-4 rounded font-semibold disabled:opacity-50">
            Criar
          </button>
        </div>
      )}

      {error && <div className="text-red-400">{error}</div>}
      {loading && !showForm && <div className="text-sm text-gray-400">Carregando...</div>}

      <div className="overflow-x-auto border border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">Título</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Usuário</th>
              <th className="px-3 py-2 text-left">Ativa</th>
              <th className="px-3 py-2 text-left">Data</th>
              <th className="px-3 py-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                  Nenhuma notificação encontrada
                </td>
              </tr>
            ) : (
              notifications.map(n => (
                <tr key={n.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">{n.id}</td>
                  <td className="px-3 py-2">{n.title}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      n.type === 'success' ? 'bg-green-500/20 text-green-400' :
                      n.type === 'error' ? 'bg-red-500/20 text-red-400' :
                      n.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                      n.type === 'promotion' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {n.type}
                    </span>
                  </td>
                  <td className="px-3 py-2">{n.username || (n.user_id ? `User ${n.user_id}` : 'Global')}</td>
                  <td className="px-3 py-2">{n.is_active ? 'SIM' : 'NAO'}</td>
                  <td className="px-3 py-2">{new Date(n.created_at).toLocaleString('pt-BR')}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => deleteNotification(n.id)}
                      disabled={loading}
                      className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
