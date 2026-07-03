import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Landmark, RefreshCw, FileText, CreditCard,
  Users, BarChart3, Target, TrendingUp, GitCompare, Upload,
  Settings,
  Megaphone, Palette, GitCompareArrows, ClipboardCheck, Scissors,
  Radio, Inbox, Route, Send, Activity, Shield, Zap, AlertCircle,
  ChevronDown, ChevronRight, X, CheckCircle2, DollarSign,
  BarChart2, MapPin, Award, FileBarChart, Link2, Database, Plug
} from 'lucide-react';
import MondayNumberBar from '@/components/shared/MondayNumberBar';

const OVERVIEW_ITEMS = [
  { label: 'Command Center', path: '/', icon: LayoutDashboard },
  { label: 'Today’s Actions', path: '/today-actions', icon: CheckCircle2 },
  { label: 'Validation Status', path: '/validation-status', icon: ClipboardCheck },
];

const NAV_GROUPS = [
  {
    label: 'Finances',
    icon: Landmark,
    landingPath: '/finance-command',
    items: [
      { label: 'Finance Command', path: '/finance-command', icon: Landmark },
      { label: 'Cash & Banking', path: '/cash', icon: DollarSign },
      { label: 'Xero', path: '/xero', icon: RefreshCw },
      { label: 'Receivables', path: '/receivables', icon: FileText },
      { label: 'Payables', path: '/payables', icon: CreditCard },
      { label: 'Supplier Ledger', path: '/supplier-ledger', icon: Users },
      { label: 'Media Gap', path: '/media-gap', icon: BarChart3 },
      { label: 'Reconciliation', path: '/reconciliation', icon: GitCompare },
    ]
  },
  {
    label: 'Performance',
    icon: BarChart2,
    landingPath: '/performance-dashboard',
    items: [
      { label: 'Performance Dashboard', path: '/performance-dashboard', icon: BarChart2 },
      { label: 'Lead Economics', path: '/lead-economics', icon: TrendingUp },
      { label: 'Buyer Performance', path: '/buyer-performance', icon: Users },
      { label: 'Supplier Performance', path: '/supplier-performance', icon: Award },
      { label: 'State Performance', path: '/state-performance', icon: MapPin },
      { label: 'Campaign True Margin', path: '/campaign-margin', icon: Target },
      { label: 'Lead Quality', path: '/lead-quality', icon: ClipboardCheck },
      { label: 'Report Builder', path: '/report-builder', icon: FileBarChart },
    ]
  },
  {
    label: 'Ad Intelligence',
    icon: Megaphone,
    landingPath: '/ad-intelligence-command',
    items: [
      { label: 'Ad Intelligence Command', path: '/ad-intelligence-command', icon: Megaphone },
      { label: 'Smart Ad Reporting', path: '/smart-ad-reporting', icon: BarChart3 },
      { label: 'Creative Intelligence', path: '/creative-intelligence', icon: Palette },
      { label: 'Platform Spend Reconciliation', path: '/platform-spend-recon', icon: GitCompareArrows },
      { label: 'Ad-to-Lead Quality', path: '/ad-to-lead-quality', icon: ClipboardCheck },
      { label: 'Cut / Watch / Scale', path: '/cut-watch-scale', icon: Scissors },
      { label: 'Campaign Mapping', path: '/campaign-mapping', icon: Link2 },
    ]
  },
  {
    label: 'Lead Gateway',
    icon: Radio,
    landingPath: '/gateway/command',
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
    label: 'Data & System',
    icon: Database,
    landingPath: '/source-connections',
    items: [
      { label: 'Data Imports', path: '/imports', icon: Upload },
      { label: 'Source Connections', path: '/source-connections', icon: Plug },
      { label: 'Import History', path: '/import-history', icon: FileText },
      { label: 'Settings', path: '/settings', icon: Settings },
      { label: 'Users & Roles', path: '/users-roles', icon: Users },
    ]
  },
];

