import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import Profile from './pages/Profile';
import Game from './pages/Game';
import Deposit from './pages/Deposit';
import Withdrawal from './pages/Withdrawal';
import AffiliatePanel from './pages/AffiliatePanel';
import TermosCondicoes from './pages/TermosCondicoes';
import PoliticaPrivacidade from './pages/PoliticaPrivacidade';
import PoliticaKYC from './pages/PoliticaKYC';
import JogoResponsavel from './pages/JogoResponsavel';
import Promocoes from './pages/Promocoes';
import AdminRoute from './components/AdminRoute';
import AdminLoginRoute from './components/AdminLoginRoute';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/conta" element={<Profile />} />
        <Route path="/depositar" element={<Deposit />} />
        <Route path="/sacar" element={<Withdrawal />} />
        <Route path="/jogo/:gameCode" element={<Game />} />
        <Route path="/afiliado" element={<AffiliatePanel />} />
        <Route path="/termos-e-condicoes" element={<TermosCondicoes />} />
        <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/politica-kyc" element={<PoliticaKYC />} />
        <Route path="/jogo-responsavel" element={<JogoResponsavel />} />
        <Route path="/promocoes" element={<Promocoes />} />
        <Route path="/admin/login" element={
          <AdminLoginRoute>
            <AdminLogin />
          </AdminLoginRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute>
            <Admin />
          </AdminRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
