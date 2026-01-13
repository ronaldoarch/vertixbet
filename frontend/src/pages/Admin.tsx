import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, DollarSign, TrendingUp, Settings, 
  LogOut, Menu, X, CreditCard, ArrowUpCircle, 
  ArrowDownCircle, Key, Activity, RefreshCw,
  Image as ImageIcon, Palette
} from 'lucide-react';
import type { BrandAssets, ThemePalette } from '../utils/themeManager';
import { applyBrandAssets, applyThemeToDocument, getBrandAssets, getThemeList, saveBrandAssets, saveThemeList, setActiveTheme } from '../utils/themeManager';

interface Stats {
  total_users: number;
  total_deposits: number;
  total_withdrawals: number;
  total_ftds: number;
  total_deposit_amount: number;
  total_withdrawal_amount: number;
  pending_deposits: number;
  pending_withdrawals: number;
  net_revenue: number;
}

const API_URL = 'http://localhost:8001';

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2));

export default function Admin() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate('/admin/login');
      return;
    }
    loadStats();
  }, [token, navigate]);

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    navigate('/admin/login');
  };

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-gray-700 rounded"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-xl font-bold">Fortune Vegas Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            <LogOut size={20} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed md:static left-0 top-[57px] h-[calc(100vh-57px)] w-64 bg-gray-800 border-r border-gray-700 transition-transform z-40 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <nav className="p-4 space-y-2">
            <NavItem
              icon={<Activity />}
              label="Dashboard"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <NavItem
              icon={<Users />}
              label="Usuários"
              active={activeTab === 'users'}
              onClick={() => setActiveTab('users')}
            />
            <NavItem
              icon={<ArrowDownCircle />}
              label="Depósitos"
              active={activeTab === 'deposits'}
              onClick={() => setActiveTab('deposits')}
            />
            <NavItem
              icon={<ArrowUpCircle />}
              label="Saques"
              active={activeTab === 'withdrawals'}
              onClick={() => setActiveTab('withdrawals')}
            />
            <NavItem
              icon={<TrendingUp />}
              label="FTDs"
              active={activeTab === 'ftds'}
              onClick={() => setActiveTab('ftds')}
            />
            <NavItem
              icon={<CreditCard />}
              label="Gateways"
              active={activeTab === 'gateways'}
              onClick={() => setActiveTab('gateways')}
            />
            <NavItem
              icon={<Key />}
              label="IGameWin"
              active={activeTab === 'igamewin'}
              onClick={() => setActiveTab('igamewin')}
            />
            <NavItem
              icon={<Settings />}
              label="Configurações"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
            <NavItem
              icon={<ImageIcon />}
              label="Branding"
              active={activeTab === 'branding'}
              onClick={() => setActiveTab('branding')}
            />
            <NavItem
              icon={<Palette />}
              label="Temas"
              active={activeTab === 'themes'}
              onClick={() => setActiveTab('themes')}
            />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && <DashboardTab stats={stats} loading={loading} />}
          {activeTab === 'users' && <UsersTab token={token || ''} />}
          {activeTab === 'deposits' && <DepositsTab token={token || ''} />}
          {activeTab === 'withdrawals' && <WithdrawalsTab token={token || ''} />}
          {activeTab === 'ftds' && <FTDsTab token={token || ''} />}
          {activeTab === 'gateways' && <GatewaysTab token={token || ''} />}
          {activeTab === 'igamewin' && <IGameWinTab token={token || ''} />}
          {activeTab === 'settings' && <SettingsTab token={token || ''} />}
          {activeTab === 'branding' && <BrandingTab />}
          {activeTab === 'themes' && <ThemesTab />}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        active ? 'bg-[#d4af37] text-black' : 'hover:bg-gray-700'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function DashboardTab({ stats, loading }: { stats: Stats | null; loading: boolean }) {
  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  if (!stats) {
    return <div className="text-center py-12">Erro ao carregar estatísticas</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-sm text-gray-400">Visão geral rápida da operação</p>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Usuários" value={stats.total_users} icon={<Users />} accent />
        <StatCard title="Total Depósitos" value={`R$ ${stats.total_deposit_amount.toFixed(2)}`} icon={<ArrowDownCircle />} />
        <StatCard title="Total Saques" value={`R$ ${stats.total_withdrawal_amount.toFixed(2)}`} icon={<ArrowUpCircle />} />
        <StatCard title="Receita Líquida" value={`R$ ${stats.net_revenue.toFixed(2)}`} icon={<DollarSign />} />
        <StatCard title="FTDs" value={stats.total_ftds} icon={<TrendingUp />} />
        <StatCard title="Depósitos Pendentes" value={stats.pending_deposits} icon={<Activity />} />
        <StatCard title="Saques Pendentes" value={stats.pending_withdrawals} icon={<Activity />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, accent = false }: { title: string; value: string | number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`rounded-lg p-6 border border-gray-700 relative overflow-hidden ${accent ? 'bg-gradient-to-br from-[#d4af37] via-[#f5d97f] to-[#f7e8b6] text-gray-900' : 'bg-gray-800'}`}>
      <div className="absolute inset-0 bg-white/5 pointer-events-none" />
      <div className="flex items-center justify-between mb-2 relative z-10">
        <h3 className={`text-sm ${accent ? 'text-gray-800' : 'text-gray-400'}`}>{title}</h3>
        <div className={accent ? 'text-gray-900' : 'text-[#d4af37]'}>{icon}</div>
      </div>
      <p className="text-2xl font-bold relative z-10">{value}</p>
    </div>
  );
}

