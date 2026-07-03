import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import { formatNumber } from '@/lib/formatters';
import { Radio, Truck, Shield, Zap, Activity, AlertTriangle } from 'lucide-react';

export default function LeadGatewayPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const [leads, errors, feeds] = await Promise.all([
        base44.entities.GatewayLead.list(undefined, 500),
        base44.entities.GatewayError.filter({ status: 'Open' }),
        base44.entities.SupplierFeedHealth.list(undefined, 100),
      ]);
      const today = new Date().toISOString().split('T')[0];
      const todayLeads = leads.filter(l => (l.received_at || '').startsWith(today));
      const useLeads = todayLeads.length > 0 ? todayLeads : leads;
      setStats({
        receivedToday: useLeads.length,
        soldToday: useLeads.filter(l => l.lead_status === 'Sold').length,
        deliveryErrors: errors.filter(e => e.category === 'Delivery').length,
        complianceWarnings: errors.filter(e => e.category === 'Compliance').length,
        capiFailed: errors.filter(e => e.category === 'CAPI').length,
        leadbyteMismatches: errors.filter(e => e.category === 'LeadByte').length,
        suppliersAtRisk: feeds.filter(f => f.status === 'Watch' || f.status === 'Critical').length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return null;
  if (!stats) return null;

  const items = [
    { label: 'Leads Received', value: stats.receivedToday, icon: Radio, path: '/gateway/command', color: 'text-blue-400' },
    { label: 'Sold', value: stats.soldToday, icon: Radio, path: '/gateway/command', color: 'text-emerald-400' },
    { label: 'Delivery Errors', value: stats.deliveryErrors, icon: Truck, path: '/gateway/buyer-delivery', color: stats.deliveryErrors > 0 ? 'text-red-400' : 'text-muted-foreground' },
    { label: 'Compliance', value: stats.complianceWarnings, icon: Shield, path: '/gateway/compliance', color: stats.complianceWarnings > 0 ? 'text-yellow-400' : 'text-muted-foreground' },
    { label: 'CAPI Failed', value: stats.capiFailed, icon: Zap, path: '/gateway/capi-events', color: stats.capiFailed > 0 ? 'text-red-400' : 'text-muted-foreground' },
    { label: 'LeadByte Mismatch', value: stats.leadbyteMismatches, icon: Activity, path: '/gateway/reconciliation', color: stats.leadbyteMismatches > 0 ? 'text-red-400' : 'text-muted-foreground' },
    { label: 'Suppliers at Risk', value: stats.suppliersAtRisk, icon: AlertTriangle, path: '/gateway/supplier-feeds', color: stats.suppliersAtRisk > 0 ? 'text-orange-400' : 'text-muted-foreground' },
  ];

  return (
    <SectionPanel title="Lead Gateway" subtitle="Operational lead flow monitoring" actions={
      <Link to="/gateway/command" className="text-[10px] text-[#E4262C] hover:underline">Gateway Command →</Link>
    }>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={i} to={item.path} className="flex flex-col p-2 rounded hover:bg-white/5 transition-colors" style={{ background: '#1A1E24' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
              </div>
              <span className={`text-lg font-bold tabular-nums ${item.color}`}>{formatNumber(item.value)}</span>
            </Link>
          );
        })}
      </div>
    </SectionPanel>
  );
}