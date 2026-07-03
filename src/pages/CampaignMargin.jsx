import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import WarningBanner from '@/components/shared/WarningBanner';
import CashBookedPill from '@/components/shared/CashBookedPill';
import { formatMoney, formatPercent, moneyColor, formatNumber } from '@/lib/formatters';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function CampaignMargin() {
  const [truthMetrics, setTruthMetrics] = useState([]);
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [adSpend, setAdSpend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truth, lds, cls, ads] = await Promise.all([
        base44.entities.CampaignTruthMetric.list(undefined, 500),
        base44.entities.Lead.list(undefined, 500),
        base44.entities.Call.list(undefined, 500),
        base44.entities.AdSpend.list(undefined, 500),
      ]);
      setTruthMetrics(truth);
      setLeads(lds);
      setCalls(cls);
      setAdSpend(ads.filter(a => !a.superseded));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const hasCallData = calls.length > 0;

  // If CampaignTruthMetric data exists, use it as the financial truth view
  const truthData = useMemo(() => {
    if (truthMetrics.length === 0) return null;
    const groups = {};
    truthMetrics.forEach(t => {
      const key = t.campaign_name;
      if (!groups[key]) groups[key] = {
        campaign: t.campaign_name, platform: t.platform,
        spend_tracked: 0, spend_paid: 0,
        web_lead_revenue: 0, call_revenue: 0, total_booked_revenue: 0,
        buyer_collected_cash: 0, supplier_payout_accrued: 0, supplier_payout_paid: 0,
        web_lead_count: 0, sold_leads: 0, dq_leads: 0, returned_leads: 0,
        call_count: 0, converted_calls: 0,
        has_calls: false, has_cash: false, has_buyer_feedback: false,
        buyer_name: t.buyer_name, supplier_sid: t.supplier_sid,
      };
      const g = groups[key];
      g.spend_tracked += t.spend_tracked || 0;
      g.spend_paid += t.spend_paid || 0;
      g.web_lead_revenue += t.web_lead_revenue || 0;
      g.call_revenue += t.call_revenue || 0;
      g.total_booked_revenue += t.total_booked_revenue || 0;
      g.buyer_collected_cash += t.buyer_collected_cash || 0;
      g.supplier_payout_accrued += t.supplier_payout_accrued || 0;
      g.supplier_payout_paid += t.supplier_payout_paid || 0;
      g.web_lead_count += t.web_lead_count || 0;
      g.sold_leads += t.sold_leads || 0;
      g.dq_leads += t.dq_leads || 0;
      g.returned_leads += t.returned_leads || 0;
      g.call_count += t.call_count || 0;
      g.converted_calls += t.converted_calls || 0;
      if (t.call_count > 0) g.has_calls = true;
      if (t.buyer_collected_cash > 0) g.has_cash = true;
      if (t.sold_leads > 0 || t.dq_leads > 0) g.has_buyer_feedback = true;
    });
    return Object.values(groups).map(g => {
      const true_margin = g.total_booked_revenue - g.spend_tracked - g.supplier_payout_accrued;
      const cash_margin = g.has_cash ? g.buyer_collected_cash - g.spend_paid - g.supplier_payout_paid : null;
      const booked_roas = g.spend_tracked > 0 ? g.total_booked_revenue / g.spend_tracked : 0;
      const cash_roas = g.has_cash && g.spend_paid > 0 ? g.buyer_collected_cash / g.spend_paid : null;
      const dq_rate = g.web_lead_count > 0 ? g.dq_leads / g.web_lead_count : 0;
      const return_rate = (g.sold_leads + g.returned_leads) > 0 ? g.returned_leads / (g.sold_leads + g.returned_leads) : 0;

      let data_quality = 'Complete';
      if (!g.has_calls && g.spend_tracked > 0) data_quality = 'Missing Calls';
      else if (!g.has_buyer_feedback) data_quality = 'Missing Buyer Feedback';
      else if (!g.has_cash) data_quality = 'Missing Cash';
      else if (g.spend_tracked === 0) data_quality = 'Missing Spend';

      let decision = 'UNKNOWN';
      let reason = '';
      if (data_quality === 'Missing Calls' || data_quality === 'Missing Spend' || data_quality === 'Incomplete') {
        decision = 'UNKNOWN'; reason = 'Missing calls or spend data';
      } else if (true_margin < -500 && g.spend_tracked > 2000) {
        decision = 'CUT'; reason = `Negative true margin ${formatMoney(true_margin)}`;
      } else if (dq_rate > 0.4 || return_rate > 0.25) {
        decision = 'CUT'; reason = `Poor lead quality (DQ ${formatPercent(dq_rate*100)}, ret ${formatPercent(return_rate*100)})`;
      } else if (cash_margin !== null && cash_margin < -500) {
        decision = 'CUT'; reason = `Cash margin negative ${formatMoney(cash_margin)}`;
      } else if (true_margin > 500 && dq_rate < 0.25 && return_rate < 0.15) {
        decision = (cash_margin !== null && cash_margin > 0) ? 'SCALE' : 'WATCH';
        reason = decision === 'SCALE' ? `Positive true + cash margin` : 'Booked positive, cash unclear';
      } else {
        decision = 'WATCH'; reason = 'Hold for more data';
      }

      return { ...g, true_margin, cash_margin, booked_roas, cash_roas, dq_rate, return_rate, data_quality, decision, reason };
    }).sort((a, b) => b.spend_tracked - a.spend_tracked);
  }, [truthMetrics]);

  // Fallback: compute from raw entities (legacy mode)
  const legacyRows = useMemo(() => {
    if (truthData) return null;
    const campaigns = {};
    leads.forEach(l => {
      const camp = l.utm_campaign || 'Unknown';
      if (!campaigns[camp]) campaigns[camp] = { campaign: camp, platform: '', spend: 0, webRevenue: 0, callRevenue: 0, supplierPayout: 0, leadCount: 0, hasCalls: false };
      campaigns[camp].webRevenue += (l.lead_net_revenue || 0);
      campaigns[camp].supplierPayout += (l.supplier_payout || 0);
      campaigns[camp].leadCount++;
    });
    calls.forEach(c => {
      const camp = c.campaign || c.utm_campaign || 'Unknown';
      if (!campaigns[camp]) campaigns[camp] = { campaign: camp, platform: '', spend: 0, webRevenue: 0, callRevenue: 0, supplierPayout: 0, leadCount: 0, hasCalls: false };
      campaigns[camp].callRevenue += (c.revenue || 0);
      campaigns[camp].hasCalls = true;
    });
    adSpend.forEach(a => {
      const camp = a.campaign || 'Unknown';
      if (!campaigns[camp]) campaigns[camp] = { campaign: camp, platform: a.platform || '', spend: 0, webRevenue: 0, callRevenue: 0, supplierPayout: 0, leadCount: 0, hasCalls: false };
      campaigns[camp].spend += (a.cost || 0);
      if (a.platform && !campaigns[camp].platform) campaigns[camp].platform = a.platform;
    });
    return Object.values(campaigns).map(c => {
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
  }, [truthData, leads, calls, adSpend]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Campaign True Margin</h1>
        <p className="text-xs text-muted-foreground mt-1">Web leads + calls − spend − supplier payout = true margin · joined to cash truth</p>
      </div>

      {!hasCallData && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-300 font-medium">Call revenue missing. Campaign margin may be understated. Import call data from Ringba/TrueCall/Walker.</span>
        </div>
      )}

      <WarningBanner>Campaign margin is incomplete without calls. Do not rely only on masterview profit. True margin = web lead revenue + call revenue − tracked spend − supplier payout.</WarningBanner>

      {truthData ? (
        <SectionPanel title="Campaign Truth (Financial Truth View)" subtitle={`${truthData.length} campaigns · joined to cash, calls, buyer feedback`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Campaign</th>
                  <th className="pb-2 pr-3">Platform</th>
                  <th className="pb-2 pr-3">Data Quality</th>
                  <th className="pb-2 pr-3 text-right">Spend Trk <CashBookedPill type="BOOKED" /></th>
                  <th className="pb-2 pr-3 text-right">Spend Paid <CashBookedPill type="CASH" /></th>
                  <th className="pb-2 pr-3 text-right">Web Rev <CashBookedPill type="BOOKED" /></th>
                  <th className="pb-2 pr-3 text-right">Call Rev <CashBookedPill type="BOOKED" /></th>
                  <th className="pb-2 pr-3 text-right">Booked Rev</th>
                  <th className="pb-2 pr-3 text-right">Cash Coll</th>
                  <th className="pb-2 pr-3 text-right">Supp Accr</th>
                  <th className="pb-2 pr-3 text-right">True Margin</th>
                  <th className="pb-2 pr-3 text-right">Cash Margin</th>
                  <th className="pb-2 pr-3 text-right">B ROAS</th>
                  <th className="pb-2 pr-3 text-right">C ROAS</th>
                  <th className="pb-2 pr-3">Decision</th>
                  <th className="pb-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {truthData.map((r, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                    <td className="py-2 pr-3 font-medium max-w-40 truncate">
                      <Link to="/smart-ad-reporting" className="hover:text-[#E4262C]">{r.campaign}</Link>
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.platform}</td>
                    <td className="py-2 pr-3"><DataQualityBadge quality={r.data_quality} /></td>
                    <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{formatMoney(r.spend_tracked)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.spend_paid)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatMoney(r.web_lead_revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.has_calls ? formatMoney(r.call_revenue) : <span className="text-red-400/50">MISSING</span>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatMoney(r.total_booked_revenue)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.has_cash ? formatMoney(r.buyer_collected_cash) : <span className="text-red-400/50">?</span>}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-orange-400">{formatMoney(r.supplier_payout_accrued)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums font-bold ${moneyColor(r.true_margin)}`}>{formatMoney(r.true_margin)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums font-bold ${r.cash_margin !== null ? moneyColor(r.cash_margin) : 'text-muted-foreground/40'}`}>{r.cash_margin !== null ? formatMoney(r.cash_margin) : '?'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.booked_roas > 0 ? `${r.booked_roas.toFixed(2)}x` : '—'}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.cash_roas !== null ? `${r.cash_roas.toFixed(2)}x` : '—'}</td>
                    <td className="py-2 pr-3"><StatusBadge status={r.decision} /></td>
                    <td className="py-2 text-[10px] text-muted-foreground max-w-32 truncate">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionPanel>
      ) : (
        <SectionPanel title="Campaign Performance" subtitle={`${legacyRows.length} campaigns`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Campaign</th>
                  <th className="pb-2 pr-3">Platform</th>
                  <th className="pb-2 pr-3 text-right">Spend <CashBookedPill type="BOOKED" /></th>
                  <th className="pb-2 pr-3 text-right">Web Rev <CashBookedPill type="BOOKED" /></th>
                  <th className="pb-2 pr-3 text-right">Call Rev <CashBookedPill type="BOOKED" /></th>
                  <th className="pb-2 pr-3 text-right">Total Rev</th>
                  <th className="pb-2 pr-3 text-right">Supplier</th>
                  <th className="pb-2 pr-3 text-right">True Margin</th>
                  <th className="pb-2 pr-3 text-right">ROAS</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {legacyRows.map((r, i) => (
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
      )}
    </div>
  );
}

function DataQualityBadge({ quality }) {
  const colors = {
    'Complete': 'bg-emerald-500/10 text-emerald-400',
    'Missing Calls': 'bg-red-500/10 text-red-400',
    'Missing Spend': 'bg-red-500/10 text-red-400',
    'Missing Buyer Feedback': 'bg-yellow-500/10 text-yellow-400',
    'Missing Cash': 'bg-yellow-500/10 text-yellow-400',
    'Incomplete': 'bg-orange-500/10 text-orange-400',
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${colors[quality] || colors['Incomplete']}`}>
      {quality === 'Complete' ? '✓' : '⚠'} {quality}
    </span>
  );
}