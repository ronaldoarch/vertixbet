import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, DollarSign, TrendingUp, Settings, 
  LogOut, Menu, X, CreditCard, ArrowUpCircle, 
  ArrowDownCircle, Key, Activity, RefreshCw,
  Image as ImageIcon, Palette, Home, BarChart3,
  ChevronUp, ChevronDown, Percent, FileText, 
  Gift, ShoppingBag, Tag
} from 'lucide-react';
import type { ThemePalette } from '../utils/themeManager';
import { applyThemeToDocument, getThemeList, saveThemeList, setActiveTheme } from '../utils/themeManager';

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
  // Métricas expandidas
  usuarios_na_casa?: number;
  usuarios_registrados_hoje?: number;
  balanco_jogador_total?: number;
  jogadores_com_saldo?: number;
  ggr_gerado?: number;
  ggr_taxa?: number;
  total_pago_ggr?: number;
  pix_recebido_hoje?: number;
  pix_recebido_count_hoje?: number;
  pix_feito_hoje?: number;
  pix_feito_count_hoje?: number;
  pix_gerado_hoje?: number;
  pix_percentual_pago?: number;
  pagamentos_recebidos_hoje?: number;
  valor_pagamentos_recebidos_hoje?: number;
  pagamentos_feitos_hoje?: number;
  valor_pagamentos_feitos_hoje?: number;
  pagamentos_feitos_total?: number;
  ftd_hoje?: number;
  depositos_hoje?: number;
  total_lucro?: number;
}

// Backend FastAPI - usa variável de ambiente ou fallback para localhost
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2));

export default function Admin() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para controlar seções expansíveis
  const [expandedSections, setExpandedSections] = useState({
    financeiro: true,
    notificacoes: true,
    marketing: true,
    geral: true,
  });

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
          <nav className="p-4 space-y-1">
            <NavItem
              icon={<Home />}
              label="Painel de Controle"
              active={activeTab === 'dashboard'}
              onClick={() => setActiveTab('dashboard')}
            />
            <NavItem
              icon={<BarChart3 />}
              label="Métricas"
              active={activeTab === 'metrics'}
              onClick={() => setActiveTab('metrics')}
            />
            <NavItem
              icon={<Settings />}
              label="Configuração"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
            />
            
            <NavSection
              title="Gestão Financeira"
              expanded={expandedSections.financeiro}
              onToggle={() => setExpandedSections({...expandedSections, financeiro: !expandedSections.financeiro})}
            >
              <NavSubItem
                icon={<Percent />}
                label="GGR / Relatorio"
                active={activeTab === 'ggr'}
                onClick={() => setActiveTab('ggr')}
              />
              <NavSubItem
                icon={<ArrowUpCircle />}
                label="Saques"
                active={activeTab === 'withdrawals'}
                onClick={() => setActiveTab('withdrawals')}
              />
              <NavSubItem
                icon={<ArrowDownCircle />}
                label="Depositos"
                active={activeTab === 'deposits'}
                onClick={() => setActiveTab('deposits')}
              />
              <NavSubItem
                icon={<FileText />}
                label="Apostas"
                active={activeTab === 'bets'}
                onClick={() => setActiveTab('bets')}
              />
            </NavSection>
            
            <NavSection
              title="Centro de Notificações"
              expanded={expandedSections.notificacoes}
              onToggle={() => setExpandedSections({...expandedSections, notificacoes: !expandedSections.notificacoes})}
            >
              <NavSubItem
                icon={<Gift />}
                label="Notificações"
                active={activeTab === 'notifications'}
                onClick={() => setActiveTab('notifications')}
              />
            </NavSection>
            
            <NavSection
              title="Marketing"
              expanded={expandedSections.marketing}
              onToggle={() => setExpandedSections({...expandedSections, marketing: !expandedSections.marketing})}
            >
              <NavSubItem
                icon={<ShoppingBag />}
                label="Loja de Coins"
                active={activeTab === 'coin-store'}
                onClick={() => setActiveTab('coin-store')}
              />
            </NavSection>
            
            <NavSection
              title="Geral"
              expanded={expandedSections.geral}
              onToggle={() => setExpandedSections({...expandedSections, geral: !expandedSections.geral})}
            >
              <NavSubItem
                icon={<Users />}
                label="Usuarios"
                active={activeTab === 'users'}
                onClick={() => setActiveTab('users')}
              />
              <NavSubItem
                icon={<Tag />}
                label="Cupom"
                active={activeTab === 'coupons'}
                onClick={() => setActiveTab('coupons')}
              />
              <NavSubItem
                icon={<ImageIcon />}
                label="Branding"
                active={activeTab === 'branding'}
                onClick={() => setActiveTab('branding')}
              />
              <NavSubItem
                icon={<CreditCard />}
                label="Gateways"
                active={activeTab === 'gateways'}
                onClick={() => setActiveTab('gateways')}
              />
              <NavSubItem
                icon={<TrendingUp />}
                label="FTDs"
                active={activeTab === 'ftds'}
                onClick={() => setActiveTab('ftds')}
              />
            </NavSection>
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
          {activeTab === 'branding' && <BrandingTab token={token || ''} />}
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
        active ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <div className={active ? 'text-blue-400' : 'text-gray-400'}>{icon}</div>
      <span className="text-sm">{label}</span>
    </button>
  );
}

