import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent, formatNumber } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import DataTable from '@/components/shared/DataTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import moment from 'moment';

export default function DailyPerformance() {
  const [truthMetrics, setTruthMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterVertical, setFilterVertical] = useState('all');
  const [filterBuyer, setFilterBuyer] = useState('all');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const data = await base44.entities.CampaignTruthMetric.list().catch(() => []);
      setTruthMetrics(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    return truthMetrics.filter(m => {
      if (filterVertical !== 'all' && m.vertical !== filterVertical) return false;
      if (filterBuyer !== 'all' && m.buyer_name !== filterBuyer) return false;
      return true;
    });
  }, [truthMetrics, filterVertical, filterBuyer]);

  const tableData = useMemo(() => {
    const byDate = {};
    filtered.forEach(m => {
      if (!m.date) return;
      if (!byDate[m.date]) byDate[m.date] = { date: m.date, leads: 0, sold: 0, unsold: 0, dq: 0, returned: 0, fake: 0, bookedRevenue: 0, callRevenue: 0, netRevenue: 0, mediaSpend: 0, supplierPayout: 0, cashCollected: 0, grossMargin: 0, dataQuality: 'Incomplete' };
      const r = byDate[m.date];
      r.leads += (m.web_lead_count || 0);
      r.sold += (m.sold_leads || 0);
      r.dq += (m.dq_leads || 0);
      r.returned += (m.returned_leads || 0);
      r.fake += (m.fake_leads || 0);
      r.bookedRevenue += (m.total_booked_revenue || 0);
      r.callRevenue += (m.call_revenue || 0);
      r.netRevenue += (m.web_lead_revenue || 0);
      r.mediaSpend += (m.spend_tracked || 0);
      r.supplierPayout += (m.supplier_payout_accrued || 0);
      r.cashCollected += (m.buyer_collected_cash || 0);
      r.grossMargin += (m.true_gross_margin || 0);
      r.unsold = r.leads - r.sold - r.dq;
      r.dataQuality = m.data_quality || 'Incomplete';
    });
    return Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date)).map(r => ({
      ...r,
      cpl: r.leads > 0 ? ((r.mediaSpend + r.supplierPayout) / r.leads) : 0,
      ipl: r.sold > 0 ? ((r.mediaSpend + r.supplierPayout) / r.sold) : 0,
      convRate: r.leads > 0 ? (r.sold / r.leads) * 100 : 0,
      netProfit: r.grossMargin,
      gpMargin: r.bookedRevenue > 0 ? (r.grossMargin / r.bookedRevenue) * 100 : 0,
    }));
  }, [filtered]);

  const chartData = useMemo(() => {
    return [...tableData].reverse().slice(-30).map(r => ({
      date: moment(r.date).format('MM/DD'),
      leads: r.leads,
      sold: r.sold,
      revenue: Math.round(r.bookedRevenue),
      profit: Math.round(r.grossMargin),
    }));
  }, [tableData]);

  const verticals = [...new Set(truthMetrics.map(m => m.vertical).filter(Boolean))];
  const buyers = [...new Set(truthMetrics.map(m => m.buyer_name).filter(Boolean))];

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatNumber(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span className={v > 50 ? 'text-success' : v > 20 ? 'text-warning' : 'text-critical'}>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Daily Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">Full daily breakdown with filters and trend charts.</p>
      </div>

      <div className="flex items-center gap-3">
        <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)} className="bg-secondary text-xs rounded-md px-3 py-1.5 border border-border text-foreground">
          <option value="all">All Verticals</option>
          {verticals.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterBuyer} onChange={e => setFilterBuyer(e.target.value)} className="bg-secondary text-xs rounded-md px-3 py-1.5 border border-border text-foreground">
          <option value="all">All Buyers</option>
          {buyers.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <SectionPanel title="Trend" subtitle="Daily leads, sold, revenue, and profit">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
            <Line type="monotone" dataKey="leads" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="sold" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </SectionPanel>

      <DataTable
        exportFileName="daily_performance_detail"
        data={tableData}
        maxHeight="500px"
        columns={[
          { key: 'date', label: 'Date' },
          numCol('leads'),
          numCol('sold'),
          numCol('unsold'),
          numCol('dq'),
          numCol('returned'),
          numCol('fake'),
          pctCol('convRate'),
          moneyCol('bookedRevenue'),
          moneyCol('netRevenue'),
          moneyCol('callRevenue'),
          moneyCol('mediaSpend'),
          moneyCol('supplierPayout'),
          moneyCol('cpl'),
          moneyCol('ipl'),
          moneyCol('grossMargin'),
          moneyCol('netProfit'),
          { key: 'gpMargin', label: 'GP Margin', align: 'right', render: v => formatPercent(v) },
          moneyCol('cashCollected'),
          { key: 'dataQuality', label: 'Data Quality' },
        ]}
      />
    </div>
  );
}