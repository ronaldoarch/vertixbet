import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import Profile from './pages/Profile';
import Game from './pages/Game';
import Deposit from './pages/Deposit';
import Withdrawal from './pages/Withdrawal';
import AffiliatePanel from './pages/AffiliatePanel';

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
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