function NavSection({ title, expanded, onToggle, children }: { 
  title: string; 
  expanded: boolean; 
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2 text-gray-400 hover:text-white transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="ml-4 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

function NavSubItem({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
        active ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'
      }`}
    >
      <div className="text-gray-500" style={{ width: '16px', height: '16px' }}>{icon}</div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="USUARIOS NA CASA" 
          value={stats.usuarios_na_casa ?? stats.total_users} 
          subtitle={`${stats.usuarios_na_casa ?? stats.total_users} Usuarios Registrados`}
          icon={<Users />} 
          accent 
        />
        <StatCard 
          title="BALANÇO JOGADOR" 
          value={`R$ ${(stats.balanco_jogador_total ?? 0).toFixed(2)}`} 
          subtitle={`${stats.jogadores_com_saldo ?? 0} Jogadores com Saldo`}
          icon={<DollarSign />} 
        />
        <StatCard 
          title="GGR GERADO" 
          value={`R$ ${(stats.ggr_gerado ?? stats.net_revenue).toFixed(2)}`} 
          subtitle={`Taxa (${stats.ggr_taxa ?? 17}%)`}
          icon={<TrendingUp />} 
        />
        <StatCard 
          title="TOTAL PAGO GGR" 
          value={`R$ ${(stats.total_pago_ggr ?? stats.total_withdrawal_amount).toFixed(2)}`} 
          subtitle={`${stats.pagamentos_feitos_total ?? stats.total_withdrawals} Pagamento Feitos`}
          icon={<ArrowUpCircle />} 
        />
        <StatCard 
          title="PIX RECEBIDO HOJE" 
          value={`R$ ${(stats.pix_recebido_hoje ?? 0).toFixed(2)}`} 
          subtitle={`${stats.pix_recebido_count_hoje ?? 0} Pagamentos recebidos`}
          icon={<ArrowDownCircle />} 
        />
        <StatCard 
          title="PIX FEITO HOJE" 
          value={`R$ ${(stats.pix_feito_hoje ?? 0).toFixed(2)}`} 
          subtitle={`${stats.pix_feito_count_hoje ?? 0} Pagamentos feitos`}
          icon={<ArrowUpCircle />} 
        />
        <StatCard 
          title="PIX GERADO HOJE" 
          value={stats.pix_gerado_hoje ?? 0} 
          subtitle={`${Math.round(stats.pix_percentual_pago ?? 0)}% Pago`}
          icon={<Activity />} 
        />
        <StatCard 
          title="USUÁRIO REGISTRADOS HOJE" 
          value={stats.usuarios_registrados_hoje ?? 0} 
          subtitle={`${stats.depositos_hoje ?? 0} Depósitos (${stats.depositos_hoje ? Math.round((stats.depositos_hoje / (stats.usuarios_registrados_hoje || 1)) * 100) : 0}%)`}
          icon={<Users />} 
        />
        <StatCard 
          title="PAGAMENTOS RECEBIDOS" 
          value={`R$ ${(stats.valor_pagamentos_recebidos_hoje ?? 0).toFixed(2)}`} 
          subtitle={`${stats.pagamentos_recebidos_hoje ?? 0} Depósitos Recebidos`}
          icon={<ArrowDownCircle />} 
        />
        <StatCard 
          title="PAGAMENTOS FEITOS" 
          value={`R$ ${(stats.valor_pagamentos_feitos_hoje ?? 0).toFixed(2)}`} 
          subtitle={`${stats.pagamentos_feitos_hoje ?? 0} Pagamentos enviados`}
          icon={<ArrowUpCircle />} 
        />
        <StatCard 
          title="FTD HOJE" 
          value={stats.ftd_hoje ?? 0} 
          subtitle={`${stats.total_ftds} Totais (geral)`}
          icon={<TrendingUp />} 
        />
        <StatCard 
          title="TOTAL LUCRO" 
          value={`R$ ${(stats.total_lucro ?? stats.net_revenue).toFixed(2)}`} 
          subtitle="Total de lucro geral"
          icon={<DollarSign />} 
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, accent = false }: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: React.ReactNode; 
  accent?: boolean 
}) {
  return (
    <div className={`rounded-lg p-4 border ${accent ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700'} bg-gray-800`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-xs font-semibold uppercase ${accent ? 'text-emerald-400' : 'text-gray-400'}`}>{title}</h3>
        <div className={accent ? 'text-emerald-400' : 'text-[#d4af37]'}>{icon}</div>
      </div>
      <p className="text-xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
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

function BrandingTab({ token }: { token: string }) {
  const [logos, setLogos] = useState<Array<{ id: number; url: string; is_active: boolean; created_at: string }>>([]);
  const [banners, setBanners] = useState<Array<{ id: number; url: string; position: number; is_active: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [logoRes, bannersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/media/list?media_type=logo`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/admin/media/list?media_type=banner`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (logoRes.ok) {
        const logosData = await logoRes.json();
        setLogos(logosData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      
      if (bannersRes.ok) {
        const bannersData = await bannersRes.json();
        setBanners(bannersData.sort((a: any, b: any) => a.position - b.position));
      }
    } catch (err) {
      console.error('Erro ao buscar assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleLogoUpload = async (file?: File | null) => {
    if (!file) return;
    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('media_type', 'logo');
      
      const res = await fetch(`${API_URL}/api/admin/media/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Erro ao fazer upload');
      }
      
      await fetchAssets();
      setMessage('Logo enviado e aplicado em tempo real.');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao fazer upload do logo.');
    } finally {
      setLoading(false);
    }
  };

  const handleBannerUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    setMessage('');
    try {
      const uploads = Array.from(fileList).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('media_type', 'banner');
        
        const res = await fetch(`${API_URL}/api/admin/media/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Erro ao fazer upload');
        }
        
        return await res.json();
      });
      
      await Promise.all(uploads);
      await fetchAssets();
      setMessage('Banners adicionados e aplicados em tempo real.');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao fazer upload dos banners.');
    } finally {
      setLoading(false);
    }
  };

  const removeLogo = async (id: number) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/admin/media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erro ao remover logo');
      
      await fetchAssets();
      setMessage('Logo removido.');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao remover logo.');
    } finally {
      setLoading(false);
    }
  };

  const removeBanner = async (id: number) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/admin/media/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erro ao remover banner');
      
      await fetchAssets();
      setMessage('Banner removido.');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao remover banner.');
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: number) => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/api/admin/media/${id}/toggle-active`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erro ao alterar status');
      
      await fetchAssets();
      setMessage('Status atualizado.');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao alterar status.');
    } finally {
      setLoading(false);
    }
  };

  const moveBanner = async (id: number, direction: 'up' | 'down') => {
    const index = banners.findIndex(b => b.id === id);
    if (index === -1) return;
    
    const newPosition = direction === 'up' ? index - 1 : index + 1;
    if (newPosition < 0 || newPosition >= banners.length) return;

    setLoading(true);
    setMessage('');
    try {
      const targetBanner = banners[newPosition];
      const currentBanner = banners[index];
      
      // Trocar posições
      const formData1 = new FormData();
      formData1.append('position', newPosition.toString());
      
      const formData2 = new FormData();
      formData2.append('position', index.toString());

      await Promise.all([
        fetch(`${API_URL}/api/admin/media/${currentBanner.id}/position`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData1
        }),
        fetch(`${API_URL}/api/admin/media/${targetBanner.id}/position`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: formData2
        })
      ]);
      
      await fetchAssets();
      setMessage('Ordem atualizada.');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao reordenar.');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (url: string) => {
    return url.startsWith('/api') ? `${API_URL}${url}` : `${API_URL}/api/public/media${url}`;
  };

  // Drag and drop handlers
  const [dragActive, setDragActive] = useState(false);
  const [dragBannerActive, setDragBannerActive] = useState(false);

  const handleDrag = (e: React.DragEvent, type: 'logo' | 'banner') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'logo') setDragActive(true);
    else setDragBannerActive(true);
  };

  const handleDragLeave = (e: React.DragEvent, type: 'logo' | 'banner') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'logo') setDragActive(false);
    else setDragBannerActive(false);
  };

  const handleDrop = (e: React.DragEvent, type: 'logo' | 'banner') => {
    e.preventDefault();
    e.stopPropagation();
    if (type === 'logo') setDragActive(false);
    else setDragBannerActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      if (type === 'logo') {
        handleLogoUpload(e.dataTransfer.files[0]);
      } else {
        handleBannerUpload(e.dataTransfer.files);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Branding</h2>
          <p className="text-sm text-gray-400">Gerencie logos e banners da plataforma.</p>
        </div>
      </div>
      {message && <div className={`text-sm ${message.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>{message}</div>}
      {loading && <div className="text-sm text-gray-400">Carregando...</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Logo Section */}
        <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Logo</h3>
          </div>
          
          {/* Drag & Drop Area */}
          <div
            onDragEnter={(e) => handleDrag(e, 'logo')}
            onDragLeave={(e) => handleDragLeave(e, 'logo')}
            onDragOver={(e) => handleDrag(e, 'logo')}
            onDrop={(e) => handleDrop(e, 'logo')}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleLogoUpload(e.target.files?.[0])}
              className="hidden"
              id="logo-upload"
              disabled={loading}
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              <div className="space-y-2">
                <div className="text-4xl">📁</div>
                <div className="text-sm text-gray-300">
                  Arraste e solte os arquivos ou <span className="text-emerald-400 underline">Clique aqui</span>
                </div>
                <div className="text-xs text-gray-500">
                  Recomendado: 200x60px | Formatos: PNG, JPG, SVG | Opcional
                </div>
              </div>
            </label>
          </div>
          
          {logos.length > 0 && (
            <div className="space-y-2">
              {logos.map((logo) => (
                <div key={logo.id} className={`p-2 rounded border ${logo.is_active ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-900'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <img src={getImageUrl(logo.url)} alt="Logo" className="max-h-16 object-contain" />
                    <div className="flex-1">
                      <div className="text-xs text-gray-400">
                        {logo.is_active ? '✓ Ativo' : 'Inativo'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(logo.id)}
                      className={`text-xs px-2 py-1 rounded ${logo.is_active ? 'bg-gray-700 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      disabled={loading}
                    >
                      {logo.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => removeLogo(logo.id)}
                      className="text-xs px-2 py-1 rounded bg-red-600/60 hover:bg-red-600/80"
                      disabled={loading}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Banner Section */}
        <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Banners</h3>
          </div>
          
          {/* Drag & Drop Area */}
          <div
            onDragEnter={(e) => handleDrag(e, 'banner')}
            onDragLeave={(e) => handleDragLeave(e, 'banner')}
            onDragOver={(e) => handleDrag(e, 'banner')}
            onDrop={(e) => handleDrop(e, 'banner')}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragBannerActive 
                ? 'border-emerald-500 bg-emerald-500/10' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleBannerUpload(e.target.files)}
              className="hidden"
              id="banner-upload"
              disabled={loading}
            />
            <label htmlFor="banner-upload" className="cursor-pointer">
              <div className="space-y-2">
                <div className="text-4xl">🖼️</div>
                <div className="text-sm text-gray-300">
                  Arraste e solte os arquivos ou <span className="text-emerald-400 underline">Clique aqui</span>
                </div>
                <div className="text-xs text-gray-500">
                  Múltiplos arquivos para carrossel | Formatos: PNG, JPG
                </div>
              </div>
            </label>
          </div>
          
          {banners.length > 0 && (
            <div className="space-y-2">
              {banners.map((banner, index) => (
                <div key={banner.id} className={`p-2 rounded border ${banner.is_active ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-700 bg-gray-900'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <img src={getImageUrl(banner.url)} alt={`Banner ${banner.id}`} className="max-h-20 w-full object-cover rounded" />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-400">
                      Posição: {index + 1} {banner.is_active ? '| ✓ Ativo' : '| Inativo'}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveBanner(banner.id, 'up')}
                        disabled={loading || index === 0}
                        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveBanner(banner.id, 'down')}
                        disabled={loading || index === banners.length - 1}
                        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => toggleActive(banner.id)}
                        className={`text-xs px-2 py-1 rounded ${banner.is_active ? 'bg-gray-700 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        disabled={loading}
                      >
                        {banner.is_active ? '⚫' : '⚪'}
                      </button>
                      <button
                        onClick={() => removeBanner(banner.id)}
                        className="text-xs px-2 py-1 rounded bg-red-600/60 hover:bg-red-600/80"
                        disabled={loading}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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
