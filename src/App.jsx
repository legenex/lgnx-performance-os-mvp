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
import SectionLayout from '@/components/layout/SectionLayout';

// Section main pages
import Overview from '@/pages/Overview';
import FinanceOverview from '@/pages/FinanceOverview';
import PerformanceOverview from '@/pages/PerformanceOverview';
import AdsOverview from '@/pages/AdsOverview';
import General from '@/pages/General';

// Tab pages — Finances
import BankIncome from '@/pages/BankIncome';
import ReportedVsPaid from '@/pages/ReportedVsPaid';
import CostsPayables from '@/pages/CostsPayables';
import SupplierCostCheck from '@/pages/SupplierCostCheck';
import MediaSpendCheck from '@/pages/MediaSpendCheck';

// Tab pages — Performance
import DailyPerformance from '@/pages/DailyPerformance';
import BuyerPerformance from '@/pages/BuyerPerformance';
import SupplierPerformance from '@/pages/SupplierPerformance';
import CampaignPerformance from '@/pages/CampaignPerformance';
import StatePerformance from '@/pages/StatePerformance';
import LeadQuality from '@/pages/LeadQuality';

// Tab pages — Ad Intelligence
import CampaignProfitability from '@/pages/CampaignProfitability';
import CreativeInsights from '@/pages/CreativeInsights';
import SpendReconciliation from '@/pages/SpendReconciliation';
import CutWatchScale from '@/pages/CutWatchScale';

// Tab pages — Settings
import DataSources from '@/pages/DataSources';
import Validation from '@/pages/Validation';
import AdAccounts from '@/pages/AdAccounts';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary">
            <span className="text-white font-bold text-lg">L</span>
          </div>
          <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
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
          <Route path="/overview" element={<Overview />} />

          <Route path="/finances" element={<SectionLayout sectionKey="finances" />}>
            <Route index element={<FinanceOverview />} />
            <Route path="bank-income" element={<BankIncome />} />
            <Route path="reported-vs-paid" element={<ReportedVsPaid />} />
            <Route path="costs-payables" element={<CostsPayables />} />
            <Route path="supplier-cost-check" element={<SupplierCostCheck />} />
            <Route path="media-spend-check" element={<MediaSpendCheck />} />
          </Route>

          <Route path="/performance" element={<SectionLayout sectionKey="performance" />}>
            <Route index element={<PerformanceOverview />} />
            <Route path="daily" element={<DailyPerformance />} />
            <Route path="buyers" element={<BuyerPerformance />} />
            <Route path="suppliers" element={<SupplierPerformance />} />
            <Route path="campaigns" element={<CampaignPerformance />} />
            <Route path="states" element={<StatePerformance />} />
            <Route path="lead-quality" element={<LeadQuality />} />
          </Route>

          <Route path="/ads" element={<SectionLayout sectionKey="ads" />}>
            <Route index element={<AdsOverview />} />
            <Route path="campaign-profitability" element={<CampaignProfitability />} />
            <Route path="creative-insights" element={<CreativeInsights />} />
            <Route path="spend-reconciliation" element={<SpendReconciliation />} />
            <Route path="cut-watch-scale" element={<CutWatchScale />} />
          </Route>

          <Route path="/settings" element={<SectionLayout sectionKey="settings" />}>
            <Route index element={<General />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="validation" element={<Validation />} />
            <Route path="ad-accounts" element={<AdAccounts />} />
          </Route>

          <Route path="/" element={<Navigate to="/overview" replace />} />
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