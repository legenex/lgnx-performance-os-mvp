import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import DataTable from '@/components/shared/DataTable';
import FilterChips from '@/components/shared/FilterChips';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, formatNumber, moneyColor, getStatusColor } from '@/lib/formatters';
import { Calendar, Filter, X, TrendingUp, TrendingDown, DollarSign, Phone, Users, Award, MapPin, BarChart2, FileBarChart } from 'lucide-react';

const TABS = [
  { key: 'daily', label: 'Daily Performance', icon: Calendar },
  { key: 'supplier', label: 'Supplier Performance', icon: Award },
  { key: 'buyer', label: 'Buyer Performance', icon: Users },
  { key: 'campaign', label: 'Campaign Performance', icon: BarChart2 },
  { key: 'state', label: 'State Performance', icon: MapPin },
  { key: 'quality', label: 'Lead Quality', icon: FileBarChart },
];

function MetricCard({ label, value, type, sublabel }) {
  const typeColors = {
    CASH: 'text-success', BOOKED: 'text-info', ACCRUED: 'text-warning',
    PAID: 'text-success', UNKNOWN: 'text-muted-foreground', 'LEGACY REFERENCE': 'text-purple',
  };
  return (
    <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(213, 17%, 20%)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
        {type && <span className={`text-[8px] px-1 py-0.5 rounded font-medium uppercase ${typeColors[type] || 'text-muted-foreground'}`}>{type}</span>}
      </div>
      <p className={`text-base font-bold tabular-nums ${moneyColor(value)}`}>{typeof value === 'number' ? formatMoney(value, { compact: true }) : value}</p>
      {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
    </div>
  );
}

export default function PerformanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [rawLeads, setRawLeads] = useState([]);
  const [rawCalls, setRawCalls] = useState([]);
  const [rawAdMetrics, setRawAdMetrics] = useState([]);
  const [rawCampaignTruth, setRawCampaignTruth] = useState([]);
  const [rawBankTxns, setRawBankTxns] = useState([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedRow, setSelectedRow] = useState(null);
  const [filters, setFilters] = useState({ vertical: '', supplier: '', buyer: '', platform: '', state: '', status: '', includeTest: false });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [leads, calls, adMetrics, campaignTruth, bankTxns] = await Promise.all([
        base44.entities.GatewayLead.list('-received_at', 500).catch(() => []),
        base44.entities.Call.list('-created_date', 500).catch(() => []),
        base44.entities.AdDailyMetric.list('-date', 500).catch(() => []),
        base44.entities.CampaignTruthMetric.list('-date', 200).catch(() => []),
        base44.entities.BankTransaction.filter({ cash_type: 'Buyer Collection' }).catch(() => []),
      ]);
      setRawLeads(leads || []);
      setRawCalls(calls || []);
      setRawAdMetrics(adMetrics || []);
      setRawCampaignTruth(campaignTruth || []);
      setRawBankTxns(bankTxns || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // Apply filters
  const filteredLeads = useMemo(() => {
    return rawLeads.filter(l => {
      if (filters.vertical && l.lead_vertical !== filters.vertical) return false;
      if (filters.supplier && l.supplier_sid !== filters.supplier) return false;
      if (filters.buyer && l.buyer_name !== filters.buyer) return false;
      if (filters.state && l.accident_state !== filters.state && l.geo_state !== filters.state) return false;
      if (filters.status && l.lead_status !== filters.status) return false;
      return true;
    });
  }, [rawLeads, filters]);

  // Top metrics
  const metrics = useMemo(() => {
    const leads = filteredLeads.length;
    const sold = filteredLeads.filter(l => l.lead_status === 'Sold').length;
    const dq = filteredLeads.filter(l => l.lead_status === 'Disqualified' || l.lead_status === 'DQ').length;
    const returned = filteredLeads.filter(l => l.lead_status === 'Returned').length;
    const fake = filteredLeads.filter(l => l.lead_status === 'Fake').length;
    const bookedRevenue = filteredLeads.reduce((s, l) => s + (l.lead_revenue || 0), 0);
    const supplierPayout = filteredLeads.reduce((s, l) => s + (l.supplier_payout || 0), 0);
    const grossMargin = bookedRevenue - supplierPayout;
    const netMargin = filteredLeads.reduce((s, l) => s + (l.lead_net_revenue || 0), 0);
    const callRevenue = rawCalls.reduce((s, c) => s + (c.revenue || 0), 0);
    const cashCollected = rawBankTxns.reduce((s, t) => s + (t.amount > 0 ? t.amount : 0), 0);
    const soldRate = leads > 0 ? (sold / leads) * 100 : 0;
    const dqRate = leads > 0 ? (dq / leads) * 100 : 0;
    const returnRate = sold > 0 ? (returned / sold) * 100 : 0;
    const trueMargin = cashCollected > 0 ? ((cashCollected - supplierPayout) / Math.max(cashCollected, 1)) * 100 : 0;
    return { leads, sold, soldRate, dqRate, returnRate, bookedRevenue, supplierPayout, grossMargin, netMargin, cashCollected, callRevenue, trueMargin, dq, returned, fake };
  }, [filteredLeads, rawCalls, rawBankTxns]);

  // Daily table
  const dailyData = useMemo(() => {
    const byDate = {};
    filteredLeads.forEach(l => {
      const date = l.received_at ? new Date(l.received_at).toISOString().split('T')[0] : 'UNKNOWN';
      if (!byDate[date]) byDate[date] = { date, leads: 0, sold: 0, unsold: 0, dq: 0, returned: 0, fake: 0, bookedRevenue: 0, callRevenue: 0, supplierPayout: 0, mediaSpend: 0 };
      byDate[date].leads++;
      if (l.lead_status === 'Sold') byDate[date].sold++;
      if (l.lead_status === 'Unsold') byDate[date].unsold++;
      if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') byDate[date].dq++;
      if (l.lead_status === 'Returned') byDate[date].returned++;
      if (l.lead_status === 'Fake') byDate[date].fake++;
      byDate[date].bookedRevenue += l.lead_revenue || 0;
      byDate[date].supplierPayout += l.supplier_payout || 0;
    });
    rawCalls.forEach(c => {
      const date = c.created_date ? new Date(c.created_date).toISOString().split('T')[0] : null;
      if (date && byDate[date]) byDate[date].callRevenue += c.revenue || 0;
    });
    rawAdMetrics.forEach(a => {
      const date = a.date;
      if (date && byDate[date]) byDate[date].mediaSpend += a.spend || 0;
    });
    return Object.values(byDate).map(d => ({
      ...d,
      totalRevenue: d.bookedRevenue + d.callRevenue,
      grossMargin: d.bookedRevenue - d.supplierPayout,
      netMargin: d.totalRevenue - d.supplierPayout - d.mediaSpend,
      cashCollected: 'UNKNOWN',
      dataQuality: d.leads > 0 ? 'Complete' : 'Incomplete',
    })).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredLeads, rawCalls, rawAdMetrics]);

  // Supplier table
  const supplierData = useMemo(() => {
    const bySupplier = {};
    filteredLeads.forEach(l => {
      const name = l.supplier_sid || 'UNKNOWN';
      if (!bySupplier[name]) bySupplier[name] = { supplier: l.supplier_source || name, sid: name, leads: 0, sold: 0, dq: 0, returned: 0, revenue: 0, payoutAccrued: 0, payoutPaid: 0 };
      bySupplier[name].leads++;
      if (l.lead_status === 'Sold') bySupplier[name].sold++;
      if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') bySupplier[name].dq++;
      if (l.lead_status === 'Returned') bySupplier[name].returned++;
      bySupplier[name].revenue += l.lead_revenue || 0;
      bySupplier[name].payoutAccrued += l.supplier_payout || 0;
    });
    return Object.values(bySupplier).map(s => {
      const sellThrough = s.leads > 0 ? (s.sold / s.leads) * 100 : 0;
      const dqRate = s.leads > 0 ? (s.dq / s.leads) * 100 : 0;
      const returnRate = s.sold > 0 ? (s.returned / s.sold) * 100 : 0;
      const grossMargin = s.revenue - s.payoutAccrued;
      const qualityScore = Math.round((sellThrough * 0.3 + (100 - dqRate) * 0.3 + (100 - returnRate) * 0.2 + (grossMargin > 0 ? 20 : 0)));
      const verdict = qualityScore >= 70 ? 'STAR' : qualityScore >= 50 ? 'OK' : qualityScore >= 30 ? 'REVIEW TERMS' : 'PAUSE';
      return { ...s, sellThrough, dqRate, returnRate, grossMargin, arrears: 'UNKNOWN', payoutPaid: 'UNKNOWN', qualityScore, verdict };
    });
  }, [filteredLeads]);

  // Buyer table
  const buyerData = useMemo(() => {
    const byBuyer = {};
    filteredLeads.filter(l => l.lead_status === 'Sold').forEach(l => {
      const name = l.buyer_name || 'UNKNOWN';
      if (!byBuyer[name]) byBuyer[name] = { buyer: name, leadsSold: 0, bookedRevenue: 0, collectedCash: 0, returned: 0 };
      byBuyer[name].leadsSold++;
      byBuyer[name].bookedRevenue += l.lead_revenue || 0;
      if (l.lead_status === 'Returned') byBuyer[name].returned++;
    });
    return Object.values(byBuyer).map(b => {
      const outstandingAR = 'UNKNOWN';
      const conversionRate = b.leadsSold > 0 ? ((b.leadsSold - b.returned) / b.leadsSold) * 100 : 0;
      const returnRate = b.leadsSold > 0 ? (b.returned / b.leadsSold) * 100 : 0;
      const avgLeadPrice = b.leadsSold > 0 ? b.bookedRevenue / b.leadsSold : 0;
      const caseCount = 'UNKNOWN';
      return { ...b, outstandingAR, conversionRate, returnRate, caseCount, avgLeadPrice, paymentStatus: 'UNKNOWN', riskStatus: 'UNKNOWN' };
    });
  }, [filteredLeads]);

  // Campaign table
  const campaignData = useMemo(() => {
    return rawCampaignTruth.map(c => ({
      platform: c.platform || 'UNKNOWN',
      campaign: c.campaign_name || 'UNKNOWN',
      spendTracked: c.spend_tracked || 0,
      spendPaid: c.spend_paid || 0,
      webLeads: c.web_lead_count || 0,
      soldLeads: c.sold_leads || 0,
      dqRate: c.dq_rate || 0,
      callRevenue: c.call_revenue || 0,
      webRevenue: c.web_lead_revenue || 0,
      totalBookedRevenue: c.total_booked_revenue || 0,
      supplierPayout: c.supplier_payout_accrued || 0,
      trueGrossMargin: c.true_gross_margin || 0,
      cashMargin: c.cash_margin || 0,
      roas: c.booked_roas || 0,
      decision: c.decision || 'UNKNOWN',
      dataQuality: c.data_quality || 'Incomplete',
    }));
  }, [rawCampaignTruth]);

  // State table
  const stateData = useMemo(() => {
    const byState = {};
    filteredLeads.forEach(l => {
      const state = l.accident_state || l.geo_state || 'UNKNOWN';
      if (!byState[state]) byState[state] = { state, leads: 0, sold: 0, returned: 0, revenue: 0, payout: 0, buyers: new Set() };
      byState[state].leads++;
      if (l.lead_status === 'Sold') byState[state].sold++;
      if (l.lead_status === 'Returned') byState[state].returned++;
      byState[state].revenue += l.lead_revenue || 0;
      byState[state].payout += l.supplier_payout || 0;
      if (l.buyer_name) byState[state].buyers.add(l.buyer_name);
    });
    return Object.values(byState).map(s => {
      const soldRate = s.leads > 0 ? (s.sold / s.leads) * 100 : 0;
      const margin = s.revenue - s.payout;
      const returnRate = s.sold > 0 ? (s.returned / s.sold) * 100 : 0;
      const buyerCoverage = s.buyers.size;
      const verdict = soldRate >= 50 && margin > 0 ? 'SCALE' : soldRate >= 30 ? 'WATCH' : soldRate > 0 ? 'CUT' : 'UNKNOWN';
      return { state: s.state, leads: s.leads, sold: s.sold, soldRate, revenue: s.revenue, payout: s.payout, margin, returnRate, buyerCoverage, verdict };
    });
  }, [filteredLeads]);

  // Lead quality table
  const qualityData = useMemo(() => {
    const bySegment = {};
    filteredLeads.forEach(l => {
      const segment = l.supplier_source || l.supplier_sid || 'UNKNOWN';
      const key = `supplier|${segment}`;
      if (!bySegment[key]) bySegment[key] = { dimension: 'Supplier', segment, leads: 0, sold: 0, dq: 0, returned: 0, fake: 0, verifiedPhone: 0, revenue: 0, payout: 0 };
      bySegment[key].leads++;
      if (l.lead_status === 'Sold') bySegment[key].sold++;
      if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') bySegment[key].dq++;
      if (l.lead_status === 'Returned') bySegment[key].returned++;
      if (l.lead_status === 'Fake') bySegment[key].fake++;
      if (l.phone && l.phone.length >= 10) bySegment[key].verifiedPhone++;
      bySegment[key].revenue += l.lead_revenue || 0;
      bySegment[key].payout += l.supplier_payout || 0;
    });
    return Object.values(bySegment).map(s => {
      const soldPct = s.leads > 0 ? (s.sold / s.leads) * 100 : 0;
      const dqPct = s.leads > 0 ? (s.dq / s.leads) * 100 : 0;
      const returnPct = s.sold > 0 ? (s.returned / s.sold) * 100 : 0;
      const fakePct = s.leads > 0 ? (s.fake / s.leads) * 100 : 0;
      const verifiedPct = s.leads > 0 ? (s.verifiedPhone / s.leads) * 100 : 0;
      const avgRevPerLead = s.leads > 0 ? s.revenue / s.leads : 0;
      const avgMarginPerLead = s.leads > 0 ? (s.revenue - s.payout) / s.leads : 0;
      const qualityScore = Math.round(soldPct * 0.3 + (100 - dqPct) * 0.2 + (100 - returnPct) * 0.2 + (100 - fakePct) * 0.15 + verifiedPct * 0.15);
      return { dimension: s.dimension, segment: s.segment, leads: s.leads, soldPct, dqPct, returnPct, fakePct, verifiedPct, avgRevPerLead, avgMarginPerLead, qualityScore };
    });
  }, [filteredLeads]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.vertical) chips.push({ key: 'vertical', label: 'Vertical', value: filters.vertical });
    if (filters.supplier) chips.push({ key: 'supplier', label: 'Supplier', value: filters.supplier });
    if (filters.buyer) chips.push({ key: 'buyer', label: 'Buyer', value: filters.buyer });
    if (filters.platform) chips.push({ key: 'platform', label: 'Platform', value: filters.platform });
    if (filters.state) chips.push({ key: 'state', label: 'State', value: filters.state });
    if (filters.status) chips.push({ key: 'status', label: 'Status', value: filters.status });
    return chips;
  }, [filters]);

  const removeFilter = (key) => setFilters(prev => ({ ...prev, [key]: '' }));

  const renderVerdict = (val) => <StatusBadge status={val} />;
  const renderMoney = (val) => <span className={moneyColor(val)}>{formatMoney(val, { compact: true })}</span>;
  const renderPercent = (val) => val === 'UNKNOWN' ? 'UNKNOWN' : formatPercent(val);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Performance Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-1">Unified performance across leads, calls, campaigns, suppliers, buyers, and states</p>
      </div>

      {/* Filter Bar */}
      <SectionPanel title="Filters">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          <select value={filters.vertical} onChange={e => setFilters(p => ({ ...p, vertical: e.target.value }))} className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
            <option value="">All Verticals</option>
            <option value="MVA">MVA</option>
            <option value="WC">WC</option>
            <option value="Other">Other</option>
          </select>
          <input value={filters.supplier} onChange={e => setFilters(p => ({ ...p, supplier: e.target.value }))} placeholder="Supplier SID" className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground" />
          <input value={filters.buyer} onChange={e => setFilters(p => ({ ...p, buyer: e.target.value }))} placeholder="Buyer" className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground" />
          <select value={filters.platform} onChange={e => setFilters(p => ({ ...p, platform: e.target.value }))} className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
            <option value="">All Platforms</option>
            <option value="Meta">Meta</option>
            <option value="Google">Google</option>
            <option value="YouTube">YouTube</option>
            <option value="Taboola">Taboola</option>
          </select>
          <input value={filters.state} onChange={e => setFilters(p => ({ ...p, state: e.target.value }))} placeholder="State" className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground" />
          <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
            <option value="">All Statuses</option>
            <option>Sold</option><option>Unsold</option><option>Disqualified</option><option>Returned</option><option>Fake</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={filters.includeTest} onChange={e => setFilters(p => ({ ...p, includeTest: e.target.checked }))} className="accent-primary" />
            Test leads
          </label>
          <button onClick={() => setFilters({ vertical: '', supplier: '', buyer: '', platform: '', state: '', status: '', includeTest: false })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2 py-1.5">
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
        {activeFilterChips.length > 0 && <div className="mt-2"><FilterChips filters={activeFilterChips} onRemove={removeFilter} /></div>}
      </SectionPanel>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <MetricCard label="Leads Received" value={metrics.leads} type="BOOKED" />
        <MetricCard label="Sold Leads" value={metrics.sold} type="BOOKED" />
        <MetricCard label="Sold Rate" value={formatPercent(metrics.soldRate)} type="BOOKED" />
        <MetricCard label="DQ Rate" value={formatPercent(metrics.dqRate)} type="BOOKED" />
        <MetricCard label="Return Rate" value={formatPercent(metrics.returnRate)} type="BOOKED" />
        <MetricCard label="Booked Revenue" value={metrics.bookedRevenue} type="BOOKED" />
        <MetricCard label="Supplier Payout" value={metrics.supplierPayout} type="ACCRUED" />
        <MetricCard label="Gross Margin" value={metrics.grossMargin} type="BOOKED" />
        <MetricCard label="Net Margin" value={metrics.netMargin} type="BOOKED" />
        <MetricCard label="Cash Collected" value={metrics.cashCollected || 'UNKNOWN'} type="CASH" />
        <MetricCard label="Calls Revenue" value={metrics.callRevenue} type="BOOKED" />
        <MetricCard label="True Margin" value={formatPercent(metrics.trueMargin)} type="CASH" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tables */}
      {activeTab === 'daily' && (
        <DataTable
          exportFileName="daily_performance"
          data={dailyData}
          onRowClick={setSelectedRow}
          totalsRow={{
            date: 'TOTAL', leads: dailyData.reduce((s, d) => s + d.leads, 0),
            sold: dailyData.reduce((s, d) => s + d.sold, 0),
            unsold: dailyData.reduce((s, d) => s + d.unsold, 0),
            dq: dailyData.reduce((s, d) => s + d.dq, 0),
            returned: dailyData.reduce((s, d) => s + d.returned, 0),
            fake: dailyData.reduce((s, d) => s + d.fake, 0),
            bookedRevenue: formatMoney(dailyData.reduce((s, d) => s + d.bookedRevenue, 0)),
            callRevenue: formatMoney(dailyData.reduce((s, d) => s + d.callRevenue, 0)),
            totalRevenue: formatMoney(dailyData.reduce((s, d) => s + d.totalRevenue, 0)),
            supplierPayout: formatMoney(dailyData.reduce((s, d) => s + d.supplierPayout, 0)),
            mediaSpend: formatMoney(dailyData.reduce((s, d) => s + d.mediaSpend, 0)),
            grossMargin: formatMoney(dailyData.reduce((s, d) => s + d.grossMargin, 0)),
            netMargin: formatMoney(dailyData.reduce((s, d) => s + d.netMargin, 0)),
            cashCollected: 'UNKNOWN', dataQuality: '',
          }}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'sold', label: 'Sold', align: 'right' },
            { key: 'unsold', label: 'Unsold', align: 'right' },
            { key: 'dq', label: 'DQ', align: 'right' },
            { key: 'returned', label: 'Returned', align: 'right' },
            { key: 'fake', label: 'Fake', align: 'right' },
            { key: 'bookedRevenue', label: 'Booked Rev', align: 'right', render: renderMoney },
            { key: 'callRevenue', label: 'Call Rev', align: 'right', render: renderMoney },
            { key: 'totalRevenue', label: 'Total Rev', align: 'right', render: renderMoney },
            { key: 'supplierPayout', label: 'Payout', align: 'right', render: renderMoney },
            { key: 'mediaSpend', label: 'Media Spend', align: 'right', render: renderMoney },
            { key: 'grossMargin', label: 'Gross Margin', align: 'right', render: renderMoney },
            { key: 'netMargin', label: 'Net Margin', align: 'right', render: renderMoney },
            { key: 'cashCollected', label: 'Cash Coll.', align: 'right' },
            { key: 'dataQuality', label: 'Data Quality' },
          ]}
        />
      )}

      {activeTab === 'supplier' && (
        <DataTable
          exportFileName="supplier_performance"
          data={supplierData}
          onRowClick={(row) => setFilters(prev => ({ ...prev, supplier: row.sid }))}
          totalsRow={{
            supplier: 'TOTAL', sid: '', leads: supplierData.reduce((s, d) => s + d.leads, 0),
            sold: supplierData.reduce((s, d) => s + d.sold, 0),
            sellThrough: '', dqRate: '', returnRate: '',
            revenue: formatMoney(supplierData.reduce((s, d) => s + d.revenue, 0)),
            payoutAccrued: formatMoney(supplierData.reduce((s, d) => s + d.payoutAccrued, 0)),
            payoutPaid: '', grossMargin: formatMoney(supplierData.reduce((s, d) => s + d.grossMargin, 0)),
            arrears: '', qualityScore: '', verdict: '',
          }}
          columns={[
            { key: 'supplier', label: 'Supplier' },
            { key: 'sid', label: 'SID' },
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'sold', label: 'Sold', align: 'right' },
            { key: 'sellThrough', label: 'Sell-through %', align: 'right', render: renderPercent },
            { key: 'dqRate', label: 'DQ %', align: 'right', render: renderPercent },
            { key: 'returnRate', label: 'Return %', align: 'right', render: renderPercent },
            { key: 'revenue', label: 'Revenue', align: 'right', render: renderMoney },
            { key: 'payoutAccrued', label: 'Payout Accrued', align: 'right', render: renderMoney },
            { key: 'payoutPaid', label: 'Payout Paid', align: 'right' },
            { key: 'grossMargin', label: 'Gross Margin', align: 'right', render: renderMoney },
            { key: 'arrears', label: 'Arrears', align: 'right' },
            { key: 'qualityScore', label: 'Quality Score', align: 'right' },
            { key: 'verdict', label: 'Verdict', render: renderVerdict },
          ]}
        />
      )}

      {activeTab === 'buyer' && (
        <DataTable
          exportFileName="buyer_performance"
          data={buyerData}
          onRowClick={(row) => setFilters(prev => ({ ...prev, buyer: row.buyer }))}
          totalsRow={{
            buyer: 'TOTAL',
            leadsSold: buyerData.reduce((s, d) => s + d.leadsSold, 0),
            bookedRevenue: formatMoney(buyerData.reduce((s, d) => s + d.bookedRevenue, 0)),
            collectedCash: '', outstandingAR: '', conversionRate: '', returnRate: '',
            caseCount: '', avgLeadPrice: '', paymentStatus: '', riskStatus: '',
          }}
          columns={[
            { key: 'buyer', label: 'Buyer' },
            { key: 'leadsSold', label: 'Leads Sold', align: 'right' },
            { key: 'bookedRevenue', label: 'Booked Revenue', align: 'right', render: renderMoney },
            { key: 'collectedCash', label: 'Collected Cash', align: 'right' },
            { key: 'outstandingAR', label: 'Outstanding AR', align: 'right' },
            { key: 'conversionRate', label: 'Conv. Rate', align: 'right', render: renderPercent },
            { key: 'returnRate', label: 'Return Rate', align: 'right', render: renderPercent },
            { key: 'caseCount', label: 'Case Count', align: 'right' },
            { key: 'avgLeadPrice', label: 'Avg Lead Price', align: 'right', render: renderMoney },
            { key: 'paymentStatus', label: 'Payment Status' },
            { key: 'riskStatus', label: 'Risk Status' },
          ]}
        />
      )}

      {activeTab === 'campaign' && (
        <DataTable
          exportFileName="campaign_performance"
          data={campaignData}
          onRowClick={setSelectedRow}
          columns={[
            { key: 'platform', label: 'Platform' },
            { key: 'campaign', label: 'Campaign' },
            { key: 'spendTracked', label: 'Spend Tracked', align: 'right', render: renderMoney },
            { key: 'spendPaid', label: 'Spend Paid', align: 'right', render: renderMoney },
            { key: 'webLeads', label: 'Web Leads', align: 'right' },
            { key: 'soldLeads', label: 'Sold Leads', align: 'right' },
            { key: 'dqRate', label: 'DQ Rate', align: 'right', render: renderPercent },
            { key: 'callRevenue', label: 'Call Rev', align: 'right', render: renderMoney },
            { key: 'webRevenue', label: 'Web Rev', align: 'right', render: renderMoney },
            { key: 'totalBookedRevenue', label: 'Total Booked Rev', align: 'right', render: renderMoney },
            { key: 'supplierPayout', label: 'Supplier Payout', align: 'right', render: renderMoney },
            { key: 'trueGrossMargin', label: 'True Gross Margin', align: 'right', render: renderMoney },
            { key: 'cashMargin', label: 'Cash Margin', align: 'right', render: renderMoney },
            { key: 'roas', label: 'ROAS', align: 'right', render: (v) => v ? `${v.toFixed(2)}x` : 'UNKNOWN' },
            { key: 'decision', label: 'Decision', render: renderVerdict },
            { key: 'dataQuality', label: 'Data Quality' },
          ]}
        />
      )}

      {activeTab === 'state' && (
        <DataTable
          exportFileName="state_performance"
          data={stateData}
          onRowClick={(row) => setFilters(prev => ({ ...prev, state: row.state }))}
          totalsRow={{
            state: 'TOTAL',
            leads: stateData.reduce((s, d) => s + d.leads, 0),
            sold: stateData.reduce((s, d) => s + d.sold, 0),
            soldRate: '', revenue: formatMoney(stateData.reduce((s, d) => s + d.revenue, 0)),
            payout: formatMoney(stateData.reduce((s, d) => s + d.payout, 0)),
            margin: formatMoney(stateData.reduce((s, d) => s + d.margin, 0)),
            returnRate: '', buyerCoverage: '', verdict: '',
          }}
          columns={[
            { key: 'state', label: 'State' },
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'sold', label: 'Sold', align: 'right' },
            { key: 'soldRate', label: 'Sold Rate', align: 'right', render: renderPercent },
            { key: 'revenue', label: 'Revenue', align: 'right', render: renderMoney },
            { key: 'payout', label: 'Payout', align: 'right', render: renderMoney },
            { key: 'margin', label: 'Margin', align: 'right', render: renderMoney },
            { key: 'returnRate', label: 'Return Rate', align: 'right', render: renderPercent },
            { key: 'buyerCoverage', label: 'Buyer Coverage', align: 'right' },
            { key: 'verdict', label: 'Verdict', render: renderVerdict },
          ]}
        />
      )}

      {activeTab === 'quality' && (
        <DataTable
          exportFileName="lead_quality"
          data={qualityData}
          onRowClick={setSelectedRow}
          columns={[
            { key: 'dimension', label: 'Dimension' },
            { key: 'segment', label: 'Segment' },
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'soldPct', label: 'Sold %', align: 'right', render: renderPercent },
            { key: 'dqPct', label: 'DQ %', align: 'right', render: renderPercent },
            { key: 'returnPct', label: 'Return %', align: 'right', render: renderPercent },
            { key: 'fakePct', label: 'Fake %', align: 'right', render: renderPercent },
            { key: 'verifiedPct', label: 'Verified Phone %', align: 'right', render: renderPercent },
            { key: 'avgRevPerLead', label: 'Avg Rev/Lead', align: 'right', render: renderMoney },
            { key: 'avgMarginPerLead', label: 'Avg Margin/Lead', align: 'right', render: renderMoney },
            { key: 'qualityScore', label: 'Quality Score', align: 'right' },
          ]}
        />
      )}

      {/* Row Detail Drawer */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedRow(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-96 h-full border-l border-border overflow-y-auto p-5" style={{ background: 'hsl(213, 17%, 20%)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">Detail</h3>
              <button onClick={() => setSelectedRow(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2">
              {Object.entries(selectedRow).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{key}</span>
                  <span className="font-medium tabular-nums">{val === null || val === undefined ? 'UNKNOWN' : String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}