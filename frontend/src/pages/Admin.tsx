import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Users, DollarSign, TrendingUp, Settings, 
  LogOut, Menu, X, CreditCard, ArrowUpCircle, 
  ArrowDownCircle, Activity, RefreshCw,
  Image as ImageIcon, Home,
  ChevronUp, ChevronDown, Percent, FileText, 
  Gift, Tag, Gamepad2, UserCog, Palette, BarChart, GripVertical, FileDown
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { API_URL } from '../utils/api';

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

// const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2));

export default function Admin() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  
  // Estado para controlar seções expansíveis
  const [expandedSections, setExpandedSections] = useState({
    financeiro: true,
    notificacoes: true,
    marketing: true,
    geral: true,
  });

  useEffect(() => {
    const verifyAdmin = async () => {
    if (!token) {
      navigate('/admin/login');
      return;
    }

      // Verificar se o usuário é realmente admin
      try {
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const user = await response.json();
          // Verificar se o usuário tem role ADMIN
          if (user.role !== 'admin' && user.role !== 'ADMIN') {
            // Não é admin, redirecionar para home
            localStorage.removeItem('admin_token');
            navigate('/');
            return;
          }
          // É admin, carregar stats
    loadStats();
        } else {
          // Token inválido
          localStorage.removeItem('admin_token');
          navigate('/admin/login');
        }
      } catch (error) {
        console.error('Erro ao verificar admin:', error);
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
      }
    };

    verifyAdmin();
  }, [token, navigate]);

  // Aplicar tema do backend no admin também
  useEffect(() => {
    if (theme) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.primary);
      root.style.setProperty('--color-secondary', theme.secondary);
      root.style.setProperty('--color-accent', theme.accent);
      root.style.setProperty('--color-background', theme.background);
      root.style.setProperty('--color-text', theme.text);
      root.style.setProperty('--color-text-secondary', theme.textSecondary);
    }
  }, [theme]);

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
            <h1 className="text-xl font-bold">VertixBet Admin</h1>
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
                icon={<DollarSign />}
                label="Depósitos e Saques"
                active={activeTab === 'transactions'}
                onClick={() => setActiveTab('transactions')}
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
                icon={<Gift />}
                label="Promoções"
                active={activeTab === 'promotions'}
                onClick={() => setActiveTab('promotions')}
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
                icon={<Gamepad2 />}
                label="IGameWin"
                active={activeTab === 'igamewin'}
                onClick={() => setActiveTab('igamewin')}
              />
              <NavSubItem
                icon={<UserCog />}
                label="Afiliados"
                active={activeTab === 'affiliates'}
                onClick={() => setActiveTab('affiliates')}
              />
              <NavSubItem
                icon={<Palette />}
                label="Temas"
                active={activeTab === 'themes'}
                onClick={() => setActiveTab('themes')}
              />
              <NavSubItem
                icon={<BarChart />}
                label="Tracking"
                active={activeTab === 'tracking'}
                onClick={() => setActiveTab('tracking')}
              />
            </NavSection>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'dashboard' && <DashboardTab stats={stats} loading={loading} />}
          {activeTab === 'users' && <UsersTab token={token || ''} />}
          {activeTab === 'transactions' && <TransactionsTab token={token || ''} />}
          {activeTab === 'gateways' && <GatewaysTab token={token || ''} />}
          {activeTab === 'igamewin' && <IGameWinTab token={token || ''} />}
          {activeTab === 'affiliates' && <AffiliatesTab token={token || ''} />}
          {activeTab === 'themes' && <ThemesTab token={token || ''} />}
          {activeTab === 'tracking' && <TrackingTab token={token || ''} />}
          {activeTab === 'settings' && <SettingsTab token={token || ''} />}
          {activeTab === 'branding' && <BrandingTab token={token || ''} />}
          {activeTab === 'ggr' && <GGRTab token={token || ''} />}
          {activeTab === 'bets' && <BetsTab token={token || ''} />}
          {activeTab === 'notifications' && <NotificationsTab token={token || ''} />}
          {activeTab === 'coupons' && <CouponsTab token={token || ''} />}
          {activeTab === 'promotions' && <PromotionsTab token={token || ''} />}
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
      {/* 5 indicadores principais: depósitos totais, saques, primeiros depósitos, usuários, GGR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard 
          title="DEPÓSITOS TOTAIS" 
          value={`R$ ${(stats.total_deposit_amount ?? 0).toFixed(2)}`} 
          subtitle={`${stats.total_deposits ?? 0} transações`}
          icon={<ArrowDownCircle />} 
        />
        <StatCard 
          title="SAQUES TOTAIS" 
          value={`R$ ${(stats.total_withdrawal_amount ?? 0).toFixed(2)}`} 
          subtitle={`${stats.total_withdrawals ?? 0} transações`}
          icon={<ArrowUpCircle />} 
        />
        <StatCard 
          title="PRIMEIROS DEPÓSITOS" 
          value={stats.total_ftds ?? 0} 
          subtitle="Usuários com 1º depósito"
          icon={<TrendingUp />} 
        />
        <StatCard 
          title="USUÁRIOS" 
          value={stats.total_users ?? 0} 
          subtitle={`${stats.jogadores_com_saldo ?? 0} com saldo`}
          icon={<Users />} 
          accent 
        />
        <StatCard 
          title="GGR GERADO" 
          value={`R$ ${(stats.ggr_gerado ?? stats.net_revenue ?? 0).toFixed(2)}`} 
          subtitle="Depósitos − Saques"
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

  const exportPdf = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const jspdfAutoTable = await import('jspdf-autotable') as { default?: (doc: unknown, opts: unknown) => void; autoTable?: (doc: unknown, opts: unknown) => void };
      const autoTable = jspdfAutoTable.default ?? jspdfAutoTable.autoTable;
      if (!autoTable) throw new Error('jspdf-autotable não carregado');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Lista de Usuários', 14, 20);
      doc.setFontSize(10);
      doc.text(`Exportado em ${new Date().toLocaleString('pt-BR')}`, 14, 28);
      autoTable(doc, {
        startY: 35,
        head: [['ID', 'Usuário', 'Email', 'Saldo', 'Status']],
        body: users.map(u => [
          String(u.id),
          u.username || '',
          u.email || '',
          `R$ ${(u.balance ?? 0).toFixed(2).replace('.', ',')}`,
          u.is_active ? 'Ativo' : 'Inativo'
        ]),
        styles: { fontSize: 8 }
      });
      doc.save(`usuarios_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao exportar PDF. Execute: npm install jspdf jspdf-autotable');
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Usuários</h2>
        <div className="flex gap-2">
          <button onClick={exportPdf} className="flex items-center gap-2 px-3 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black rounded font-semibold">
            <FileDown size={18} /> Exportar PDF
          </button>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
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

function TransactionsTab({ token }: { token: string }) {
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState<'deposits' | 'withdrawals'>('deposits');

  const fetchDeposits = async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/deposits`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Falha ao carregar depósitos');
      setDeposits(await res.json());
    } catch (err: any) { setError(err?.message || 'Erro'); }
  };

  const fetchWithdrawals = async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/withdrawals`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Falha ao carregar saques');
      setWithdrawals(await res.json());
    } catch (err: any) { setError(err?.message || 'Erro'); }
  };

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      await Promise.all([fetchDeposits(), fetchWithdrawals()]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Depósitos e Saques</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('deposits')}
            className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${activeSection === 'deposits' ? 'bg-[#0a4d3e] text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <ArrowDownCircle size={18} /> Depósitos
          </button>
          <button
            onClick={() => setActiveSection('withdrawals')}
            className={`px-4 py-2 rounded font-semibold flex items-center gap-2 ${activeSection === 'withdrawals' ? 'bg-[#0a4d3e] text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
          >
            <ArrowUpCircle size={18} /> Saques
          </button>
          <button onClick={fetchAll} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {loading && !deposits.length && !withdrawals.length ? (
        <div>Carregando...</div>
      ) : activeSection === 'deposits' ? (
        <TabTable
          title="Depósitos"
          loading={false}
          error=""
          onRefresh={fetchDeposits}
          columns={['ID', 'Usuário', 'Valor', 'Status', 'Criado em']}
          rows={deposits.map(d => [
            d.id,
            d.username || `#${d.user_id}`,
            `R$ ${(d.amount ?? 0).toFixed(2).replace('.', ',')}`,
            d.status || '-',
            d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '-'
          ])}
        />
      ) : (
        <TabTable
          title="Saques"
          loading={false}
          error=""
          onRefresh={fetchWithdrawals}
          columns={['ID', 'Usuário', 'Valor', 'Status', 'Criado em']}
          rows={withdrawals.map(d => [
            d.id,
            d.username || `#${d.user_id}`,
            `R$ ${(d.amount ?? 0).toFixed(2).replace('.', ',')}`,
            d.status || '-',
            d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '-'
          ])}
        />
      )}
    </div>
  );
}

function GatewaysTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ 
    name: '', 
    type: 'pix', 
    is_active: true, 
    client_id: '',
    client_secret: '',
    sandbox: true,
    username: '',
    password: '',
    api_url: 'https://api.gatebox.com.br'
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API_URL}/api/admin/gateways`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar gateways');
      setItems(await res.json());
    } catch (err:any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ name: '', type: 'pix', is_active: true, client_id: '', client_secret: '', sandbox: true, username: '', password: '', api_url: 'https://api.gatebox.com.br' });
    setEditingId(null);
  };

  const prepareCredentials = () => {
    if (form.type === 'gatebox') {
      return JSON.stringify({
        username: form.username,
        password: form.password,
        api_url: form.api_url || 'https://api.gatebox.com.br'
      });
    } else {
      return JSON.stringify({
        client_id: form.client_id,
        client_secret: form.client_secret,
        sandbox: form.sandbox
      });
    }
  };

  const create = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const credentials = prepareCredentials();
      const res = await fetch(`${API_URL}/api/admin/gateways`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          is_active: form.is_active,
          credentials: credentials
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Falha ao criar gateway');
      }
      setSuccess('Gateway criado com sucesso!');
      resetForm();
      await fetchData();
    } catch (err:any) { 
      setError(err.message || 'Erro ao criar gateway');
    } finally { 
      setLoading(false); 
    }
  };

  const update = async (id: number) => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const credentials = prepareCredentials();
      const res = await fetch(`${API_URL}/api/admin/gateways/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          is_active: form.is_active,
          credentials: credentials
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Falha ao atualizar gateway');
      }
      setSuccess('Gateway atualizado com sucesso!');
      resetForm();
      await fetchData();
    } catch (err:any) { 
      setError(err.message || 'Erro ao atualizar gateway');
    } finally { 
      setLoading(false); 
    }
  };

  const loadForEdit = (gateway: any) => {
    setEditingId(gateway.id);
    setForm({
      name: gateway.name || '',
      type: gateway.type || 'pix',
      is_active: gateway.is_active ?? true,
      client_id: '',
      client_secret: '',
      sandbox: true,
      username: '',
      password: '',
      api_url: 'https://api.gatebox.com.br'
    });

    // Parse credentials se existir
    if (gateway.credentials) {
      try {
        const creds = JSON.parse(gateway.credentials);
        if (gateway.type === 'gatebox') {
          setForm(prev => ({
            ...prev,
            username: creds.username || '',
            password: creds.password || '',
            api_url: creds.api_url || 'https://api.gatebox.com.br'
          }));
        } else {
          setForm(prev => ({
            ...prev,
            client_id: creds.client_id || creds.ci || '',
            client_secret: creds.client_secret || creds.cs || '',
            sandbox: creds.sandbox !== undefined ? creds.sandbox : true
          }));
        }
      } catch (e) {
        // Se não for JSON, deixa vazio
      }
    }
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

      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Formulário de criar/editar */}
      <div className="bg-gray-800/60 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Editar Gateway' : 'Adicionar Novo Gateway'}
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome do Gateway</label>
            <input 
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none" 
              placeholder="Ex: SuitPay PIX"
              value={form.name} 
              onChange={e=>setForm({...form, name:e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo</label>
            <select 
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none"
              value={form.type} 
              onChange={e=>setForm({...form, type:e.target.value})}
            >
              <option value="pix">PIX (SuitPay)</option>
              <option value="gatebox">Gatebox</option>
              <option value="card">Cartão</option>
              <option value="boleto">Boleto</option>
            </select>
          </div>

          {form.type === 'gatebox' ? (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input 
                  type="text"
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none" 
                  placeholder="Username do Gatebox"
                  value={form.username} 
                  onChange={e=>setForm({...form, username:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input 
                  type="password"
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none" 
                  placeholder="Password do Gatebox"
                  value={form.password} 
                  onChange={e=>setForm({...form, password:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">API URL (opcional)</label>
                <input 
                  type="text"
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none" 
                  placeholder="https://api.gatebox.com.br"
                  value={form.api_url} 
                  onChange={e=>setForm({...form, api_url:e.target.value})}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Client ID (ci)</label>
                <input 
                  type="text"
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none" 
                  placeholder="Client ID da SuitPay"
                  value={form.client_id} 
                  onChange={e=>setForm({...form, client_id:e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Client Secret (cs)</label>
                <input 
                  type="password"
                  className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none" 
                  placeholder="Client Secret da SuitPay"
                  value={form.client_secret} 
                  onChange={e=>setForm({...form, client_secret:e.target.value})}
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={form.sandbox} 
                  onChange={e=>setForm({...form, sandbox:e.target.checked})}
                  className="w-4 h-4"
                />
                <label className="text-sm text-gray-300">Ambiente Sandbox</label>
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={form.is_active} 
              onChange={e=>setForm({...form, is_active:e.target.checked})}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-300">Ativo</label>
          </div>

          <div className="md:col-span-2 flex gap-2">
            {editingId ? (
              <>
                <button 
                  onClick={() => update(editingId)} 
                  className="flex-1 bg-[#d4af37] hover:bg-[#ffd700] text-black py-2 rounded font-semibold transition-colors"
                >
                  Atualizar Gateway
                </button>
                <button 
                  onClick={resetForm} 
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded font-semibold transition-colors"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button 
                onClick={create} 
                className="flex-1 bg-[#ff6b35] hover:bg-[#ff7b35] text-white py-2 rounded font-semibold transition-colors"
              >
                Criar Gateway
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de gateways */}
      {loading && items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
          <p>Carregando gateways...</p>
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-12 text-gray-500 border border-gray-700 rounded-lg bg-gray-800/30">
          <p className="text-lg mb-2">Nenhum gateway configurado</p>
          <p className="text-sm">Adicione um gateway acima para começar</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-300">Gateways Configurados</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {items.map(g => {
              let credentials = null;
              try {
                if (g.credentials) {
                  credentials = JSON.parse(g.credentials);
                }
              } catch (e) {
                // Não é JSON
              }

              return (
                <div key={g.id} className="relative p-5 rounded-lg border border-gray-700 bg-gradient-to-br from-gray-800/80 to-gray-900/80 hover:border-[#d4af37]/50 transition-all duration-200">
                  {/* Badge de status */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      g.is_active 
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {g.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  {/* Header */}
                  <div className="mb-4 pr-16">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-[#d4af37]/20 flex items-center justify-center border border-[#d4af37]/30">
                        <Activity size={20} className="text-[#d4af37]" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-white">{g.name}</h4>
                        <p className="text-xs text-gray-400 uppercase tracking-wide">{g.type}</p>
                      </div>
                    </div>
                  </div>

                  {/* Credenciais */}
                  {credentials && (
                    <div className="space-y-3 pt-4 border-t border-gray-700/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Client ID</span>
                        <span className="text-white font-mono text-xs bg-gray-900/50 px-2 py-1 rounded">
                          {credentials.client_id || credentials.ci || '—'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Client Secret</span>
                        <span className="text-white font-mono text-xs bg-gray-900/50 px-2 py-1 rounded">
                          {credentials.client_secret || credentials.cs ? '••••••••••••' : '—'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Ambiente</span>
                        <span className={`font-semibold text-xs px-2 py-1 rounded ${
                          credentials.sandbox 
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {credentials.sandbox ? 'Sandbox' : 'Produção'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botão de ação */}
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <button
                      onClick={() => loadForEdit(g)}
                      className="w-full px-4 py-2 bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] rounded-lg text-sm font-semibold transition-all duration-200 border border-[#d4af37]/30 hover:border-[#d4af37]/50"
                    >
                      Editar Gateway
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function IGameWinTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ agent_code: '', agent_key: '', api_url: 'https://api.igamewin.com', credentials: '', is_active: true, rtp: 96, use_demo_mode: false, use_seamless_mode: true });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [games, setGames] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [providerCode, setProviderCode] = useState('');
  const [loadingGames, setLoadingGames] = useState(false);
  const [gamesError, setGamesError] = useState('');
  const [agentBalance, setAgentBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const lastAgentKeyRef = useRef<string>('');

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
    // Validar se há credenciais antes de fazer a chamada - usar agente ativo
    const activeAgent = items.find(a => a.is_active) || items[0];
    if (!activeAgent || !activeAgent.is_active || 
        !activeAgent.agent_code || !activeAgent.agent_key ||
        activeAgent.agent_code.trim() === '' || activeAgent.agent_key.trim() === '' ||
        activeAgent.agent_code.includes('http') || activeAgent.agent_key.includes('http')) {
      setGamesError('Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios ou inválidos)');
      setGames([]);
      setProviders([]);
      return;
    }

    setLoadingGames(true); setGamesError('');
    try {
      const query = provider || providerCode ? `?provider_code=${encodeURIComponent(provider || providerCode)}` : '';
      const res = await fetch(`${API_URL}/api/admin/igamewin/games${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Falha ao carregar jogos/provedores' }));
        throw new Error(data.detail || 'Falha ao carregar jogos/provedores');
      }
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
    } catch (err:any) { 
      setGamesError(err.message); 
      setGames([]);
      setProviders([]);
    }
    finally { setLoadingGames(false); }
  };

  const fetchAgentBalance = async () => {
    // Validar se há credenciais antes de fazer a chamada - usar agente ativo
    const activeAgent = items.find(a => a.is_active) || items[0];
    if (!activeAgent || !activeAgent.is_active || 
        !activeAgent.agent_code || !activeAgent.agent_key ||
        activeAgent.agent_code.trim() === '' || activeAgent.agent_key.trim() === '' ||
        activeAgent.agent_code.includes('http') || activeAgent.agent_key.includes('http')) {
      setBalanceError('Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios ou inválidos)');
      setAgentBalance(null);
      return;
    }

    setLoadingBalance(true); 
    setBalanceError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/igamewin/agent-balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Falha ao carregar saldo do agente' }));
        throw new Error(data.detail || 'Falha ao carregar saldo do agente');
      }
      const data = await res.json();
      setAgentBalance(data.balance);
    } catch (err:any) { 
      setBalanceError(err.message);
      setAgentBalance(null);
    }
    finally { setLoadingBalance(false); }
  };
  const create = async () => {
    setLoading(true); setError('');
    const body = JSON.stringify(form);
    try {
      let res;
      
      if (editingId) {
        // Fazer update do agente existente
        res = await fetch(`${API_URL}/api/admin/igamewin-agents/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body
        });
      } else {
        // Criar novo agente
        res = await fetch(`${API_URL}/api/admin/igamewin-agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body
        });
      }
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Erro ao salvar agente' }));
        throw new Error(data.detail || 'Falha ao salvar agente');
      }
      
      // Limpar formulário e recarregar dados
      setEditingId(null);
      setForm({ agent_code: '', agent_key: '', api_url: 'https://api.igamewin.com', credentials: '', is_active: true, rtp: 96, use_demo_mode: false, use_seamless_mode: true });
      await fetchData();
      
      // Aguardar um pouco para garantir que o banco foi atualizado
      setTimeout(() => {
        if (form.is_active && form.agent_code && form.agent_key) {
          fetchGames();
          fetchAgentBalance();
        }
      }, 500);
    } catch (err:any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadForEdit = (agent: any) => {
    setEditingId(agent.id);
    setForm({
      agent_code: agent.agent_code || '',
      agent_key: agent.agent_key || '',
      api_url: agent.api_url || 'https://api.igamewin.com',
      credentials: agent.credentials || '',
      is_active: agent.is_active !== undefined ? agent.is_active : true,
      rtp: agent.rtp != null ? Number(agent.rtp) : 96,
      use_demo_mode: agent.use_demo_mode ?? false,
      use_seamless_mode: agent.use_seamless_mode ?? true
    });
    // Scroll para o formulário
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ agent_code: '', agent_key: '', api_url: 'https://api.igamewin.com', credentials: '', is_active: true, rtp: 96, use_demo_mode: false, use_seamless_mode: true });
  };

  const deleteAgent = async (agentId: number) => {
    if (!confirm('Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.')) {
      return;
    }

    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/igamewin-agents/${agentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: 'Erro ao excluir agente' }));
        throw new Error(data.detail || 'Falha ao excluir agente');
      }
      
      // Se estava editando o agente excluído, limpar formulário
      if (editingId === agentId) {
        resetForm();
      }
      
      await fetchData();
    } catch (err:any) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // Preencher formulário quando houver um agente existente (apenas se não estiver editando manualmente)
  useEffect(() => {
    // Se estiver editando manualmente, não preencher automaticamente
    if (editingId !== null) {
      return;
    }

    if (items.length === 0) {
      // Se não há agentes, limpar formulário
      setForm({ agent_code: '', agent_key: '', api_url: 'https://api.igamewin.com', credentials: '', is_active: true, rtp: 96, use_demo_mode: false, use_seamless_mode: true });
      setGames([]);
      setProviders([]);
      setAgentBalance(null);
      setBalanceError('');
      setGamesError('Nenhum agente configurado. Configure um agente IGameWin primeiro.');
      lastAgentKeyRef.current = '';
      return;
    }

    // Priorizar agente ativo, senão usar o primeiro
    const agent = items.find(a => a.is_active) || items[0];
    
    // Criar uma chave única para o agente atual
    const agentKey = `${agent.id}-${agent.agent_code || ''}-${agent.agent_key || ''}-${agent.is_active}`;
    
    // Se a chave não mudou, não fazer nada
    if (lastAgentKeyRef.current === agentKey) {
      return;
    }
    
    lastAgentKeyRef.current = agentKey;
    
    // Verificar se o formulário já está atualizado com este agente
    const currentFormKey = `${form.agent_code}-${form.agent_key}-${form.is_active}`;
    const agentFormKey = `${agent.agent_code || ''}-${agent.agent_key || ''}-${agent.is_active}`;
    
    // Só atualizar o formulário se os dados mudaram
    if (currentFormKey !== agentFormKey) {
      const newForm = {
        agent_code: agent.agent_code || '',
        agent_key: agent.agent_key || '',
        api_url: agent.api_url || 'https://api.igamewin.com',
        credentials: agent.credentials || '',
        is_active: agent.is_active !== undefined ? agent.is_active : true,
        rtp: agent.rtp != null ? Number(agent.rtp) : 96,
        use_demo_mode: agent.use_demo_mode ?? false,
        use_seamless_mode: agent.use_seamless_mode ?? true
      };
      setForm(newForm);
    }
    
    // Só buscar jogos e saldo se o agente estiver ativo e tiver credenciais válidas
    if (agent.is_active && agent.agent_code && agent.agent_key && 
        agent.agent_code.trim() !== '' && agent.agent_key.trim() !== '' &&
        !agent.agent_code.includes('http') && !agent.agent_key.includes('http')) {
      // Usar um pequeno delay para evitar chamadas múltiplas
      const timer = setTimeout(() => {
        fetchGames(); 
        fetchAgentBalance();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      // Limpar dados se o agente não estiver válido
      setGames([]);
      setProviders([]);
      setAgentBalance(null);
      setBalanceError('');
      
      // Mensagem mais específica baseada no problema
      if (!agent.is_active) {
        setGamesError('O agente está inativo. Ative o agente para buscar provedores e jogos.');
      } else if (!agent.agent_code || agent.agent_code.trim() === '' || agent.agent_code.includes('http')) {
        setGamesError('Agent Code inválido ou vazio. Verifique se o código do agente está correto (não deve ser uma URL).');
      } else if (!agent.agent_key || agent.agent_key.trim() === '' || agent.agent_key.includes('http')) {
        setGamesError('Agent Key inválida ou vazia. Verifique se a chave do agente está correta.');
      } else {
        setGamesError('Nenhum agente IGameWin ativo configurado ou credenciais incompletas (agent_code/agent_key vazios ou inválidos)');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, JSON.stringify(items.map(a => ({ id: a.id, agent_code: a.agent_code, agent_key: a.agent_key, is_active: a.is_active }))), editingId]);

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
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {gamesError && (
        <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-3 text-orange-400 text-sm">
          {gamesError}
          {items.length > 0 && (
            <div className="mt-2 text-xs text-orange-300">
              💡 Dica: Verifique se o "Agent Code" não contém uma URL. O código do agente deve ser um número ou string alfanumérica, não uma URL.
            </div>
          )}
        </div>
      )}
      {loading && <div className="text-sm text-gray-400">Carregando agente...</div>}

      {/* Saldo do Agente */}
      {(() => {
        const activeAgent = items.find(a => a.is_active) || items[0];
        return activeAgent && activeAgent.is_active && activeAgent.agent_code && activeAgent.agent_key && 
               activeAgent.agent_code.trim() !== '' && activeAgent.agent_key.trim() !== '' &&
               !activeAgent.agent_code.includes('http') && !activeAgent.agent_key.includes('http');
      })() && (
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-5 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-lg font-semibold text-white">Saldo do Agente IGameWin</h3>
              <p className="text-sm text-gray-400 mt-1">Saldo disponível para transações com usuários</p>
            </div>
            <button 
              onClick={fetchAgentBalance}
              disabled={loadingBalance}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
            >
              <RefreshCw size={18} className={loadingBalance ? 'animate-spin' : ''} /> Atualizar
            </button>
          </div>

          {loadingBalance ? (
            <div className="text-center py-4 text-gray-400">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p>Consultando saldo...</p>
            </div>
          ) : balanceError ? (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
              {balanceError}
            </div>
          ) : agentBalance !== null ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#d4af37]">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(agentBalance)}
                </span>
                <span className="text-sm text-gray-400">BRL</span>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-3">
                <div className="flex items-start gap-2">
                  <Activity size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-200">
                    <p className="font-semibold mb-1">Importante:</p>
                    <p>A API da IGameWin não permite adicionar saldo ao agente diretamente. Para adicionar saldo ao agente, é necessário acessar o painel administrativo da IGameWin.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <p>Clique em "Atualizar" para consultar o saldo do agente</p>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 bg-gray-800/60 p-4 rounded border border-gray-700">
        {editingId && (
          <div className="md:col-span-2 bg-blue-500/20 border border-blue-500 rounded p-2 text-blue-300 text-sm">
            ✏️ Editando agente ID: {editingId}
          </div>
        )}
        <input className="bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Agent Code" value={form.agent_code} onChange={e=>setForm({...form, agent_code:e.target.value})}/>
        <input className="bg-gray-700 rounded px-3 py-2 text-sm" placeholder="Agent Key" value={form.agent_key} onChange={e=>setForm({...form, agent_key:e.target.value})}/>
        <input className="bg-gray-700 rounded px-3 py-2 text-sm md:col-span-2" placeholder="API URL" value={form.api_url} onChange={e=>setForm({...form, api_url:e.target.value})}/>
        <div>
          <label className="block text-sm text-gray-400 mb-1">RTP do agente (%)</label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
            value={form.rtp}
            onChange={e=>setForm({...form, rtp: Number(e.target.value)})}
          />
          <p className="text-xs text-gray-500 mt-1">Return to Player. Valor entre 0 e 100 (ex: 96 = 96%). Enviado ao provedor no lançamento do jogo.</p>
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})}/>
            <span>Ativo</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="use_demo_mode" checked={form.use_demo_mode ?? false} onChange={e=>setForm({...form, use_demo_mode:e.target.checked})}/>
            <label htmlFor="use_demo_mode" className="cursor-pointer">
              Modo Samples (Demo)
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="use_seamless_mode" checked={form.use_seamless_mode ?? true} onChange={e=>setForm({...form, use_seamless_mode:e.target.checked})}/>
            <label htmlFor="use_seamless_mode" className="cursor-pointer">
              Seamless Mode (gold_api)
            </label>
          </div>
        </div>
        <p className="text-xs text-amber-400/90 md:col-span-2">Modo Samples: créditos demo. Modo Transfer: dinheiro real (transfer_in/out). Seamless: saldo via gold_api (Site Endpoint).</p>
        <textarea className="bg-gray-700 rounded px-3 py-2 text-sm md:col-span-2" placeholder="Credenciais extras (JSON)" value={form.credentials} onChange={e=>setForm({...form, credentials:e.target.value})}/>
        <div className="md:col-span-2 flex gap-2">
          <button onClick={create} disabled={loading} className="flex-1 bg-[#ff6b35] hover:bg-[#ff7b35] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded font-semibold">
            {editingId ? 'Atualizar agente' : 'Salvar agente'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-4 bg-gray-600 hover:bg-gray-500 text-white py-2 rounded font-semibold">
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-bold">Agentes Configurados ({items.length})</h3>
        {items.length === 0 ? (
          <div className="text-gray-400 text-sm p-4 bg-gray-800/50 rounded border border-gray-700">
            Nenhum agente configurado. Use o formulário acima para criar um novo agente.
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((agent) => (
              <div key={agent.id} className={`p-4 rounded border ${agent.is_active ? 'border-green-500/50 bg-gray-800/50' : 'border-gray-700 bg-gray-800/30'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="font-bold text-lg">{agent.agent_code || 'Sem código'}</div>
                      {agent.is_active && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
                          Ativo
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">API: {agent.api_url}</div>
                    <div className="text-sm text-gray-400">RTP: {agent.rtp != null ? `${Number(agent.rtp)}%` : '96%'}</div>
                    <div className="text-sm text-gray-400">Modo: {agent.use_demo_mode ? 'Samples (Demo)' : 'Transfer (Real)'}</div>
                    <div className="text-sm text-gray-400">API: {agent.use_seamless_mode !== false ? 'Seamless (gold_api)' : 'Transfer'}</div>
                    <div className="text-sm text-gray-400">Status: {agent.is_active ? 'Ativo' : 'Inativo'}</div>
                    {agent.agent_key && (
                      <div className="text-xs text-gray-500 mt-1">Agent Key: {agent.agent_key.substring(0, 10)}...</div>
                    )}
                    {agent.credentials && (
                      <div className="text-xs text-gray-500 break-all mt-1">Credenciais: {agent.credentials}</div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => loadForEdit(agent)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
                      title="Editar agente"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteAgent(agent.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded"
                      title="Excluir agente"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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

      <ProviderOrderSection token={token} providers={providers} loadingGames={loadingGames} />

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

const PIX_KEYS = ['pix_default_name', 'pix_default_tax_id', 'pix_default_email', 'pix_default_phone'] as const;

function SettingsTab({ token }: { token: string }) {
  const [form, setForm] = useState({ min_amount: 2, min_withdrawal: 10, is_active: true });
  const [supportPhone, setSupportPhone] = useState('');
  const [pixDefaults, setPixDefaults] = useState({ pix_default_name: '', pix_default_tax_id: '', pix_default_email: '', pix_default_phone: '' });
  const [loading, setLoading] = useState(false);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [error, setError] = useState('');
  const [supportError, setSupportError] = useState('');
  const [supportSuccess, setSupportSuccess] = useState('');
  const [pixError, setPixError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/ftd-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar configurações');
      const data = await res.json();
      setForm({
        min_amount: data.min_amount ?? 2,
        min_withdrawal: data.min_withdrawal ?? 10,
        is_active: data.is_active
      });
    } catch (err:any) { setError(err.message); } finally { setLoading(false); }
  };

  const loadSupportPhone = async () => {
    setLoadingSupport(true); setSupportError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/site-settings/support_phone`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSupportPhone(data.value || '');
      } else if (res.status === 404) {
        // Configuração não existe ainda, deixar vazio
        setSupportPhone('');
      } else {
        throw new Error('Falha ao carregar número de suporte');
      }
    } catch (err:any) { 
      setSupportError(err.message); 
    } finally { 
      setLoadingSupport(false); 
    }
  };

  const save = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/ftd-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ min_amount: form.min_amount, min_withdrawal: form.min_withdrawal, is_active: form.is_active })
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações');
      await load();
    } catch (err:any) { setError(err.message); } finally { setLoading(false); }
  };

  const saveSupportPhone = async () => {
    setLoadingSupport(true); setSupportError(''); setSupportSuccess('');
    try {
      // Tentar atualizar primeiro
      let res = await fetch(`${API_URL}/api/admin/site-settings/support_phone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value: supportPhone, description: 'Número de telefone para suporte ao cliente (WhatsApp)' })
      });

      // Se não existir, criar
      if (res.status === 404) {
        res = await fetch(`${API_URL}/api/admin/site-settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            key: 'support_phone', 
            value: supportPhone, 
            description: 'Número de telefone para suporte ao cliente (WhatsApp)' 
          })
        });
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Falha ao salvar número de suporte');
      }
      
      setSupportSuccess('Número de suporte salvo com sucesso!');
      setTimeout(() => setSupportSuccess(''), 3000);
      await loadSupportPhone();
    } catch (err:any) { 
      setSupportError(err.message); 
    } finally { 
      setLoadingSupport(false); 
    }
  };

  const loadPixDefaults = async () => {
    setLoadingPix(true); setPixError('');
    try {
      const vals: Record<string, string> = {};
      for (const k of PIX_KEYS) {
        const res = await fetch(`${API_URL}/api/admin/site-settings/${k}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          vals[k] = d.value || '';
        } else {
          vals[k] = '';
        }
      }
      setPixDefaults(vals as typeof pixDefaults);
    } catch (e: any) {
      setPixError(e.message);
    } finally {
      setLoadingPix(false);
    }
  };

  const savePixDefaults = async () => {
    setLoadingPix(true); setPixError('');
    try {
      for (const k of PIX_KEYS) {
        const v = pixDefaults[k as keyof typeof pixDefaults] || '';
        let res = await fetch(`${API_URL}/api/admin/site-settings/${k}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ value: v, description: `Dados PIX padrão: ${k}` })
        });
        if (res.status === 404) {
          res = await fetch(`${API_URL}/api/admin/site-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ key: k, value: v, description: `Dados PIX padrão: ${k}` })
          });
        }
        if (!res.ok) throw new Error('Falha ao salvar');
      }
      await loadPixDefaults();
    } catch (e: any) {
      setPixError(e.message);
    } finally {
      setLoadingPix(false);
    }
  };

  useEffect(() => { 
    load(); 
    loadSupportPhone();
    loadPixDefaults();
  }, []);

  return (
    <div className="space-y-6">
      {/* Depósito mínimo e Saque mínimo (validação) */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-sm text-gray-400">Valores mínimos para depósitos e saques. FTD e Reload estão em Promoções.</p>
        {error && <div className="text-red-400">{error}</div>}
        {loading && <div className="text-sm text-gray-400">Carregando...</div>}
        <div className="grid md:grid-cols-2 gap-3 bg-gray-800/60 p-4 rounded border border-gray-700">
          <div>
            <label className="text-sm text-gray-300">Depósito mínimo (R$)</label>
            <input type="number" step="0.01" min="0" className="w-full bg-gray-700 rounded px-3 py-2" value={form.min_amount} onChange={e=>setForm({...form, min_amount:Number(e.target.value)})}/>
          </div>
          <div>
            <label className="text-sm text-gray-300">Saque mínimo (R$)</label>
            <input type="number" step="0.01" min="0" className="w-full bg-gray-700 rounded px-3 py-2" value={form.min_withdrawal} onChange={e=>setForm({...form, min_withdrawal:Number(e.target.value)})}/>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form, is_active:e.target.checked})}/>
            <span>Ativo</span>
          </div>
          <button onClick={save} className="md:col-span-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white py-2 rounded font-semibold">Salvar</button>
        </div>
      </div>

      {/* Dados PIX padrão (depósito/saque - mesmo para todos os usuários) */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dados PIX padrão</h2>
        <p className="text-sm text-gray-400">Usados para gerar depósitos e saques. Configure uma vez e será usado para todos os usuários.</p>
        {pixError && <div className="text-red-400">{pixError}</div>}
        {loadingPix && <div className="text-sm text-gray-400">Carregando...</div>}
        <div className="grid md:grid-cols-2 gap-3 bg-gray-800/60 p-4 rounded border border-gray-700">
          <div>
            <label className="text-sm text-gray-300">Nome</label>
            <input type="text" className="w-full bg-gray-700 rounded px-3 py-2" placeholder="Nome do titular" value={pixDefaults.pix_default_name} onChange={e=>setPixDefaults({...pixDefaults, pix_default_name:e.target.value})}/>
          </div>
          <div>
            <label className="text-sm text-gray-300">CPF/CNPJ</label>
            <input type="text" className="w-full bg-gray-700 rounded px-3 py-2" placeholder="000.000.000-00" value={pixDefaults.pix_default_tax_id} onChange={e=>setPixDefaults({...pixDefaults, pix_default_tax_id:e.target.value})}/>
          </div>
          <div>
            <label className="text-sm text-gray-300">E-mail</label>
            <input type="email" className="w-full bg-gray-700 rounded px-3 py-2" placeholder="email@exemplo.com" value={pixDefaults.pix_default_email} onChange={e=>setPixDefaults({...pixDefaults, pix_default_email:e.target.value})}/>
          </div>
          <div>
            <label className="text-sm text-gray-300">Telefone</label>
            <input type="text" className="w-full bg-gray-700 rounded px-3 py-2" placeholder="5511999999999" value={pixDefaults.pix_default_phone} onChange={e=>setPixDefaults({...pixDefaults, pix_default_phone:e.target.value})}/>
          </div>
          <button onClick={savePixDefaults} disabled={loadingPix} className="md:col-span-2 bg-[#ff6b35] hover:bg-[#ff7b35] disabled:opacity-50 text-white py-2 rounded font-semibold">Salvar dados PIX</button>
        </div>
      </div>

      {/* Configurações de Suporte */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Configurações de Suporte</h2>
        {supportError && <div className="text-red-400">{supportError}</div>}
        {supportSuccess && <div className="text-green-400">{supportSuccess}</div>}
        {loadingSupport && <div className="text-sm text-gray-400">Carregando...</div>}
        <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <div>
            <label className="text-sm text-gray-300 block mb-2">
              Número de Suporte (WhatsApp)
            </label>
            <input 
              type="text" 
              className="w-full bg-gray-700 rounded px-3 py-2" 
              placeholder="Ex: 5511999999999 (código do país + DDD + número)"
              value={supportPhone} 
              onChange={e => setSupportPhone(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Digite o número completo com código do país (ex: 5511999999999). Este número será usado no botão de chat do site.
            </p>
          </div>
          <button 
            onClick={saveSupportPhone} 
            disabled={loadingSupport}
            className="bg-[#ff6b35] hover:bg-[#ff7b35] disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded font-semibold"
          >
            {loadingSupport ? 'Salvando...' : 'Salvar Número de Suporte'}
          </button>
        </div>
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
                        {logo.is_active ? '[Ativo]' : '[Inativo]'}
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
                      Posição: {index + 1} {banner.is_active ? '| [Ativo]' : '| [Inativo]'}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveBanner(banner.id, 'up')}
                        disabled={loading || index === 0}
                        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        ^
                      </button>
                      <button
                        onClick={() => moveBanner(banner.id, 'down')}
                        disabled={loading || index === banners.length - 1}
                        className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        v
                      </button>
                      <button
                        onClick={() => toggleActive(banner.id)}
                        className={`text-xs px-2 py-1 rounded ${banner.is_active ? 'bg-gray-700 hover:bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        disabled={loading}
                      >
                        {banner.is_active ? 'ON' : 'OFF'}
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

// ========== AFFILIATES TAB ==========
function AffiliatesTab({ token }: { token: string }) {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    user_id: '',
    affiliate_code: '',
    cpa_amount: '',
    revshare_percentage: ''
  });
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchAffiliates();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err);
    }
  };

  const fetchAffiliates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/affiliates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar afiliados');
      setAffiliates(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        user_id: parseInt(form.user_id),
        affiliate_code: form.affiliate_code,
        cpa_amount: parseFloat(form.cpa_amount) || 0,
        revshare_percentage: parseFloat(form.revshare_percentage) || 0
      };

      let res;
      if (editingId) {
        res = await fetch(`${API_URL}/api/admin/affiliates/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            cpa_amount: payload.cpa_amount,
            revshare_percentage: payload.revshare_percentage
          })
        });
      } else {
        res = await fetch(`${API_URL}/api/admin/affiliates`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Erro ao salvar afiliado');
      }

      setSuccess(editingId ? 'Afiliado atualizado!' : 'Afiliado criado!');
      resetForm();
      fetchAffiliates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setForm({ user_id: '', affiliate_code: '', cpa_amount: '', revshare_percentage: '' });
    setEditingId(null);
  };

  const loadForEdit = (affiliate: any) => {
    setEditingId(affiliate.id);
    setForm({
      user_id: affiliate.user_id.toString(),
      affiliate_code: affiliate.affiliate_code,
      cpa_amount: affiliate.cpa_amount.toString(),
      revshare_percentage: affiliate.revshare_percentage.toString()
    });
  };

  const deleteAffiliate = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este afiliado?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/affiliates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao deletar');
      fetchAffiliates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
      <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Afiliados</h2>
        <button onClick={fetchAffiliates} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500 rounded p-3 mb-4 text-red-400">{error}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 rounded p-3 mb-4 text-green-400">{success}</div>}

      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Afiliado' : 'Criar Novo Afiliado'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Usuário</label>
              <select
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none"
                value={form.user_id}
                onChange={e => setForm({...form, user_id: e.target.value})}
                required={!editingId}
                disabled={!!editingId}
              >
                <option value="">Selecione um usuário</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                ))}
              </select>
        </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Código do Afiliado</label>
              <input
                type="text"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none"
                value={form.affiliate_code}
                onChange={e => setForm({...form, affiliate_code: e.target.value})}
                required={!editingId}
                disabled={!!editingId}
                placeholder="Ex: AFF001"
              />
        </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">CPA (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none"
                value={form.cpa_amount}
                onChange={e => setForm({...form, cpa_amount: e.target.value})}
                required
                placeholder="0.00"
              />
        </div>
              <div>
              <label className="block text-sm text-gray-400 mb-1">Revshare (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none"
                value={form.revshare_percentage}
                onChange={e => setForm({...form, revshare_percentage: e.target.value})}
                required
                placeholder="0.00"
              />
              </div>
              </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#d4af37] hover:bg-[#ffd700] text-black font-semibold rounded disabled:opacity-50"
            >
              {editingId ? 'Atualizar' : 'Criar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancelar
              </button>
              )}
            </div>
        </form>
          </div>

      <TabTable
        title="Lista de Afiliados"
        loading={loading}
        error={error}
        onRefresh={fetchAffiliates}
        columns={['ID', 'Usuário', 'Código', 'CPA (R$)', 'Revshare (%)', 'Total Ganho', 'Indicações', 'Status', 'Ações']}
        rows={affiliates.map(a => [
          a.id,
          a.user_id,
          a.affiliate_code,
          `R$ ${a.cpa_amount.toFixed(2)}`,
          `${a.revshare_percentage.toFixed(2)}%`,
          `R$ ${a.total_earnings.toFixed(2)}`,
          a.total_referrals,
          a.is_active ? 'Ativo' : 'Inativo',
          <div key={a.id} className="flex gap-2">
            <button onClick={() => loadForEdit(a)} className="text-blue-400 hover:text-blue-300 text-xs">Editar</button>
            <button onClick={() => deleteAffiliate(a.id)} className="text-red-400 hover:text-red-300 text-xs">Deletar</button>
      </div>
        ])}
      />
    </div>
  );
}

// ========== THEMES TAB (Updated to use API) ==========
function ThemesTab({ token }: { token: string }) {
  const { refreshTheme } = useTheme();
  const [themes, setThemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    primary: '#0a4d3e',
    secondary: '#0d5d4b',
    accent: '#d4af37',
    background: '#0a0e0f',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    is_active: false
  });

  useEffect(() => {
    fetchThemes();
    loadActiveTheme();
  }, []);

  // Aplicar cores em tempo real enquanto edita/cria
  useEffect(() => {
    if (showNewForm || editingId) {
      applyThemeToPage(JSON.stringify({
        primary: form.primary,
        secondary: form.secondary,
        accent: form.accent,
        background: form.background,
        text: form.text,
        textSecondary: form.textSecondary,
        success: form.success,
        error: form.error,
        warning: form.warning
      }));
    }
  }, [form.primary, form.secondary, form.accent, form.background, form.text, form.textSecondary, form.success, form.error, form.warning, showNewForm, editingId]);

  const loadActiveTheme = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/themes/active`);
      if (res.ok) {
        const theme = await res.json();
        applyThemeToPage(theme.colors_json);
      }
    } catch (err) {
      console.error('Erro ao carregar tema:', err);
    }
  };

  const applyThemeToPage = (colorsJson: string) => {
    try {
      const colors = JSON.parse(colorsJson);
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
    } catch (err) {
      console.error('Erro ao aplicar tema:', err);
    }
  };

  const fetchThemes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/themes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar temas');
      const data = await res.json();
      setThemes(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getColorsJson = () => {
    return JSON.stringify({
      primary: form.primary,
      secondary: form.secondary,
      accent: form.accent,
      background: form.background,
      text: form.text,
      textSecondary: form.textSecondary,
      success: form.success,
      error: form.error,
      warning: form.warning
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const colorsJson = getColorsJson();
      let res;
      if (editingId) {
        res = await fetch(`${API_URL}/api/admin/themes/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: form.name,
            colors_json: colorsJson
          })
        });
      } else {
        res = await fetch(`${API_URL}/api/admin/themes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: form.name,
            colors_json: colorsJson,
            is_active: form.is_active ?? false
          })
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Erro ao salvar tema');
      }

      setSuccess(editingId ? 'Tema atualizado!' : 'Tema criado!');
      resetForm();
      fetchThemes();
      refreshTheme(); // Atualizar tema na plataforma
    } catch (err: any) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      primary: '#0a4d3e',
      secondary: '#0d5d4b',
      accent: '#d4af37',
      background: '#0a0e0f',
      text: '#ffffff',
      textSecondary: '#9ca3af',
      success: '#10b981',
      error: '#ef4444',
      warning: '#f59e0b',
      is_active: false
    });
    setEditingId(null);
    setShowNewForm(false);
    loadActiveTheme(); // Restaurar tema ativo ao cancelar
  };

  const loadForEdit = (theme: any) => {
    try {
      const colors = JSON.parse(theme.colors_json);
      setEditingId(theme.id);
      setForm({
        name: theme.name,
        primary: colors.primary || '#0a4d3e',
        secondary: colors.secondary || '#0d5d4b',
        accent: colors.accent || '#d4af37',
        background: colors.background || '#0a0e0f',
        text: colors.text || '#ffffff',
        textSecondary: colors.textSecondary || '#9ca3af',
        success: colors.success || '#10b981',
        error: colors.error || '#ef4444',
        warning: colors.warning || '#f59e0b',
        is_active: theme.is_active ?? false
      });
      setShowNewForm(false);
    } catch (err) {
      console.error('Erro ao carregar tema para edição:', err);
    }
  };

  const deleteTheme = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar este tema?')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/themes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao deletar');
      fetchThemes();
      if (editingId === id) {
        resetForm();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const activateTheme = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/themes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: true })
      });
      if (!res.ok) throw new Error('Erro ao ativar tema');
      fetchThemes();
      // Aplicar tema imediatamente
      const theme = themes.find(t => t.id === id);
      if (theme) {
        applyThemeToPage(theme.colors_json);
      }
      refreshTheme(); // Atualizar tema na plataforma
    } catch (err: any) {
      setError(err.message);
    }
  };

  const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => {
  return (
      <div>
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
        <div className="flex items-center gap-2">
          <div className="w-12 h-12 rounded border-2 border-gray-600" style={{ backgroundColor: value }} />
          <input
            type="text"
            className="flex-1 bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none font-mono"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="#000000"
          />
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-12 h-12 rounded border border-gray-600 cursor-pointer"
          />
        </div>
      </div>
    );
  };

  const ThemeCard = ({ theme }: { theme: any }) => {
    let colors: any = {};
    try {
      colors = JSON.parse(theme.colors_json);
    } catch (err) {
      colors = {};
    }

    const colorSwatches = [
      colors.primary,
      colors.secondary,
      colors.accent,
      colors.success
    ].filter(Boolean);

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{theme.name}</h3>
          {theme.is_active && (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Ativo</span>
          )}
        </div>
        <div className="flex gap-2 mb-3">
          {colorSwatches.map((color, idx) => (
            <div
              key={idx}
              className="w-8 h-8 rounded border border-gray-600"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <div className="flex gap-2">
          {!theme.is_active && (
            <button
              onClick={() => activateTheme(theme.id)}
              className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
            >
              Ativar
            </button>
          )}
          <button
            onClick={() => loadForEdit(theme)}
            className="flex-1 px-3 py-2 bg-[#d4af37] hover:bg-[#ffd700] text-black rounded text-sm font-semibold"
          >
            Editar
          </button>
          {!theme.is_active && (
            <button
              onClick={() => deleteTheme(theme.id)}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
            >
              Deletar
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gerenciar Temas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              resetForm();
              setShowNewForm(true);
            }}
            className="px-4 py-2 bg-[#0a4d3e] hover:bg-[#0d5d4b] text-white font-semibold rounded flex items-center gap-2"
          >
            + Novo Tema
          </button>
          <button onClick={fetchThemes} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
      </div>

      {error && <div className="bg-red-500/20 border border-red-500 rounded p-3 mb-4 text-red-400">{error}</div>}
      {success && <div className="bg-green-500/20 border border-green-500 rounded p-3 mb-4 text-green-400">{success}</div>}

      {(editingId || showNewForm) && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <h3 className="text-lg font-bold mb-4">{editingId ? 'Editar Tema' : 'Criar Novo Tema'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome do Tema</label>
              <input
                type="text"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm border border-gray-600 focus:border-[#d4af37] focus:outline-none"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                required
                placeholder="Ex: Tema Escuro"
              />
            </div>

            {!editingId && (
              <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded border border-gray-600">
                <input
                  type="checkbox"
                  id="theme_is_active"
                  checked={form.is_active ?? false}
                  onChange={e => setForm({...form, is_active: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="theme_is_active" className="text-sm cursor-pointer">
                  Usar como tema principal na plataforma (substitui o tema atual)
                </label>
              </div>
            )}
            {editingId && (
              <p className="text-sm text-gray-400">Use o botão &quot;Ativar&quot; no card do tema para torná-lo o principal.</p>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <ColorInput
                label="Cor Primária"
                value={form.primary}
                onChange={v => setForm({...form, primary: v})}
              />
              <ColorInput
                label="Cor Secundária"
                value={form.secondary}
                onChange={v => setForm({...form, secondary: v})}
              />
              <ColorInput
                label="Cor de Acento"
                value={form.accent}
                onChange={v => setForm({...form, accent: v})}
              />
              <ColorInput
                label="Cor de Sucesso"
                value={form.success}
                onChange={v => setForm({...form, success: v})}
              />
              <ColorInput
                label="Cor do Texto"
                value={form.text}
                onChange={v => setForm({...form, text: v})}
              />
              <ColorInput
                label="Cor do Texto Secundário"
                value={form.textSecondary}
                onChange={v => setForm({...form, textSecondary: v})}
              />
              <ColorInput
                label="Cor de Fundo"
                value={form.background}
                onChange={v => setForm({...form, background: v})}
              />
              <ColorInput
                label="Cor de Erro"
                value={form.error}
                onChange={v => setForm({...form, error: v})}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-[#d4af37] hover:bg-[#ffd700] text-black font-semibold rounded disabled:opacity-50"
              >
                {editingId ? 'Atualizar Tema' : 'Criar Tema'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {themes.map(theme => (
          <ThemeCard key={theme.id} theme={theme} />
        ))}
      </div>

      {themes.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-400">
          <p>Nenhum tema criado ainda.</p>
          <p className="text-sm mt-2">Clique em "+ Novo Tema" para criar seu primeiro tema.</p>
        </div>
      )}
    </div>
  );
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
// ========== GGR TAB ==========
function GGRTab({ token }: { token: string }) {
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
function BetsTab({ token }: { token: string }) {
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
        b.username || `#${b.user_id}`,
        b.game_name || b.game_id || '-',
        b.provider || '-',
        `R$ ${(b.amount ?? 0).toFixed(2).replace('.', ',')}`,
        `R$ ${(b.win_amount ?? 0).toFixed(2).replace('.', ',')}`,
        b.status || '-',
        b.created_at ? new Date(b.created_at).toLocaleString('pt-BR') : '-'
      ])}
    />
  );
}

// ========== NOTIFICATIONS TAB ==========
function NotificationsTab({ token }: { token: string }) {
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

function ProviderOrderSection({ token, providers, loadingGames }: { token: string; providers: any[]; loadingGames: boolean }) {
  const [sortedProviders, setSortedProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/provider-orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar ordens');
      const ordersData = await res.json();
      
      // Ordenar provedores baseado nas ordens
      const providerOrders = providers.map((p) => {
        const code = p.code || p.provider_code || p.name || '';
        const name = p.name || p.code || p.provider_code || '—';
        const order = ordersData.find((o: any) => o.provider_code === code);
        return {
          ...p,
          code,
          name,
          display_order: order?.display_order ?? 999,
          is_priority: order?.is_priority ?? false
        };
      }).sort((a, b) => {
        if (a.is_priority && !b.is_priority) return -1;
        if (!a.is_priority && b.is_priority) return 1;
        return a.display_order - b.display_order;
      });
      
      setSortedProviders(providerOrders);
    } catch (err: any) {
      setError(err.message);
      // Se não há ordens, usar ordem padrão
      setSortedProviders(providers.map((p, idx) => ({
        ...p,
        code: p.code || p.provider_code || p.name || '',
        name: p.name || p.code || p.provider_code || '—',
        display_order: idx + 1,
        is_priority: idx < 3
      })));
    } finally {
      setLoading(false);
    }
  };

  const saveOrders = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const ordersToSave = sortedProviders.map((p, idx) => ({
        provider_code: p.code,
        display_order: idx + 1,
        is_priority: idx < 3 // Primeiros 3 são prioritários
      }));

      const res = await fetch(`${API_URL}/api/admin/provider-orders/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(ordersToSave)
      });
      if (!res.ok) throw new Error('Falha ao salvar ordens');
      setSuccess('Ordem dos provedores salva com sucesso!');
      await fetchOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (providers.length > 0) {
      fetchOrders();
    }
  }, [providers.length]);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newProviders = [...sortedProviders];
    [newProviders[index - 1], newProviders[index]] = [newProviders[index], newProviders[index - 1]];
    setSortedProviders(newProviders);
  };

  const moveDown = (index: number) => {
    if (index >= sortedProviders.length - 1) return;
    const newProviders = [...sortedProviders];
    [newProviders[index], newProviders[index + 1]] = [newProviders[index + 1], newProviders[index]];
    setSortedProviders(newProviders);
  };

  return (
    <div className="space-y-3 mt-6 bg-gray-800/60 p-4 rounded border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold">Ordenar Provedores</h3>
          <p className="text-sm text-gray-400">
            Defina a ordem de exibição dos provedores. Os <strong className="text-[#d4af37]">primeiros 3</strong> serão os únicos a aparecer na home com <strong className="text-[#d4af37]">15 jogos cada</strong>.
          </p>
        </div>
        <button
          onClick={saveOrders}
          disabled={loading}
          className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar Ordem'}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      {success && <div className="text-green-400 text-sm">{success}</div>}
      {loadingGames ? (
        <div className="text-gray-400">Carregando provedores...</div>
      ) : (
        <div className="space-y-2">
          {sortedProviders.map((p, idx) => (
            <div
              key={p.code}
              className={`flex items-center gap-3 p-3 rounded border ${
                idx < 3 ? 'bg-[#d4af37]/10 border-[#d4af37]/30' : 'bg-gray-700/50 border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="p-1 hover:bg-gray-600 rounded disabled:opacity-30"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx >= sortedProviders.length - 1}
                  className="p-1 hover:bg-gray-600 rounded disabled:opacity-30"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
              <GripVertical size={18} className="text-gray-400" />
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-xs text-gray-400">{p.code}</div>
              </div>
              {idx < 3 && (
                <span className="px-2 py-1 bg-[#d4af37] text-black text-xs font-bold rounded">
                  Prioridade {idx + 1}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PromotionsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ftdForm, setFtdForm] = useState({ ftd_bonus_percentage: 0, reload_bonus_percentage: 0, reload_bonus_min_deposit: 0 });
  const [ftdLoading, setFtdLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    display_order: 0,
    is_active: true,
    valid_from: '',
    valid_until: '',
    promotion_type: 'display',
    bonus_value: 0,
    min_deposit: 0,
  });

  const fetchPromotions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/promotions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar promoções');
      setItems(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFtdSettings = async () => {
    setFtdLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/ftd-settings`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setFtdForm({
          ftd_bonus_percentage: d.ftd_bonus_percentage ?? 0,
          reload_bonus_percentage: d.reload_bonus_percentage ?? 0,
          reload_bonus_min_deposit: d.reload_bonus_min_deposit ?? 0,
        });
      }
    } catch (_) {}
    finally { setFtdLoading(false); }
  };

  const saveFtdSettings = async () => {
    setFtdLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/ftd-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(ftdForm),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      await fetchFtdSettings();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFtdLoading(false);
    }
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setShowForm(true);
    setForm({
      title: p.title || '',
      description: p.description || '',
      image_url: p.image_url || '',
      link_url: p.link_url || '',
      display_order: p.display_order ?? 0,
      is_active: p.is_active ?? true,
      valid_from: p.valid_from ? p.valid_from.slice(0, 16) : '',
      valid_until: p.valid_until ? p.valid_until.slice(0, 16) : '',
      promotion_type: p.promotion_type || 'display',
      bonus_value: p.bonus_value ?? 0,
      min_deposit: p.min_deposit ?? 0,
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ title: '', description: '', image_url: '', link_url: '', display_order: 0, is_active: true, valid_from: '', valid_until: '', promotion_type: 'display', bonus_value: 0, min_deposit: 0 });
    setError('');
  };

  const savePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url.trim() || null,
        link_url: form.link_url.trim() || null,
        display_order: form.display_order,
        is_active: form.is_active,
        promotion_type: form.promotion_type,
        bonus_value: form.bonus_value,
        min_deposit: form.min_deposit,
      };
      if (form.valid_from) body.valid_from = form.valid_from + ':00';
      if (form.valid_until) body.valid_until = form.valid_until + ':00';
      const url = editingId ? `${API_URL}/api/admin/promotions/${editingId}` : `${API_URL}/api/admin/promotions`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Falha ao salvar');
      }
      await fetchPromotions();
      cancelForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (p: any) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/promotions/${p.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar');
      await fetchPromotions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deletePromotion = async (id: number) => {
    if (!confirm('Excluir esta promoção?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/promotions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      await fetchPromotions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
    fetchFtdSettings();
  }, []);

  const formatDate = (s: string) => {
    if (!s) return '-';
    try {
      const d = new Date(s);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return s || '-';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Promoções</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (showForm ? cancelForm() : setShowForm(true))}
            className="px-3 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black rounded font-semibold"
          >
            {showForm ? 'Cancelar' : 'Nova Promoção'}
          </button>
          <button onClick={fetchPromotions} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
      </div>
      {error && <div className="text-red-400">{error}</div>}

      {/* FTD e Reload - configurações de bônus de depósito */}
      <div className="bg-gray-800/60 p-4 rounded border border-gray-700">
        <h3 className="font-semibold mb-3">Bônus de Depósito (FTD e Reload)</h3>
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-400">Bônus 1º depósito (%)</label>
            <input type="number" step="0.1" min="0" max="1000" className="w-full bg-gray-700 rounded px-3 py-2" value={ftdForm.ftd_bonus_percentage} onChange={e=>setFtdForm({...ftdForm, ftd_bonus_percentage:Number(e.target.value)})}/>
            <p className="text-xs text-gray-500">Ex: 100 = dobra. Bônus não sacável.</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Bônus Reload (%)</label>
            <input type="number" step="0.1" min="0" max="1000" className="w-full bg-gray-700 rounded px-3 py-2" value={ftdForm.reload_bonus_percentage} onChange={e=>setFtdForm({...ftdForm, reload_bonus_percentage:Number(e.target.value)})}/>
            <p className="text-xs text-gray-500">Depósitos após o 1º.</p>
          </div>
          <div>
            <label className="text-sm text-gray-400">Dep. mínimo Reload (R$)</label>
            <input type="number" step="0.01" min="0" className="w-full bg-gray-700 rounded px-3 py-2" value={ftdForm.reload_bonus_min_deposit} onChange={e=>setFtdForm({...ftdForm, reload_bonus_min_deposit:Number(e.target.value)})}/>
          </div>
        </div>
        <button onClick={saveFtdSettings} disabled={ftdLoading} className="mt-3 px-4 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] disabled:opacity-50 text-white rounded font-semibold">Salvar FTD/Reload</button>
      </div>

      {showForm && (
        <form onSubmit={savePromotion} className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <h3 className="font-semibold">{editingId ? 'Editar promoção' : 'Criar promoção'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400">Tipo *</label>
              <select className="w-full bg-gray-700 rounded px-3 py-2 text-sm" value={form.promotion_type} onChange={e=>setForm({...form, promotion_type:e.target.value})}>
                <option value="display">Apenas exibição (banner)</option>
                <option value="cashback">Cashback (% de perdas devolvido)</option>
              </select>
              <p className="text-xs text-gray-500">Cashback: ao perder, usuário recebe % do valor apostado como bônus.</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400">Título *</label>
              <input
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Cashback 25%"
              />
            </div>
            {form.promotion_type === 'cashback' && (
              <>
                <div>
                  <label className="text-sm text-gray-400">Bônus (%) *</label>
                  <input type="number" step="0.1" min="0" max="100" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" value={form.bonus_value} onChange={e=>setForm({...form, bonus_value:Number(e.target.value)})} placeholder="25"/>
                  <p className="text-xs text-gray-500">Ex: 25 = 25% das perdas devolvido como bônus.</p>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Depósito mínimo (R$)</label>
                  <input type="number" step="0.01" min="0" className="w-full bg-gray-700 rounded px-3 py-2 text-sm" value={form.min_deposit} onChange={e=>setForm({...form, min_deposit:Number(e.target.value)})} placeholder="0"/>
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <label className="text-sm text-gray-400">Descrição</label>
              <textarea
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalhes da promoção"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">URL da imagem</label>
              <input
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Link (ex: /depositar)</label>
              <input
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="/depositar ou https://..."
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Ordem de exibição</label>
              <input
                type="number"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Válido de</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.valid_from}
                onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Válido até</label>
              <input
                type="datetime-local"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm">Ativa (visível para usuários)</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white rounded font-semibold">
              {editingId ? 'Salvar' : 'Criar promoção'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelForm} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
      {loading && !items.length && <div className="text-gray-400">Carregando...</div>}
      {!loading && items.length === 0 && !showForm && (
        <div className="bg-gray-800/60 p-6 rounded border border-gray-700 text-center text-gray-400">
          Nenhuma promoção cadastrada. Clique em Nova Promoção para criar.
        </div>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-3">Título</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Link</th>
                <th className="text-left p-3">Ordem</th>
                <th className="text-left p-3">Válido até</th>
                <th className="text-left p-3">Ativa</th>
                <th className="text-left p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                  <td className="p-3 font-medium">{p.title}</td>
                  <td className="p-3">
                    <span className={p.promotion_type === 'cashback' ? 'text-green-400' : 'text-gray-400'}>
                      {p.promotion_type === 'cashback' ? `Cashback ${p.bonus_value || 0}%` : 'Exibição'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-400">{p.link_url || '-'}</td>
                  <td className="p-3">{p.display_order}</td>
                  <td className="p-3">{formatDate(p.valid_until)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(p)}
                      className={`px-2 py-1 rounded text-xs font-medium ${p.is_active ? 'bg-green-600/80 text-white' : 'bg-gray-600 text-gray-300'}`}
                    >
                      {p.is_active ? 'Ativa' : 'Inativa'}
                    </button>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button type="button" onClick={() => openEdit(p)} className="text-[#d4af37] hover:text-[#c5a028] text-xs">
                      Editar
                    </button>
                    <button type="button" onClick={() => deletePromotion(p.id)} className="text-red-400 hover:text-red-300 text-xs">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type CouponFormState = {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_deposit: number;
  max_uses: number;
  valid_until: string;
  is_active: boolean;
};

const emptyCouponForm: CouponFormState = {
  code: '',
  discount_type: 'percent',
  discount_value: 0,
  min_deposit: 0,
  max_uses: 0,
  valid_until: '',
  is_active: true,
};

function CouponsTab({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CouponFormState>(emptyCouponForm);

  const fetchCoupons = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/coupons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao carregar cupons');
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setShowForm(true);
    setForm({
      code: c.code || '',
      discount_type: c.discount_type === 'fixed' ? 'fixed' : 'percent',
      discount_value: c.discount_value ?? 0,
      min_deposit: c.min_deposit ?? 0,
      max_uses: c.max_uses ?? 0,
      valid_until: c.valid_until ? c.valid_until.slice(0, 10) : '',
      is_active: c.is_active ?? true,
    });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyCouponForm);
    setError('');
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setError('Código é obrigatório');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body: any = {
        code: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_deposit: form.min_deposit,
        max_uses: form.max_uses,
        is_active: form.is_active,
      };
      if (form.valid_until) body.valid_until = form.valid_until + 'T23:59:59';
      const url = editingId
        ? `${API_URL}/api/admin/coupons/${editingId}`
        : `${API_URL}/api/admin/coupons`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || (editingId ? 'Falha ao atualizar cupom' : 'Falha ao criar cupom'));
      }
      await fetchCoupons();
      cancelForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm('Excluir este cupom?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      await fetchCoupons();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const formatDate = (s: string) => {
    if (!s) return '-';
    try {
      const d = new Date(s);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return s || '-';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cupons</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (showForm ? cancelForm() : setShowForm(true))}
            className="px-3 py-2 bg-[#d4af37] hover:bg-[#c5a028] text-black rounded font-semibold"
          >
            {showForm ? 'Cancelar' : 'Novo Cupom'}
          </button>
          <button onClick={fetchCoupons} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
            <RefreshCw size={18} /> Atualizar
          </button>
        </div>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      {showForm && (
        <form onSubmit={saveCoupon} className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-3">
          <h3 className="font-semibold">{editingId ? 'Editar cupom' : 'Criar cupom'}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400">Código *</label>
              <input
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="Ex: BEMVINDO10"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Tipo</label>
              <select
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.discount_type}
                onChange={(e) => setForm({ ...form, discount_type: e.target.value as 'percent' | 'fixed' })}
              >
                <option value="percent">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Valor do desconto {form.discount_type === 'percent' ? '(%)' : '(R$)'}</label>
              <input
                type="number"
                step={form.discount_type === 'percent' ? 1 : 0.01}
                min={0}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.discount_value}
                onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Depósito mínimo (R$)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.min_deposit}
                onChange={(e) => setForm({ ...form, min_deposit: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Máx. usos (0 = ilimitado)</label>
              <input
                type="number"
                min={0}
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.max_uses}
                onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Válido até (data)</label>
              <input
                type="date"
                className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
                value={form.valid_until}
                onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm">Ativo</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white rounded font-semibold">
              {editingId ? 'Salvar' : 'Criar cupom'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelForm} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-semibold">
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
      {loading && !items.length && <div className="text-gray-400">Carregando...</div>}
      {!loading && items.length === 0 && !showForm && (
        <div className="bg-gray-800/60 p-6 rounded border border-gray-700 text-center text-gray-400">
          Nenhum cupom cadastrado. Clique em Novo Cupom para criar.
        </div>
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="text-left p-3">Código</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Valor</th>
                <th className="text-left p-3">Dep. mín.</th>
                <th className="text-left p-3">Usos</th>
                <th className="text-left p-3">Válido até</th>
                <th className="text-left p-3">Ativo</th>
                <th className="text-left p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-gray-700 hover:bg-gray-800/50">
                  <td className="p-3 font-mono">{c.code}</td>
                  <td className="p-3">{c.discount_type === 'percent' ? '%' : 'R$'}</td>
                  <td className="p-3">{c.discount_type === 'percent' ? `${c.discount_value}%` : `R$ ${c.discount_value?.toFixed(2)}`}</td>
                  <td className="p-3">R$ {c.min_deposit?.toFixed(2)}</td>
                  <td className="p-3">{c.max_uses === 0 ? '∞' : `${c.used_count ?? 0}/${c.max_uses}`}</td>
                  <td className="p-3">{formatDate(c.valid_until)}</td>
                  <td className="p-3">{c.is_active ? 'Sim' : 'Não'}</td>
                  <td className="p-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="text-[#d4af37] hover:text-[#c5a028] text-xs"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCoupon(c.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TrackingTab({ token }: { token: string }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    platform: 'meta',
    pixel_id: '',
    access_token: '',
    webhook_url: '',
    webhook_verify_token: '',
    is_active: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/tracking-configs?platform=meta`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao carregar configurações');
      const data = await res.json();
      setConfigs(data);
      if (data.length > 0) {
        const first = data[0];
        setForm({
          platform: first.platform || 'meta',
          pixel_id: first.pixel_id || '',
          access_token: first.access_token || '',
          webhook_url: first.webhook_url || '',
          webhook_verify_token: first.webhook_verify_token || '',
          is_active: first.is_active ?? true
        });
        setEditingId(first.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const url = editingId
        ? `${API_URL}/api/admin/tracking-configs/${editingId}`
        : `${API_URL}/api/admin/tracking-configs`;
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Falha ao salvar configuração');
      }
      setSuccess('Configuração salva com sucesso!');
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tracking - Meta</h2>
          <p className="text-sm text-gray-400">Configure webhook, pixel e token do Meta para rastreamento de eventos</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          <RefreshCw size={18} /> Atualizar
        </button>
      </div>
      {error && <div className="text-red-400 bg-red-500/20 border border-red-500 rounded p-3">{error}</div>}
      {success && <div className="text-green-400 bg-green-500/20 border border-green-500 rounded p-3">{success}</div>}

      <div className="bg-gray-800/60 p-4 rounded border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold">Configurações do Meta</h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Pixel ID</label>
            <input
              type="text"
              value={form.pixel_id}
              onChange={e => setForm({ ...form, pixel_id: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="123456789012345"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-1">Access Token</label>
            <input
              type="password"
              value={form.access_token}
              onChange={e => setForm({ ...form, access_token: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="EAAxxxxxxxxxxxxx"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Webhook URL</label>
            <input
              type="url"
              value={form.webhook_url}
              onChange={e => setForm({ ...form, webhook_url: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="https://api.vertixbet.site/api/webhooks/meta"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-1">Webhook Verify Token</label>
            <input
              type="text"
              value={form.webhook_verify_token}
              onChange={e => setForm({ ...form, webhook_verify_token: e.target.value })}
              className="w-full bg-gray-700 rounded px-3 py-2 text-sm"
              placeholder="seu_token_secreto"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={e => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-300">Ativo</label>
          </div>
        </div>
        
        <button
          onClick={save}
          disabled={loading}
          className="w-full md:w-auto px-6 py-2 bg-[#ff6b35] hover:bg-[#ff7b35] text-white rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Salvando...' : editingId ? 'Atualizar Configuração' : 'Salvar Configuração'}
        </button>
      </div>

      {configs.length > 0 && (
        <div className="bg-gray-800/60 p-4 rounded border border-gray-700">
          <h3 className="text-lg font-semibold mb-3">Configurações Salvas</h3>
          <div className="space-y-2">
            {configs.map(config => (
              <div key={config.id} className="p-3 bg-gray-700/50 rounded border border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Meta Tracking</div>
                    <div className="text-sm text-gray-400">
                      Pixel: {config.pixel_id ? '***' + config.pixel_id.slice(-4) : 'Não configurado'} | 
                      Webhook: {config.webhook_url ? 'Configurado' : 'Não configurado'} | 
                      Status: {config.is_active ? 'Ativo' : 'Inativo'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setForm({
                        platform: config.platform || 'meta',
                        pixel_id: config.pixel_id || '',
                        access_token: config.access_token || '',
                        webhook_url: config.webhook_url || '',
                        webhook_verify_token: config.webhook_verify_token || '',
                        is_active: config.is_active ?? true
                      });
                      setEditingId(config.id);
                    }}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
