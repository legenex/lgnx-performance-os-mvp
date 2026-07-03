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
import TodayActions from '@/pages/TodayActions';
import ValidationStatus from '@/pages/ValidationStatus';
import FinanceCommand from '@/pages/FinanceCommand';
import CashBanking from '@/pages/CashBanking';
import XeroPage from '@/pages/XeroPage';
import Receivables from '@/pages/Receivables';
import Payables from '@/pages/Payables';
import SupplierLedger from '@/pages/SupplierLedger';
import MediaGap from '@/pages/MediaGap';
import Reconciliation from '@/pages/Reconciliation';
import PerformanceDashboard from '@/pages/PerformanceDashboard';
import LeadEconomics from '@/pages/LeadEconomics';
import BuyerPerformance from '@/pages/BuyerPerformance';
import SupplierPerformance from '@/pages/SupplierPerformance';
import StatePerformance from '@/pages/StatePerformance';
import CampaignMargin from '@/pages/CampaignMargin';
import LeadQuality from '@/pages/LeadQuality';
import ReportBuilder from '@/pages/ReportBuilder';
import AdIntelligenceCommand from '@/pages/AdIntelligenceCommand';
import SmartAdReporting from '@/pages/SmartAdReporting';
import CreativeIntelligence from '@/pages/CreativeIntelligence';
import PlatformSpendReconciliation from '@/pages/PlatformSpendReconciliation';
import AdToLeadQuality from '@/pages/AdToLeadQuality';
import CutWatchScaleQueue from '@/pages/CutWatchScaleQueue';
import CampaignMapping from '@/pages/CampaignMapping';
import GatewayCommand from '@/pages/GatewayCommand';
import LeadIntakeMonitor from '@/pages/LeadIntakeMonitor';
import RoutingRules from '@/pages/RoutingRules';
import BuyerDeliveryLogs from '@/pages/BuyerDeliveryLogs';
import SupplierFeedHealth from '@/pages/SupplierFeedHealth';
import ComplianceConsent from '@/pages/ComplianceConsent';
import CapiEventTracking from '@/pages/CapiEventTracking';
import ErrorQueue from '@/pages/ErrorQueue';
import GatewayReconciliation from '@/pages/GatewayReconciliation';
import DataImports from '@/pages/DataImports';
import SourceConnections from '@/pages/SourceConnections';
import ImportHistory from '@/pages/ImportHistory';
import SettingsPage from '@/pages/SettingsPage';
import UsersRoles from '@/pages/UsersRoles';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'hsl(214, 18%, 17%)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'hsl(358, 78%, 52%)' }}>
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
          <Route path="/" element={<CommandCenter />} />
          <Route path="/today-actions" element={<TodayActions />} />
          <Route path="/validation-status" element={<ValidationStatus />} />
          <Route path="/finance-command" element={<FinanceCommand />} />
          <Route path="/cash" element={<CashBanking />} />
          <Route path="/xero" element={<XeroPage />} />
          <Route path="/receivables" element={<Receivables />} />
          <Route path="/payables" element={<Payables />} />
          <Route path="/supplier-ledger" element={<SupplierLedger />} />
          <Route path="/media-gap" element={<MediaGap />} />
          <Route path="/performance-dashboard" element={<PerformanceDashboard />} />
          <Route path="/lead-economics" element={<LeadEconomics />} />
          <Route path="/buyer-performance" element={<BuyerPerformance />} />
          <Route path="/supplier-performance" element={<SupplierPerformance />} />
          <Route path="/state-performance" element={<StatePerformance />} />
          <Route path="/campaign-margin" element={<CampaignMargin />} />
          <Route path="/lead-quality" element={<LeadQuality />} />
          <Route path="/report-builder" element={<ReportBuilder />} />
          <Route path="/ad-intelligence-command" element={<AdIntelligenceCommand />} />
          <Route path="/smart-ad-reporting" element={<SmartAdReporting />} />
          <Route path="/creative-intelligence" element={<CreativeIntelligence />} />
          <Route path="/platform-spend-recon" element={<PlatformSpendReconciliation />} />
          <Route path="/ad-to-lead-quality" element={<AdToLeadQuality />} />
          <Route path="/cut-watch-scale" element={<CutWatchScaleQueue />} />
          <Route path="/campaign-mapping" element={<CampaignMapping />} />
          <Route path="/gateway/command" element={<GatewayCommand />} />
          <Route path="/gateway/lead-intake" element={<LeadIntakeMonitor />} />
          <Route path="/gateway/routing-rules" element={<RoutingRules />} />
          <Route path="/gateway/buyer-delivery" element={<BuyerDeliveryLogs />} />
          <Route path="/gateway/supplier-feeds" element={<SupplierFeedHealth />} />
          <Route path="/gateway/compliance" element={<ComplianceConsent />} />
          <Route path="/gateway/capi-events" element={<CapiEventTracking />} />
          <Route path="/gateway/error-queue" element={<ErrorQueue />} />
          <Route path="/gateway/reconciliation" element={<GatewayReconciliation />} />
          <Route path="/reconciliation" element={<Reconciliation />} />
          <Route path="/imports" element={<DataImports />} />
          <Route path="/source-connections" element={<SourceConnections />} />
          <Route path="/import-history" element={<ImportHistory />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/users-roles" element={<UsersRoles />} />
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