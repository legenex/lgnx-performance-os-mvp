import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Landmark, BarChart2, Megaphone, Settings, ChevronDown } from 'lucide-react';
import { SECTIONS } from '@/lib/navConfig';
import RealityBar from '@/components/shared/RealityBar';

const ICON_MAP = { LayoutDashboard, Landmark, BarChart2, Megaphone, Settings };

export default function AppLayout() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('legenex_nav_open');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    try { localStorage.setItem('legenex_nav_open', JSON.stringify(openGroups)); } catch {}
  }, [openGroups]);

  useEffect(() => {
    const activeSection = SECTIONS.find(s => s.hasDropdown && (location.pathname === s.path || location.pathname.startsWith(s.path + '/')));
    if (activeSection && !openGroups[activeSection.key]) {
      setOpenGroups(prev => ({ ...prev, [activeSection.key]: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (key) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const isPathActive = (path) => {
    if (path === '/overview') return location.pathname === '/overview';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-h-screen bg-background">
      <aside
        className="fixed left-0 top-0 bottom-0 z-30 flex flex-col"
        style={{ width: '248px', background: 'hsl(var(--sidebar-background))', borderRadius: '0 16px 16px 0', borderRight: '1px solid hsl(var(--sidebar-border))' }}
      >
        <div className="flex items-center px-5 py-6">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary))' }}>
              <span className="text-white font-bold text-base">L</span>
            </div>
            <div>
              <span className="text-sm font-bold text-foreground tracking-tight">LEGENEX</span>
              <span className="text-[10px] block -mt-0.5 text-sidebar-foreground">PerformanceOS</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {SECTIONS.map(section => {
            const Icon = ICON_MAP[section.icon];
            const isActive = isPathActive(section.path);
            const isOpen = openGroups[section.key] || false;

            if (!section.hasDropdown) {
              return (
                <Link
                  key={section.key}
                  to={section.path}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors relative mb-0.5 ${isActive ? 'bg-primary/10 text-foreground' : 'text-sidebar-foreground hover:text-foreground hover:bg-white/5'}`}
                >
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />}
                  {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={isActive ? { color: 'hsl(var(--primary))' } : {}} />}
                  <span>{section.label}</span>
                </Link>
              );
            }

            return (
              <div key={section.key} className="mb-0.5">
                <div className="flex items-stretch rounded-lg overflow-hidden">
                  <Link
                    to={section.path}
                    className={`flex items-center gap-2.5 px-3 py-2.5 flex-1 min-w-0 text-[13px] font-medium transition-colors relative ${isActive ? 'bg-primary/10 text-foreground' : 'text-sidebar-foreground hover:text-foreground hover:bg-white/5'}`}
                  >
                    {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />}
                    {Icon && <Icon className="w-4 h-4 flex-shrink-0" style={isActive ? { color: 'hsl(var(--primary))' } : {}} />}
                    <span className="truncate">{section.label}</span>
                  </Link>
                  <button
                    onClick={() => toggleGroup(section.key)}
                    className={`flex items-center justify-center px-2.5 transition-colors ${isActive ? 'text-foreground' : 'text-sidebar-foreground hover:text-foreground'}`}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                  </button>
                </div>
                {isOpen && (
                  <div className="ml-4 pl-3 border-l border-sidebar-border mt-0.5 mb-1">
                    {section.tabs.map(tab => {
                      const tabActive = isPathActive(tab.path);
                      return (
                        <Link
                          key={tab.path}
                          to={tab.path}
                          className={`flex items-center px-3 py-1.5 rounded-md text-[12px] transition-colors ${tabActive ? 'text-foreground bg-primary/10' : 'text-sidebar-foreground hover:text-foreground hover:bg-white/5'}`}
                        >
                          {tab.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-3">
          <p className="text-center text-[10px] text-sidebar-foreground">v3.0.0</p>
        </div>
      </aside>

      <div className="h-screen flex flex-col overflow-hidden" style={{ marginLeft: '248px' }}>
        <RealityBar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}