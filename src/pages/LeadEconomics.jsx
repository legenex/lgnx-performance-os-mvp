import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import WarningBanner from '@/components/shared/WarningBanner';
import { formatMoney, formatNumber } from '@/lib/formatters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LeadEconomics() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBuyer, setFilterBuyer] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const lds = await base44.entities.Lead.list(undefined, 500);
      setLeads(lds);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  let filtered = leads;
  if (filterStatus !== 'all') filtered = filtered.filter(l => l.lead_status === filterStatus);
  if (filterBuyer !== 'all') filtered = filtered.filter(l => l.buyer_name === filterBuyer);
  if (filterSupplier !== 'all') filtered = filtered.filter(l => (l.supplier_source || l.supplier_brand) === filterSupplier);

  const total = filtered.length;
  const sold = filtered.filter(l => l.lead_status === 'Sold').length;
  const dq = filtered.filter(l => l.lead_status === 'Disqualified').length;
  const returned = filtered.filter(l => l.lead_status === 'Returned').length;
  const fake = filtered.filter(l => l.lead_status === 'Fake').length;
  const revenue = filtered.reduce((s, l) => s + (l.lead_revenue || 0), 0);
  const payout = filtered.reduce((s, l) => s + (l.supplier_payout || 0), 0);
  const profit = filtered.reduce((s, l) => s + (l.profit || 0), 0);
  const netProfit = filtered.reduce((s, l) => s + (l.net_profit || 0), 0);

  const buyers = [...new Set(leads.map(l => l.buyer_name).filter(Boolean))];
  const suppliers = [...new Set(leads.map(l => l.supplier_source || l.supplier_brand).filter(Boolean))];
  const statuses = ['Sold', 'Unsold', 'Disqualified', 'Returned', 'Fake', 'Calls', 'NoCost'];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Lead Economics</h1>
        <p className="text-xs text-muted-foreground mt-1">Lead-level performance from imported data</p>
      </div>

      <WarningBanner>All revenue and profit metrics below are BOOKED, not CASH. Cash status depends on AR collection. Masterview is legacy reference only.</WarningBanner>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-8 text-xs bg-secondary"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBuyer} onValueChange={setFilterBuyer}>
          <SelectTrigger className="w-44 h-8 text-xs bg-secondary"><SelectValue placeholder="Buyer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Buyers</SelectItem>
            {buyers.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-44 h-8 text-xs bg-secondary"><SelectValue placeholder="Supplier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        <MetricCard title="Leads" value={formatNumber(total)} />
        <MetricCard title="Sold" value={formatNumber(sold)} />
        <MetricCard title="DQ" value={formatNumber(dq)} />
        <MetricCard title="Returned" value={formatNumber(returned)} />
        <MetricCard title="Fake" value={formatNumber(fake)} />
        <MetricCard title="Revenue" value={revenue} label="BOOKED" />
        <MetricCard title="Payout" value={payout} label="BOOKED" />
        <MetricCard title="Profit" value={profit} label="BOOKED" />
        <MetricCard title="Net Profit" value={netProfit} label="BOOKED" />
      </div>

      {/* Lead Table */}
      <SectionPanel title="Lead Data" subtitle={`${filtered.length} leads`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Buyer</th>
                <th className="pb-2 pr-3">Supplier</th>
                <th className="pb-2 pr-3">Campaign</th>
                <th className="pb-2 pr-3">State</th>
                <th className="pb-2 pr-3 text-right">Revenue <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 pr-3 text-right">Payout <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 text-right">Profit <span className="text-[9px] text-blue-400">B</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((l, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-3 tabular-nums text-muted-foreground">{l.date}</td>
                  <td className="py-1.5 pr-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      l.lead_status === 'Sold' ? 'bg-emerald-500/10 text-emerald-400' :
                      l.lead_status === 'Disqualified' ? 'bg-red-500/10 text-red-400' :
                      l.lead_status === 'Returned' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-gray-500/10 text-gray-400'
                    }`}>{l.lead_status}</span>
                  </td>
                  <td className="py-1.5 pr-3">{l.buyer_name || '—'}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{l.supplier_source || l.supplier_brand || '—'}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground max-w-32 truncate">{l.utm_campaign || '—'}</td>
                  <td className="py-1.5 pr-3 text-muted-foreground">{l.accident_state || l.geo_state || '—'}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{formatMoney(l.lead_revenue)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-orange-400">{formatMoney(l.supplier_payout)}</td>
                  <td className={`py-1.5 text-right tabular-nums font-medium ${l.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatMoney(l.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}