// ==========================
// TABS IMPLEMENTADAS
// ==========================

function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar usuários');
      const data = await res.json();
      setUsers(data);
    } catch (err:any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Usuários</h2>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      {error && <div className="text-red-400 mb-3">{error}</div>}
      {loading ? <div>Carregando...</div> : (
        <div className="overflow-x-auto border border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Usuário</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Saldo</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-t border-gray-800">
                  <td className="px-3 py-2">{u.id}</td>
                  <td className="px-3 py-2">{u.username}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">R$ {u.balance?.toFixed(2)}</td>
                  <td className="px-3 py-2">{u.is_active ? 'Ativo' : 'Inativo'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DepositsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/deposits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar depósitos');
      setItems(await res.json());
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  return (
    <TabTable
      title="Depósitos"
      loading={loading}
      error={error}
      onRefresh={fetchData}
      columns={['ID','User','Valor','Status','Criado em']}
      rows={items.map(d => [d.id, d.user_id, `R$ ${d.amount?.toFixed(2)}`, d.status, d.created_at])}
    />
  );
}

function WithdrawalsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar saques');
      setItems(await res.json());
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  return (
    <TabTable
      title="Saques"
      loading={loading}
      error={error}
      onRefresh={fetchData}
      columns={['ID','User','Valor','Status','Criado em']}
      rows={items.map(d => [d.id, d.user_id, `R$ ${d.amount?.toFixed(2)}`, d.status, d.created_at])}
    />
  );
}

function FTDsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/ftds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar FTDs');
      setItems(await res.json());
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  return (
    <TabTable
      title="FTDs"
      loading={loading}
      error={error}
      onRefresh={fetchData}
      columns={['ID','User','Depósito','Valor','Taxa','Status']}
      rows={items.map(d => [d.id, d.user_id, d.deposit_id, `R$ ${d.amount?.toFixed(2)}`, `${d.pass_rate}%`, d.status])}
    />
  );
}

function GatewaysTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', type: '', is_active: true, credentials: '' });

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/gateways`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar gateways');
      setItems(await res.json());
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };
  const create = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/gateways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Falha ao criar gateway');
      await fetchData();
    } catch (err:any) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gateways</h2>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Carregando...</div>}

      <div className="grid md:grid-cols-2 gap-3 bg-gray-800/60 p-4 rounded border border-gray-700">
        <input className="bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Nome" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
        <input className="bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Tipo (pix, card...)" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}/>
        <textarea className="bg-gray-700 rounded px-3 py-2 text-sm md:col-span-2" placeholder="Credenciais (JSON ou texto)" value={form.credentials} onChange={e=>setForm({...form, credentials:e.target.value})}/>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})}/>
          <span>Ativo</span>
        </div>
        <button onClick={create} className="md:col-span-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white py-2 rounded font-semibold">Criar</button>
      </div>

      <div className="grid gap-3">
        {items.map(g => (
          <div key={g.id} className="p-4 rounded border border-gray-700 bg-gray-800/50">
            <div className="font-bold text-lg">{g.name}</div>
            <div className="text-sm text-gray-400">Tipo: {g.type}</div>
            <div className="text-sm text-gray-400">Status: {g.is_active ? 'Ativo' : 'Inativo'}</div>
            <div className="text-xs text-gray-500 break-all mt-1">Credenciais: {g.credentials}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IGameWinTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ agent_code: '', agent_key: '', api_url: 'https://api.igamewin.com', credentials: '', is_active: true });
  const [games, setGames] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [providerCode, setProviderCode] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  const [gamesError, setGamesError] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/igamewin-agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar agentes');
      setItems(await res.json());
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchGames = async (provider?: string) => {
    setLoadingGames(true); setGamesError('');
    try {
      const query = provider || providerCode ? `?provider_code=${encodeURIComponent(provider || providerCode)}` : '';
      const res = await fetch(`${API_URL}/api/admin/igamewin/games${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar jogos/provedores');
      const data = await res.json();
      setProviders(data.providers || []);
      if (!providerCode && !provider && data.providers?.length) {
        const first = data.providers[0];
        const code = first.code || first.provider_code || '';
        setProviderCode(code);
      }
      if (data.provider_code) {
        setProviderCode(data.provider_code);
      }
      setGames(data.games || []);
    } catch (err:any) { setGamesError(err.message); }
    finally { setLoadingGames(false); }
  };
  const create = async () => {
    setLoading(true); setError('');
    const body = JSON.stringify(form);
    try {
      // Tenta criar; se já existir, faz update no primeiro agente
      let res = await fetch(`${API_URL}/api/admin/igamewin-agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body
      });
      if (!res.ok) {
        // Se já existe, tenta update do primeiro agente
        const existingId = items[0]?.id;
        if (res.status === 400 && existingId) {
          res = await fetch(`${API_URL}/api/admin/igamewin-agents/${existingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body
          });
        }
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Falha ao salvar agente: ${txt || res.status}`);
      }
      await fetchData();
      await fetchGames();
    } catch (err:any) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); fetchGames(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">IGameWin</h2>
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar agente
          </button>
          <button onClick={() => fetchGames()} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar jogos
          </button>
        </div>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {gamesError && <div className="text-red-400">{gamesError}</div>}
      {loading && <div className="text-sm text-gray-400">Carregando agente...</div>}

      <div className="grid md:grid-cols-2 gap-3 bg-gray-800/60 p-4 rounded border border-gray-700">
        <input className="bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Agent Code" value={form.agent_code} onChange={e=>setForm({...form, agent_code:e.target.value})}/>
        <input className="bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Agent Key" value={form.agent_key} onChange={e=>setForm({...form, agent_key:e.target.value})}/>
        <input className="bg-gray-700 rounded px-3 py-2 text-sm md:col-span-2" placeholder="API URL" value={form.api_url} onChange={e=>setForm({...form, api_url:e.target.value})}/>
        <textarea className="bg-gray-700 rounded px-3 py-2 text-sm md:col-span-2" placeholder="Credenciais extras (JSON)" value={form.credentials} onChange={e=>setForm({...form, credentials:e.target.value})}/>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})}/>
          <span>Ativo</span>
        </div>
        <button onClick={create} className="md:col-span-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white py-2 rounded font-semibold">Salvar agente</button>
      </div>

      <div className="grid gap-3">
        {items.map(a => (
          <div key={a.id} className="p-4 rounded border border-gray-700 bg-gray-800/50">
            <div className="font-bold text-lg">{a.agent_code}</div>
            <div className="text-sm text-gray-400">API: {a.api_url}</div>
            <div className="text-sm text-gray-400">Status: {a.is_active ? 'Ativo' : 'Inativo'}</div>
            <div className="text-xs text-gray-500 break-all mt-1">Credenciais: {a.credentials}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Provedores ativos</h3>
            <p className="text-sm text-gray-400">Dados vindos do IGameWin</p>
          </div>
          <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded">Total: {providers.length}</span>
        </div>
        {loadingGames ? <div>Carregando provedores...</div> : (
          <div className="space-y-2">
            {providers.length === 0 && <span className="text-gray-400 text-sm">Nenhum provedor retornado.</span>}
            {providers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {providers.map((p) => {
                  const code = p.code || p.provider_code || p.name || '';
                  const name = p.name || p.code || p.provider_code || '—';
                  const status = p.status === 1 ? 'Ativo' : 'Manutenção';
                  const active = providerCode === code;
                  return (
                    <button
                      key={code || name}
                      onClick={() => { setProviderCode(code); fetchGames(code); }}
                      className={`px-3 py-1 border rounded text-sm ${active ? 'bg-[#ff6b35] border-[#ff6b35] text-white' : 'bg-gray-800 border-gray-700 text-gray-100'}`}
                    >
                      {name} <span className="text-xs opacity-70">({status})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Jogos ativos</h3>
            <p className="text-sm text-gray-400">Lista filtrada por status ativo</p>
          </div>
          <span className="text-sm text-gray-300 bg-gray-800 px-3 py-1 rounded">
            Total: {games.filter((g)=> g.status === 1 || g.status === true || String(g.status).toLowerCase() === 'active').length}
          </span>
        </div>
        {loadingGames ? <div>Carregando jogos...</div> : (
          <div className="overflow-x-auto border border-gray-700 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Banner</th>
                  <th className="px-3 py-2 text-left">Nome</th>
                  <th className="px-3 py-2 text-left">Provedor</th>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {games
                  .filter((g) => g.status === 1 || g.status === true || String(g.status).toLowerCase() === 'active')
                  .map((g, idx) => (
                    <tr key={g.id ?? g.game_code ?? g.code ?? idx} className="border-t border-gray-800">
                      <td className="px-3 py-2">
                        {g.banner || g.image || g.icon ? (
                          <img src={g.banner || g.image || g.icon} alt={g.game_name || g.name || g.title || g.gameTitle || '—'} className="w-16 h-10 object-cover rounded border border-gray-700" />
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{g.game_name || g.name || g.title || g.gameTitle || '—'}</td>
                      <td className="px-3 py-2">{g.provider_code || g.provider || g.provider_name || g.vendor || g.vendor_name || providerCode || '—'}</td>
                      <td className="px-3 py-2">{g.game_code || g.code || g.game_id || g.id || g.slug || '—'}</td>
                      <td className="px-3 py-2 capitalize">ativo</td>
                    </tr>
                  ))}
                {games.filter((g)=> g.status === 1 || g.status === true || String(g.status).toLowerCase() === 'active').length === 0 && !loadingGames && (
                  <tr><td className="px-3 py-3 text-gray-400" colSpan={5}>Nenhum jogo retornado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ token }: { token: string }) {
  const [form, setForm] = useState({ pass_rate: 0, min_amount: 0, is_active: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/ftd-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar configurações');
      const data = await res.json();
      setForm({ pass_rate: data.pass_rate ?? 0, min_amount: data.min_amount ?? 0, is_active: data.is_active });
    } catch (err:any) { setError(err.message); } finally { setLoading(false); }
  };
  const save = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/ftd-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações');
      await load();
    } catch (err:any) { setError(err.message); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Configurações (FTD)</h2>
      {error && <div className="text-red-400">{error}</div>}
      {loading && <div className="text-sm text-gray-400">Carregando...</div>}
      <div className="grid md:grid-cols-2 gap-3 bg-gray-800/60 p-4 rounded border border-gray-700">
        <div>
          <label className="text-sm text-gray-300">Taxa de passagem (%)</label>
          <input type="number" className="w-full bg-gray-700 rounded px-3 py-2" value={form.pass_rate} onChange={e=>setForm({...form, pass_rate:Number(e.target.value)})}/>
        </div>
        <div>
          <label className="text-sm text-gray-300">Depósito mínimo</label>
          <input type="number" className="w-full bg-gray-700 rounded px-3 py-2" value={form.min_amount} onChange={e=>setForm({...form, min_amount:Number(e.target.value)})}/>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})}/>
          <span>Ativo</span>
        </div>
        <button onClick={save} className="md:col-span-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white py-2 rounded font-semibold">Salvar</button>
      </div>
    </div>
  );
}

function BrandingTab() {
  const [assets, setAssets] = useState<BrandAssets>(() => getBrandAssets());
  const [message, setMessage] = useState('');

  const handleFile = (field: 'logo' | 'banner', file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const updated = { ...assets, [field]: base64 };
      setAssets(updated);
      saveBrandAssets(updated);
      applyBrandAssets(updated);
      setMessage('Alterações aplicadas em tempo real.');
    };
    reader.readAsDataURL(file);
  };

  const clearField = (field: 'logo' | 'banner') => {
    const updated = { ...assets, [field]: undefined };
    setAssets(updated);
    saveBrandAssets(updated);
    applyBrandAssets(updated);
    setMessage('Campo limpo.');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Branding</h2>
          <p className="text-sm text-gray-400">Envie logo e banner para aplicar na plataforma em tempo real.</p>
        </div>
      </div>
      {message && <div className="text-sm text-emerald-400">{message}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Logo</h3>
            <button onClick={() => clearField('logo')} className="text-sm text-gray-300 hover:text-white">Limpar</button>
          </div>
          <label className="block">
            <span className="text-sm text-gray-300">Upload (PNG/JPG/SVG)</span>
            <input type="file" accept="image/*" onChange={(e) => handleFile('logo', e.target.files?.[0])} className="mt-2 w-full text-sm" />
          </label>
          {assets.logo && (
            <div className="p-2 bg-gray-900 rounded border border-gray-700">
              <img src={assets.logo} alt="Logo atual" className="max-h-20 object-contain mx-auto" />
            </div>
          )}
        </div>

        <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Banner</h3>
            <button onClick={() => clearField('banner')} className="text-sm text-gray-300 hover:text-white">Limpar</button>
          </div>
          <label className="block">
            <span className="text-sm text-gray-300">Upload (PNG/JPG)</span>
            <input type="file" accept="image/*" onChange={(e) => handleFile('banner', e.target.files?.[0])} className="mt-2 w-full text-sm" />
          </label>
          {assets.banner && (
            <div className="p-2 bg-gray-900 rounded border border-gray-700">
              <img src={assets.banner} alt="Banner atual" className="max-h-28 object-contain mx-auto" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ThemesTab() {
  const [themes, setThemes] = useState<ThemePalette[]>(() => getThemeList());
  const [form, setForm] = useState<ThemePalette>({
    id: makeId(),
    name: 'Novo tema',
    bg: '#0a0e0f',
    surface: '#0d1415',
    card: '#0f1b1d',
    accent: '#d4af37',
    accentSoft: '#0f6f5a',
    text: '#ffffff',
    muted: '#cbd5e1'
  });
  const [activeId, setActiveId] = useState(() => {
    const active = typeof localStorage !== 'undefined' ? localStorage.getItem('fv_theme_active') : null;
    return active || 'default';
  });

  const saveTheme = () => {
    const list = themes.some((t) => t.id === form.id) ? themes.map((t) => (t.id === form.id ? form : t)) : [...themes, form];
    setThemes(list);
    saveThemeList(list);
    setForm({ ...form, id: makeId(), name: 'Novo tema' });
  };

  const applyTheme = (theme: ThemePalette) => {
    setActiveId(theme.id);
    setActiveTheme(theme);
  };

  const removeTheme = (id: string) => {
    if (id === 'default') return;
    const list = themes.filter((t) => t.id !== id);
    setThemes(list);
    saveThemeList(list);
    if (activeId === id) {
      const fallback = list[0];
      if (fallback) applyTheme(fallback);
    }
  };

  const handleField = (key: keyof ThemePalette, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    applyThemeToDocument(themes.find((t) => t.id === activeId));
  }, [activeId, themes]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Temas</h2>
        <p className="text-sm text-gray-400">Crie e aplique temas em tempo real. As cores refletem imediatamente na plataforma.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 bg-gray-800/60 p-4 rounded border border-gray-700">
        <div className="space-y-3">
          <label className="text-sm text-gray-300">Nome do tema</label>
          <input className="w-full bg-gray-700 rounded px-3 py-2" value={form.name} onChange={(e) => handleField('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ColorInput label="Fundo" value={form.bg} onChange={(v) => handleField('bg', v)} />
          <ColorInput label="Superfície" value={form.surface} onChange={(v) => handleField('surface', v)} />
          <ColorInput label="Cards" value={form.card} onChange={(v) => handleField('card', v)} />
          <ColorInput label="Acento" value={form.accent} onChange={(v) => handleField('accent', v)} />
          <ColorInput label="Acento suave" value={form.accentSoft} onChange={(v) => handleField('accentSoft', v)} />
          <ColorInput label="Texto" value={form.text} onChange={(v) => handleField('text', v)} />
          <ColorInput label="Texto secundário" value={form.muted} onChange={(v) => handleField('muted', v)} />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button onClick={saveTheme} className="bg-[#ff6b35] hover:bg-[#ff7b35] text-white px-4 py-2 rounded font-semibold">Salvar tema</button>
          <button onClick={() => applyTheme(form)} className="px-4 py-2 border border-gray-600 rounded hover:border-gray-400">Aplicar agora</button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {themes.map((t) => (
          <div key={t.id} className={`p-4 rounded border ${activeId === t.id ? 'border-[#d4af37]' : 'border-gray-700'} bg-gray-800/60`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="text-xs text-gray-400">ID: {t.id}</p>
              </div>
              <div className="flex gap-1">
                <Swatch color={t.bg} />
                <Swatch color={t.card} />
                <Swatch color={t.accent} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => applyTheme(t)} className="flex-1 bg-[#0f6f5a] hover:bg-[#158f75] text-white py-1.5 rounded text-sm">Aplicar</button>
              {t.id !== 'default' && (
                <button onClick={() => removeTheme(t.id)} className="px-3 py-1.5 border border-gray-700 rounded text-sm hover:border-gray-500">Excluir</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-sm text-gray-300 flex items-center gap-2">
      <span className="w-28">{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-16 border border-gray-600 rounded bg-gray-700" />
      <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-gray-700 rounded px-2 py-1 text-xs" />
    </label>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="w-6 h-6 rounded border border-gray-600" style={{ background: color }} />;
}

// Table helper
function TabTable({ title, loading, error, onRefresh, columns, rows }:{ title:string; loading:boolean; error:string; onRefresh:()=>void; columns:string[]; rows:(string|number)[][] }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      {error && <div className="text-red-400 mb-2">{error}</div>}
      {loading ? <div>Carregando...</div> : (
        <div className="overflow-x-auto border border-gray-700 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                {columns.map(c => <th key={c} className="px-3 py-2 text-left">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i) => (
                <tr key={i} className="border-t border-gray-800">
                  {r.map((c,j)=><td key={j} className="px-3 py-2">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
