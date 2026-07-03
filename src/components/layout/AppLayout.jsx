import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, RefreshCw, FileText, CreditCard, 
  Users, BarChart3, Target, TrendingUp, GitCompare, Upload, 
  Settings,
  Megaphone, Palette, GitCompareArrows, ClipboardCheck, Scissors,
  Radio, Inbox, Route, Send, Activity, Shield, Zap, AlertCircle,
  ChevronDown, X
} from 'lucide-react';
import MondayNumberBar from '@/components/shared/MondayNumberBar';

const OVERVIEW_ITEMS = [
  { label: 'Command Center', path: '/', icon: LayoutDashboard },
];

const NAV_GROUPS = [
  {
    label: 'Cash & Books',
    icon: Landmark,
    items: [
      { label: 'Cash & Banking', path: '/cash', icon: Landmark },
      { label: 'Xero', path: '/xero', icon: RefreshCw },
      { label: 'Receivables', path: '/receivables', icon: FileText },
      { label: 'Payables', path: '/payables', icon: CreditCard },
      { label: 'Supplier Ledger', path: '/supplier-ledger', icon: Users },
      { label: 'Reconciliation', path: '/reconciliation', icon: GitCompare },
    ]
  },
  {
    label: 'Performance / Ads',
    icon: Megaphone,
    items: [
      { label: 'Smart Ad Reporting', path: '/smart-ad-reporting', icon: Megaphone },
      { label: 'Creative Intelligence', path: '/creative-intelligence', icon: Palette },
      { label: 'Platform Spend Recon', path: '/platform-spend-recon', icon: GitCompareArrows },
      { label: 'Ad-to-Lead Quality', path: '/ad-to-lead-quality', icon: ClipboardCheck },
      { label: 'Cut / Watch / Scale', path: '/cut-watch-scale', icon: Scissors },
      { label: 'Campaign True Margin', path: '/campaign-margin', icon: Target },
      { label: 'Lead Economics', path: '/lead-economics', icon: TrendingUp },
      { label: 'Media Gap', path: '/media-gap', icon: BarChart3 },
    ]
  },
  {
    label: 'Lead Gateway',
    icon: Radio,
    items: [
      { label: 'Gateway Command', path: '/gateway/command', icon: Radio },
      { label: 'Lead Intake Monitor', path: '/gateway/lead-intake', icon: Inbox },
      { label: 'Routing Rules', path: '/gateway/routing-rules', icon: Route },
      { label: 'Buyer Delivery Logs', path: '/gateway/buyer-delivery', icon: Send },
      { label: 'Supplier Feed Health', path: '/gateway/supplier-feeds', icon: Activity },
      { label: 'Compliance & Consent', path: '/gateway/compliance', icon: Shield },
      { label: 'CAPI / Event Tracking', path: '/gateway/capi-events', icon: Zap },
      { label: 'Error Queue', path: '/gateway/error-queue', icon: AlertCircle },
      { label: 'Gateway Reconciliation', path: '/gateway/reconciliation', icon: GitCompare },
    ]
  },
  {
    label: 'System',
    icon: Settings,
    items: [
      { label: 'Data Imports', path: '/imports', icon: Upload },
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  },
];

export default function AppLayout() {
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const toggleGroup = (label) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const collapseAll = () => {
    const all = {};
    NAV_GROUPS.forEach(g => { all[g.label] = true; });
    setCollapsedGroups(all);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#161a1f' }}>
      {/* Sidebar */}
      <aside 
        className="flex flex-col border-r w-60 flex-shrink-0"
        style={{ background: '#1a1d21', borderColor: '#32383e' }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b" style={{ borderColor: '#32383e' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: '#ef4444' }}>
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-white tracking-tight">LEGENEX</span>
              <span className="text-[10px] block -mt-0.5" style={{ color: '#8b949e' }}>PerformanceOS</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {/* Standalone Overview */}
          {OVERVIEW_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-xs font-medium transition-colors relative"
                style={active ? { background: '#3a2529', color: '#ffffff' } : { color: '#adb5bd' }}
              >
                {active && <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r" style={{ background: '#ff4d4f' }} />}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}

          {/* Collapsible Groups */}
          {NAV_GROUPS.map((group) => {
            const isCollapsed = collapsedGroups[group.label];
            const GroupIcon = group.icon;
            const groupActive = group.items.some(i => isActive(i.path));
            return (
              <div key={group.label} className="mb-0.5">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center gap-2 w-full px-3 py-2 mx-2 rounded-md text-xs font-medium transition-colors relative"
                  style={groupActive ? { background: '#3a2529', color: '#ffffff' } : { color: '#ffffff' }}
                  onMouseEnter={e => { if (!groupActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (!groupActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {groupActive && <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r" style={{ background: '#ff4d4f' }} />}
                  <GroupIcon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{group.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-180'}`} />
                </button>
                {!isCollapsed && (
                  <div className="mt-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.path);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-md text-xs transition-colors relative"
                          style={active ? { background: '#3a2529', color: '#ffffff' } : { color: '#adb5bd' }}
                          onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#ffffff'; }}
                          onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#adb5bd'; }}
                        >
                          {active && <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-r" style={{ background: '#ff4d4f' }} />}
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t p-2" style={{ borderColor: '#32383e' }}>
          <button
            onClick={collapseAll}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded text-xs transition-colors border"
            style={{ color: '#adb5bd', borderColor: '#32383e' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#adb5bd'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-3 h-3" />
            Collapse All
          </button>
          <p className="text-center text-[10px] mt-1.5" style={{ color: '#8b949e' }}>v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MondayNumberBar />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: '#161a1f' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}