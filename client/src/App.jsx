import { Route, Routes } from 'react-router-dom';
import ProtectedRoute, { PublicOnlyRoute } from './routes/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import Users from './pages/Users';
import ComingSoon from './pages/ComingSoon';
import NotFound from './pages/NotFound';
import { NAV_ITEMS } from './config/navigation';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="vendors" element={<ProtectedRoute permission="vendor:read"><Vendors /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute permission="users:manage"><Users /></ProtectedRoute>} />
        {NAV_ITEMS.filter((i) => i.upcoming).map((i) => <Route key={i.to} path={i.to.slice(1)} element={<ComingSoon />} />)}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
