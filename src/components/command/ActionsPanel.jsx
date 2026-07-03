import React from 'react';
import { Link } from 'react-router-dom';
import SectionPanel from '@/components/shared/SectionPanel';
import { ArrowRight, PhoneCall, Shield, GitCompare, Tag, BarChart3, RefreshCw } from 'lucide-react';

const ACTIONS = [
  { label: 'Chase top 5 overdue buyers', icon: PhoneCall, path: '/receivables', color: 'text-red-400' },
  { label: 'Pay / protect critical suppliers', icon: Shield, path: '/payables', color: 'text-orange-400' },
  { label: 'Reconcile media gap', icon: GitCompare, path: '/media-gap', color: 'text-yellow-400' },
  { label: 'Categorize unknown bank transactions', icon: Tag, path: '/cash', color: 'text-blue-400' },
  { label: 'Review campaign CUT / WATCH / SCALE', icon: BarChart3, path: '/campaign-margin', color: 'text-purple-400' },
  { label: 'Review Xero sync errors', icon: RefreshCw, path: '/xero', color: 'text-emerald-400' },
];

export default function ActionsPanel() {
  return (
    <SectionPanel title="Today's Actions" subtitle="Priority tasks">
      <div className="space-y-1">
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <Link
              key={i}
              to={action.path}
              className="flex items-center justify-between p-2.5 rounded hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${action.color}`} />
                <span className="text-xs text-foreground">{action.label}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </SectionPanel>
  );
}