export default function AppLayout() {
  const location = useLocation();
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const isActive = (path) => location.pathname === path;

  // Auto-expand the group containing the active route
  useEffect(() => {
    const activeGroup = NAV_GROUPS.find(g => g.items.some(i => isActive(i.path)));
    if (activeGroup && collapsedGroups[activeGroup.label]) {
      setCollapsedGroups(prev => ({ ...prev, [activeGroup.label]: false }));
    }
  }, [location.pathname]);

  const toggleGroup = (label) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const collapseAll = () => {
    const all = {};
    NAV_GROUPS.forEach(g => { all[g.label] = true; });
    setCollapsedGroups(all);
  };

  const sidebarBg = 'hsl(214, 19%, 14%)';
  const borderColor = 'hsl(213, 12%, 24%)';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'hsl(214, 18%, 17%)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col border-r flex-shrink-0"
        style={{ background: sidebarBg, borderColor, width: '280px' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 border-b" style={{ height: '64px', borderColor }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(358, 78%, 52%)' }}>
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <div>
            <span className="text-sm font-bold text-foreground tracking-tight">LEGENEX</span>
            <span className="text-[10px] block -mt-0.5 text-muted-foreground">PerformanceOS</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {/* Overview section label */}
          <div className="px-4 pt-2 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Overview</span>
          </div>
          {OVERVIEW_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-2.5 px-3 py-2 mx-2 rounded-lg text-xs font-medium transition-colors relative"
                style={active
                  ? { background: 'hsl(358, 30%, 20%)', color: '#F2F5F7' }
                  : { color: '#AAB4C0' }
                }
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#F2F5F7'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#AAB4C0'; } }}
              >
                {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: 'hsl(358, 78%, 52%)' }} />}
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
                {/* Section label */}
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</span>
                </div>
                {/* Group header: clickable to navigate, chevron to toggle */}
                <div className="flex items-stretch mx-2 rounded-lg overflow-hidden">
                  <Link
                    to={group.landingPath}
                    className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0 text-xs font-medium transition-colors relative"
                    style={groupActive
                      ? { background: 'hsl(358, 30%, 20%)', color: '#F2F5F7' }
                      : { color: '#F2F5F7' }
                    }
                    onMouseEnter={e => { if (!groupActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (!groupActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {groupActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: 'hsl(358, 78%, 52%)' }} />}
                    <GroupIcon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{group.label}</span>
                  </Link>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-center px-2 transition-colors"
                    style={groupActive
                      ? { background: 'hsl(358, 30%, 20%)', color: '#F2F5F7' }
                      : { color: '#AAB4C0' }
                    }
                    onMouseEnter={e => { e.currentTarget.style.background = groupActive ? 'hsl(358, 30%, 24%)' : 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = groupActive ? 'hsl(358, 30%, 20%)' : 'transparent'; }}
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
                  </button>
                </div>
                {/* Child items */}
                {!isCollapsed && (
                  <div className="mt-0.5">
                    {group.items.map((item) => {
                      const active = isActive(item.path);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="flex items-center gap-2.5 px-3 py-1.5 mx-2 rounded-lg text-xs transition-colors relative"
                          style={active
                            ? { background: 'hsl(214, 18%, 23%)', color: '#F2F5F7' }
                            : { color: '#AAB4C0' }
                          }
                          onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#F2F5F7'; } }}
                          onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#AAB4C0'; } }}
                        >
                          {active && <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full" style={{ background: 'hsl(358, 78%, 52%)' }} />}
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
        <div className="border-t p-2" style={{ borderColor }}>
          <button
            onClick={collapseAll}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs transition-colors border"
            style={{ color: '#AAB4C0', borderColor }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F2F5F7'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#AAB4C0'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X className="w-3 h-3" />
            Collapse All
          </button>
          <p className="text-center text-[10px] mt-1.5 text-muted-foreground">v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MondayNumberBar />
        <main className="flex-1 overflow-y-auto p-6" style={{ background: 'hsl(214, 18%, 17%)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}