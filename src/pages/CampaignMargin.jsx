import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import { formatMoney, formatPercent, moneyColor } from '@/lib/formatters';
import { AlertTriangle } from 'lucide-react';

export default function CampaignMargin() {
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [adSpend, setAdSpend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [lds, cls, ads] = await Promise.all([
        base44.entities.Lead.list(undefined, 500),
        base44.entities.Call.list(undefined, 500),
        base44.entities.AdSpend.list(undefined, 500),
      ]);
      setLeads(lds);
      setCalls(cls);
      setAdSpend(ads.filter(a => !a.superseded));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const hasCallData = calls.length > 0;

  // Group by campaign
  const campaigns = {};
  
  // Leads by utm_campaign
  leads.forEach(l => {
    const camp = l.utm_campaign || 'Unknown';
    if (!campaigns[camp]) campaigns[camp] = { campaign: camp, platform: '', spend: 0, webRevenue: 0, callRevenue: 0, supplierPayout: 0, leadCount: 0 };
    campaigns[camp].webRevenue += (l.lead_net_revenue || 0);
    campaigns[camp].supplierPayout += (l.supplier_payout || 0);
    campaigns[camp].leadCount++;
  });

  // Calls by campaign
  calls.forEach(c => {
    const camp = c.campaign || c.utm_campaign || 'Unknown';
    if (!campaigns[camp]) campaigns[camp] = { campaign: camp, platform: '', spend: 0, webRevenue: 0, callRevenue: 0, supplierPayout: 0, leadCount: 0 };
    campaigns[camp].callRevenue += (c.revenue || 0);
  });

  // Ad spend by campaign
  adSpend.forEach(a => {
    const camp = a.campaign || 'Unknown';
    if (!campaigns[camp]) campaigns[camp] = { campaign: camp, platform: a.platform || '', spend: 0, webRevenue: 0, callRevenue: 0, supplierPayout: 0, leadCount: 0 };
    campaigns[camp].spend += (a.cost || 0);
    if (a.platform && !campaigns[camp].platform) campaigns[camp].platform = a.platform;
  });

  // Calculate margins
  const rows = Object.values(campaigns).map(c => {
    const totalRevenue = c.webRevenue + c.callRevenue;
    const trueMargin = totalRevenue - c.spend - c.supplierPayout;
    const roas = c.spend > 0 ? totalRevenue / c.spend : 0;
    let status = 'UNKNOWN';
    if (c.spend > 0) {
      if (trueMargin < -500) status = 'CUT';
      else if (trueMargin < 500) status = 'WATCH';
      else status = 'SCALE';
    }
    return { ...c, totalRevenue, trueMargin, roas, status };
  }).sort((a, b) => b.trueMargin - a.trueMargin);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Campaign True Margin</h1>
        <p className="text-xs text-muted-foreground mt-1">Web leads + calls − spend − supplier payout = true margin</p>
      </div>

      {!hasCallData && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-300 font-medium">Call revenue missing. Campaign margin may be understated. Import call data from Ringba/TrueCall/Walker.</span>
        </div>
      )}

      <WarningBanner>Campaign margin is incomplete without calls. Do not rely only on masterview profit. True margin = web lead revenue + call revenue − tracked spend − supplier payout.</WarningBanner>

      <SectionPanel title="Campaign Performance" subtitle={`${rows.length} campaigns`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Campaign</th>
                <th className="pb-2 pr-3">Platform</th>
                <th className="pb-2 pr-3 text-right">Spend <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 pr-3 text-right">Web Rev <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 pr-3 text-right">Call Rev <span className="text-[9px] text-blue-400">B</span></th>
                <th className="pb-2 pr-3 text-right">Total Rev</th>
                <th className="pb-2 pr-3 text-right">Supplier</th>
                <th className="pb-2 pr-3 text-right">True Margin</th>
                <th className="pb-2 pr-3 text-right">ROAS</th>
                <th className="pb-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-2 pr-3 font-medium max-w-48 truncate">{r.campaign}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{r.platform}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{formatMoney(r.spend)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.webRevenue)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.callRevenue > 0 ? formatMoney(r.callRevenue) : <span className="text-red-400/50">—</span>}</td>
                  <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatMoney(r.totalRevenue)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{formatMoney(r.supplierPayout)}</td>
                  <td className={`py-2 pr-3 text-right tabular-nums font-bold ${moneyColor(r.trueMargin)}`}>{formatMoney(r.trueMargin)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{r.roas > 0 ? `${r.roas.toFixed(2)}x` : '—'}</td>
                  <td className="py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}