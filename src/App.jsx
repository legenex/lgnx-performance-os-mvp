import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AppLayout from '@/components/layout/AppLayout';
import CommandCenter from '@/pages/CommandCenter';
import CashBanking from '@/pages/CashBanking';
import XeroPage from '@/pages/XeroPage';
import Receivables from '@/pages/Receivables';
import Payables from '@/pages/Payables';
import SupplierLedger from '@/pages/SupplierLedger';
import MediaGap from '@/pages/MediaGap';
import CampaignMargin from '@/pages/CampaignMargin';
import LeadEconomics from '@/pages/LeadEconomics';
import Reconciliation from '@/pages/Reconciliation';
import DataImports from '@/pages/DataImports';
import SettingsPage from '@/pages/SettingsPage';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#0B0D10' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E4262C] flex items-center justify-center">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-[#E4262C] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/cash" element={<CashBanking />} />
          <Route path="/xero" element={<XeroPage />} />
          <Route path="/receivables" element={<Receivables />} />
          <Route path="/payables" element={<Payables />} />
          <Route path="/supplier-ledger" element={<SupplierLedger />} />
          <Route path="/media-gap" element={<MediaGap />} />
          <Route path="/campaign-margin" element={<CampaignMargin />} />
          <Route path="/lead-economics" element={<LeadEconomics />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/imports" element={<DataImports />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App