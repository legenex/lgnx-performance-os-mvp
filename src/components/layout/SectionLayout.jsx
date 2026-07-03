import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { SECTIONS } from '@/lib/navConfig';

export default function SectionLayout({ sectionKey }) {
  const location = useLocation();
  const section = SECTIONS.find(s => s.key === sectionKey);
  if (!section || !section.tabs) return <Outlet />;

  const isTabActive = (tabPath) => {
    if (tabPath === section.path) return location.pathname === section.path;
    return location.pathname === tabPath || location.pathname.startsWith(tabPath + '/');
  };

  return (
    <div>
      <div className="flex items-center gap-1 p-1 bg-muted rounded-[10px] mb-6 w-fit max-w-full overflow-x-auto">
        {section.tabs.map(tab => {
          const active = isTabActive(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}