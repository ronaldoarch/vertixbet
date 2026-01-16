import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
