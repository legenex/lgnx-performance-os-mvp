import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Landmark, RefreshCw, FileText, CreditCard, 
  Users, BarChart3, Target, TrendingUp, GitCompare, Upload, 
  Settings, ChevronLeft, ChevronRight, AlertTriangle, LogOut,
  Megaphone, Palette, GitCompareArrows, ClipboardCheck, Scissors
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MondayNumberBar from '@/components/shared/MondayNumberBar';

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Command Center', path: '/', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Cash & Books',
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
    label: 'System',
    items: [
      { label: 'Data Imports', path: '/imports', icon: Upload },
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0D10' }}>
      {/* Sidebar */}
      <aside 
        className={`flex flex-col border-r border-border transition-all duration-200 ${collapsed ? 'w-16' : 'w-56'}`}
        style={{ background: '#0F1115' }}
      >
        {/* Logo */}
        <div className="flex items-center h-14 px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-[#E4262C] flex items-center justify-center">
                <span className="text-white font-bold text-xs">L</span>
              </div>
              <div>
                <span className="text-sm font-semibold text-foreground tracking-tight">Legenex</span>
                <span className="text-[10px] text-muted-foreground block -mt-0.5">PerformanceOS</span>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded bg-[#E4262C] flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-xs">L</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="px-4 py-1 text-[9px] uppercase tracking-widest text-muted-foreground/50 font-semibold">
                  {section.label}
                </p>
              )}
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-1.5 mx-2 rounded-md text-xs transition-colors ${
                      active 
                        ? 'bg-[#E4262C]/10 text-[#E4262C]' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-border p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MondayNumberBar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}