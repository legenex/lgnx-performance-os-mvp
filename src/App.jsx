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
import FinanceMain from '@/pages/FinanceMain';
import PerformanceMain from '@/pages/PerformanceMain';
import AdIntelligenceMain from '@/pages/AdIntelligenceMain';
import GatewayMain from '@/pages/GatewayMain';
import DataSources from '@/pages/DataSources';
import IncomeCheck from '@/pages/IncomeCheck';

// Tab pages — Finances
import CashBanking from '@/pages/CashBanking';
import Payables from '@/pages/Payables';
import SupplierLedger from '@/pages/SupplierLedger';
import MediaGap from '@/pages/MediaGap';
import Reconciliation from '@/pages/Reconciliation';

// Tab pages — Performance
import LeadEconomics from '@/pages/LeadEconomics';
import BuyerPerformance from '@/pages/BuyerPerformance';
import SupplierPerformance from '@/pages/SupplierPerformance';
import StatePerformance from '@/pages/StatePerformance';
import CampaignMargin from '@/pages/CampaignMargin';
import LeadQuality from '@/pages/LeadQuality';

// Tab pages — Ad Intelligence
import CreativeIntelligence from '@/pages/CreativeIntelligence';
import PlatformSpendReconciliation from '@/pages/PlatformSpendReconciliation';
import AdToLeadQuality from '@/pages/AdToLeadQuality';
import CutWatchScaleQueue from '@/pages/CutWatchScaleQueue';

// Tab pages — Lead Gateway
import LeadIntakeMonitor from '@/pages/LeadIntakeMonitor';
import RoutingRules from '@/pages/RoutingRules';
import BuyerDeliveryLogs from '@/pages/BuyerDeliveryLogs';
import SupplierFeedHealth from '@/pages/SupplierFeedHealth';
import ComplianceConsent from '@/pages/ComplianceConsent';
import CapiEventTracking from '@/pages/CapiEventTracking';
import ErrorQueue from '@/pages/ErrorQueue';

// Tab pages — Data & System
import DataImports from '@/pages/DataImports';
import ValidationStatus from '@/pages/ValidationStatus';
import SettingsPage from '@/pages/SettingsPage';

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
            <Route index element={<FinanceMain />} />
            <Route path="cash-banking" element={<CashBanking />} />
            <Route path="income-check" element={<IncomeCheck />} />
            <Route path="payables" element={<Payables />} />
            <Route path="supplier-ledger" element={<SupplierLedger />} />
            <Route path="media-gap" element={<MediaGap />} />
            <Route path="reconciliation" element={<Reconciliation />} />
          </Route>

          <Route path="/performance" element={<SectionLayout sectionKey="performance" />}>
            <Route index element={<PerformanceMain />} />
            <Route path="leads" element={<LeadEconomics />} />
            <Route path="buyers" element={<BuyerPerformance />} />
            <Route path="suppliers" element={<SupplierPerformance />} />
            <Route path="states" element={<StatePerformance />} />
            <Route path="campaigns" element={<CampaignMargin />} />
            <Route path="lead-quality" element={<LeadQuality />} />
          </Route>

          <Route path="/ads" element={<SectionLayout sectionKey="ads" />}>
            <Route index element={<AdIntelligenceMain />} />
            <Route path="creative-insights" element={<CreativeIntelligence />} />
            <Route path="spend-reconciliation" element={<PlatformSpendReconciliation />} />
            <Route path="ad-to-lead-quality" element={<AdToLeadQuality />} />
            <Route path="cut-watch-scale" element={<CutWatchScaleQueue />} />
          </Route>

          <Route path="/gateway" element={<SectionLayout sectionKey="gateway" />}>
            <Route index element={<GatewayMain />} />
            <Route path="intake" element={<LeadIntakeMonitor />} />
            <Route path="routing" element={<RoutingRules />} />
            <Route path="delivery" element={<BuyerDeliveryLogs />} />
            <Route path="supplier-feeds" element={<SupplierFeedHealth />} />
            <Route path="compliance" element={<ComplianceConsent />} />
            <Route path="capi" element={<CapiEventTracking />} />
            <Route path="errors" element={<ErrorQueue />} />
          </Route>

          <Route path="/system" element={<SectionLayout sectionKey="system" />}>
            <Route index element={<DataSources />} />
            <Route path="imports" element={<DataImports />} />
            <Route path="validation" element={<ValidationStatus />} />
            <Route path="settings" element={<SettingsPage />} />
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