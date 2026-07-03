import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import DataTable from '@/components/shared/DataTable';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';

export default function BuyerPerformance() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.GatewayLead.filter({ lead_status: 'Sold' }).catch(() => []);
      setLeads(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const tableData = useMemo(() => {
    const byBuyer = {};
    leads.forEach(l => {
      const name = l.buyer_name || 'UNKNOWN';
      if (!byBuyer[name]) byBuyer[name] = { buyer: name, leadsSold: 0, bookedRevenue: 0, returned: 0 };
      byBuyer[name].leadsSold++;
      byBuyer[name].bookedRevenue += l.lead_revenue || 0;
      if (l.lead_status === 'Returned') byBuyer[name].returned++;
    });
    return Object.values(byBuyer).map(b => ({
      ...b,
      collectedCash: 'UNKNOWN',
      outstandingAR: 'UNKNOWN',
      conversionRate: b.leadsSold > 0 ? ((b.leadsSold - b.returned) / b.leadsSold) * 100 : 0,
      returnRate: b.leadsSold > 0 ? (b.returned / b.leadsSold) * 100 : 0,
      caseCount: 'UNKNOWN',
      avgLeadPrice: b.leadsSold > 0 ? b.bookedRevenue / b.leadsSold : 0,
      paymentStatus: 'UNKNOWN',
      riskStatus: 'UNKNOWN',
    }));
  }, [leads]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Buyer Performance</h1>
        <p className="text-xs text-muted-foreground mt-1">Revenue, conversion, returns, and payment health by buyer</p>
      </div>
      <DataTable
        exportFileName="buyer_performance"
        data={tableData}
        columns={[
          { key: 'buyer', label: 'Buyer' },
          { key: 'leadsSold', label: 'Leads Sold', align: 'right' },
          { key: 'bookedRevenue', label: 'Booked Revenue', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'collectedCash', label: 'Collected Cash', align: 'right' },
          { key: 'outstandingAR', label: 'Outstanding AR', align: 'right' },
          { key: 'conversionRate', label: 'Conv. Rate', align: 'right', render: v => formatPercent(v) },
          { key: 'returnRate', label: 'Return Rate', align: 'right', render: v => formatPercent(v) },
          { key: 'caseCount', label: 'Case Count', align: 'right' },
          { key: 'avgLeadPrice', label: 'Avg Lead Price', align: 'right', render: v => <span className={moneyColor(v)}>{formatMoney(v)}</span> },
          { key: 'paymentStatus', label: 'Payment Status', render: v => <StatusBadge status={v} /> },
          { key: 'riskStatus', label: 'Risk Status', render: v => <StatusBadge status={v} /> },
        ]}
      />
    </div>
  );
}