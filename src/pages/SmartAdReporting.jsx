import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import CashBookedPill from '@/components/shared/CashBookedPill';
import AdFilterBar from '@/components/shared/AdFilterBar';
import AdDetailDrawer from '@/components/shared/AdDetailDrawer';
import { formatMoney, formatPercent, moneyColor, formatNumber } from '@/lib/formatters';
import { AlertTriangle, BarChart3, Rocket, Scissors } from 'lucide-react';

export default function SmartAdReporting() {
  const [truthMetrics, setTruthMetrics] = useState([]);
  const [adAlerts, setAdAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);
  const [gatewayLeads, setGatewayLeads] = useState([]);
  const [capiEvents, setCapiEvents] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truth, alerts, gwLeads, capi] = await Promise.all([
        base44.entities.CampaignTruthMetric.list(undefined, 500),
        base44.entities.AdAlert.filter({ status: 'Open' }),
        base44.entities.GatewayLead.list(undefined, 500),
        base44.entities.EventTrackingLog.list(undefined, 500),
      ]);
      setTruthMetrics(truth);
      setAdAlerts(alerts);
      setGatewayLeads(gwLeads);
      setCapiEvents(capi);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const gatewayStatusMap = useMemo(() => {
    const map = {};
    gatewayLeads.forEach(l => {
      const camp = l.utm_campaign;
      if (!camp) return;
      if (!map[camp]) map[camp] = { leads: 0, sold: 0, capiSoldEvents: 0 };
      map[camp].leads++;
      if (l.lead_status === 'Sold') map[camp].sold++;
      const capiForLead = capiEvents.filter(e => e.gateway_lead_id === l.gateway_lead_id && e.event_name === 'Sold_Lead' && e.status === 'Sent');
      if (capiForLead.length > 0) map[camp].capiSoldEvents++;
    });
    Object.keys(map).forEach(camp => {
      const g = map[camp];
      if (g.sold > 0 && g.capiSoldEvents === 0) g.status = 'CAPI Missing';
      else g.status = 'OK';
    });
    return map;
  }, [gatewayLeads, capiEvents]);

  const attributionMissing = useMemo(() => {
    const adCampaigns = new Set(truthMetrics.map(t => t.campaign_name).filter(Boolean));
    return Object.keys(gatewayStatusMap).filter(c => !adCampaigns.has(c));
  }, [gatewayStatusMap, truthMetrics]);

  const trackingBroken = useMemo(() => {
    const gwCampaigns = new Set(gatewayLeads.map(l => l.utm_campaign).filter(Boolean));
    return truthMetrics.filter(t => t.campaign_name && !gwCampaigns.has(t.campaign_name) && (t.spend_tracked || 0) > 0).map(t => t.campaign_name);
  }, [truthMetrics, gatewayLeads]);

  const accounts = useMemo(() => [...new Set(truthMetrics.map(t => t.account_name).filter(Boolean))], [truthMetrics]);
  const campaigns = useMemo(() => [...new Set(truthMetrics.map(t => t.campaign_name).filter(Boolean))], [truthMetrics]);
  const suppliers = useMemo(() => [...new Set(truthMetrics.map(t => t.supplier_sid).filter(Boolean))], [truthMetrics]);
  const buyers = useMemo(() => [...new Set(truthMetrics.map(t => t.buyer_name).filter(Boolean))], [truthMetrics]);
  const states = useMemo(() => [...new Set(truthMetrics.map(t => t.accident_state).filter(Boolean))], [truthMetrics]);

  const filtered = useMemo(() => {
    return truthMetrics.filter(t => {
      if (filters.platform && t.platform !== filters.platform) return false;
      if (filters.account && t.account_name !== filters.account) return false;
      if (filters.campaign && t.campaign_name !== filters.campaign) return false;
      if (filters.supplier && t.supplier_sid !== filters.supplier) return false;
      if (filters.buyer && t.buyer_name !== filters.buyer) return false;
      if (filters.state && t.accident_state !== filters.state) return false;
      if (filters.decision && t.decision !== filters.decision) return false;
      if (filters.dataQuality && t.data_quality !== filters.dataQuality) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      return true;
    });
  }, [truthMetrics, filters]);

  // Aggregate by campaign+adset+ad
  const aggregated = useMemo(() => {
    const groups = {};
    filtered.forEach(t => {
      const key = `${t.campaign_name}|${t.adset_name || ''}|${t.ad_name || ''}|${t.platform || ''}`;
      if (!groups[key]) groups[key] = {
        platform: t.platform,
        account_name: t.account_name,
        campaign_name: t.campaign_name,
        adset_name: t.adset_name,
        ad_name: t.ad_name,
        buyer_name: t.buyer_name,
        supplier_sid: t.supplier_sid,
        accident_state: t.accident_state,
        spend_tracked: 0, spend_paid: 0,
        web_lead_count: 0, sold_leads: 0, dq_leads: 0, returned_leads: 0, fake_leads: 0,
        call_count: 0, converted_calls: 0,
        web_lead_revenue: 0, call_revenue: 0, total_booked_revenue: 0,
        buyer_collected_cash: 0, supplier_payout_accrued: 0, supplier_payout_paid: 0,
        has_calls: false, has_cash: false, has_buyer_feedback: false,
        row_count: 0,
      };
      const g = groups[key];
      g.spend_tracked += t.spend_tracked || 0;
      g.spend_paid += t.spend_paid || 0;
      g.web_lead_count += t.web_lead_count || 0;
      g.sold_leads += t.sold_leads || 0;
      g.dq_leads += t.dq_leads || 0;
      g.returned_leads += t.returned_leads || 0;
      g.fake_leads += t.fake_leads || 0;
      g.call_count += t.call_count || 0;
      g.converted_calls += t.converted_calls || 0;
      g.web_lead_revenue += t.web_lead_revenue || 0;
      g.call_revenue += t.call_revenue || 0;
      g.total_booked_revenue += t.total_booked_revenue || 0;
      g.buyer_collected_cash += t.buyer_collected_cash || 0;
      g.supplier_payout_accrued += t.supplier_payout_accrued || 0;
      g.supplier_payout_paid += t.supplier_payout_paid || 0;
      if (t.call_count > 0) g.has_calls = true;
      if (t.buyer_collected_cash > 0) g.has_cash = true;
      if (t.sold_leads > 0 || t.dq_leads > 0 || t.returned_leads > 0) g.has_buyer_feedback = true;
      g.row_count++;
    });

    return Object.values(groups).map(g => {
      const true_gross_margin = g.total_booked_revenue - g.spend_tracked - g.supplier_payout_accrued;
      const cash_margin = g.has_cash ? g.buyer_collected_cash - g.spend_paid - g.supplier_payout_paid : null;
      const booked_roas = g.spend_tracked > 0 ? g.total_booked_revenue / g.spend_tracked : 0;
      const cash_roas = g.has_cash && g.spend_paid > 0 ? g.buyer_collected_cash / g.spend_paid : null;
      const dq_rate = g.web_lead_count > 0 ? g.dq_leads / g.web_lead_count : 0;
      const return_rate = g.sold_leads > 0 ? g.returned_leads / (g.sold_leads + g.returned_leads) : 0;
      const buyer_conversion_rate = g.web_lead_count > 0 ? g.sold_leads / g.web_lead_count : 0;
      const quality_score = calcQualityScore(g, return_rate, buyer_conversion_rate);

      let data_quality = 'Complete';
      if (!g.has_calls && g.spend_tracked > 0) data_quality = 'Missing Calls';
      else if (!g.has_buyer_feedback) data_quality = 'Missing Buyer Feedback';
      else if (!g.has_cash) data_quality = 'Missing Cash';
      else if (g.spend_tracked === 0) data_quality = 'Missing Spend';

      const { decision, reason } = calcDecision(g, true_gross_margin, cash_margin, dq_rate, return_rate, data_quality, quality_score);

      return { ...g, true_gross_margin, cash_margin, booked_roas, cash_roas, dq_rate, return_rate, buyer_conversion_rate, quality_score, data_quality, decision, decision_reason: reason };
    }).sort((a, b) => b.spend_tracked - a.spend_tracked);
  }, [filtered]);

  // Top cards
  const cards = useMemo(() => {
    const tracked = aggregated.reduce((s, r) => s + r.spend_tracked, 0);
    const paid = aggregated.reduce((s, r) => s + r.spend_paid, 0);
    const gap = tracked - paid;
    const bookedRev = aggregated.reduce((s, r) => s + r.total_booked_revenue, 0);
    const collected = aggregated.reduce((s, r) => s + (r.buyer_collected_cash || 0), 0);
    const callRev = aggregated.reduce((s, r) => s + (r.has_calls ? r.call_revenue : 0), 0);
    const trueMargin = aggregated.reduce((s, r) => s + r.true_gross_margin, 0);
    const cashMargin = aggregated.filter(r => r.cash_margin !== null).reduce((s, r) => s + r.cash_margin, 0);
    const toCut = aggregated.filter(r => r.decision === 'CUT').length;
    const toScale = aggregated.filter(r => r.decision === 'SCALE').length;
    const missingData = aggregated.filter(r => r.data_quality !== 'Complete').length;
    return { tracked, paid, gap, bookedRev, collected, callRev, trueMargin, cashMargin, toCut, toScale, missingData };
  }, [aggregated]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Smart Ad Reporting</h1>
        <p className="text-xs text-muted-foreground mt-1">Ad performance joined to cash truth, calls, buyer feedback, and supplier payouts</p>
      </div>

      {adAlerts.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-yellow-300 font-medium">{adAlerts.length} active ad alert(s)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{adAlerts.slice(0, 2).map(a => a.message).join(' · ')}</p>
          </div>
        </div>
      )}

      {trackingBroken.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-red-300 font-medium">{trackingBroken.length} campaign(s) with ad spend but no gateway leads — Tracking Broken</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{trackingBroken.slice(0, 3).join(', ')}</p>
          </div>
        </div>
      )}

      {attributionMissing.length > 0 && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-orange-300 font-medium">{attributionMissing.length} gateway campaign(s) missing from ad metrics — Attribution Missing</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{attributionMissing.slice(0, 3).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card title="Tracked Spend" value={formatMoney(cards.tracked)} pill="BOOKED" />
        <Card title="Paid Spend" value={formatMoney(cards.paid)} pill="CASH" />
        <Card title="Spend Gap" value={formatMoney(cards.gap)} color={cards.gap > 2000 ? 'text-red-400' : 'text-muted-foreground'} />
        <Card title="Booked Revenue" value={formatMoney(cards.bookedRev)} pill="BOOKED" />
        <Card title="Collected Cash" value={formatMoney(cards.collected)} pill="CASH" />
        <Card title="Call Revenue" value={cards.callRev > 0 ? formatMoney(cards.callRev) : <span className="text-red-400/60">MISSING</span>} pill="BOOKED" />
        <Card title="True Gross Margin" value={formatMoney(cards.trueMargin)} color={moneyColor(cards.trueMargin)} />
        <Card title="Cash Margin" value={formatMoney(cards.cashMargin)} color={moneyColor(cards.cashMargin)} />
        <Card title="To Cut" value={cards.toCut} color="text-red-400" icon={Scissors} />
        <Card title="To Scale" value={cards.toScale} color="text-emerald-400" icon={Rocket} />
        <Card title="Missing Data" value={cards.missingData} color="text-yellow-400" />
        <Card title="Campaigns" value={aggregated.length} />
      </div>

      <AdFilterBar filters={filters} onChange={setFilters} accounts={accounts} campaigns={campaigns} suppliers={suppliers} buyers={buyers} states={states} />

      {/* Main Table */}
      <SectionPanel title="Campaign Truth Table" subtitle={`${aggregated.length} rows · click row for detail`} >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2 sticky left-0" style={{ background: '#14171C' }}>Platform</th>
                <th className="pb-2 pr-2">Campaign</th>
                <th className="pb-2 pr-2">Ad Set</th>
                <th className="pb-2 pr-2">Ad</th>
                <th className="pb-2 pr-2 text-right">Spend Trk</th>
                <th className="pb-2 pr-2 text-right">Spend Paid</th>
                <th className="pb-2 pr-2 text-right">Leads</th>
                <th className="pb-2 pr-2 text-right">Sold</th>
                <th className="pb-2 pr-2 text-right">DQ</th>
                <th className="pb-2 pr-2 text-right">Ret%</th>
                <th className="pb-2 pr-2 text-right">Web Rev</th>
                <th className="pb-2 pr-2 text-right">Call Rev</th>
                <th className="pb-2 pr-2 text-right">Booked Rev</th>
                <th className="pb-2 pr-2 text-right">Cash Coll</th>
                <th className="pb-2 pr-2 text-right">Supp Accr</th>
                <th className="pb-2 pr-2 text-right">Supp Paid</th>
                <th className="pb-2 pr-2 text-right">True Marg</th>
                <th className="pb-2 pr-2 text-right">Cash Marg</th>
                <th className="pb-2 pr-2 text-right">B ROAS</th>
                <th className="pb-2 pr-2 text-right">C ROAS</th>
                <th className="pb-2 pr-2 text-right">Qual</th>
                <th className="pb-2 pr-2">Data</th>
                <th className="pb-2 pr-2">Gateway</th>
                <th className="pb-2 pr-2">Decision</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5 cursor-pointer" onClick={() => setSelectedRow(r)}>
                  <td className="py-1.5 pr-2 text-muted-foreground text-[11px]">{r.platform}</td>
                  <td className="py-1.5 pr-2 font-medium max-w-36 truncate">{r.campaign_name}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-28 truncate">{r.adset_name || '—'}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-28 truncate">{r.ad_name || '—'}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-orange-400">{formatMoney(r.spend_tracked)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(r.spend_paid)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatNumber(r.web_lead_count)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-emerald-400">{formatNumber(r.sold_leads)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-red-400">{formatNumber(r.dq_leads)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatPercent(r.return_rate * 100)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(r.web_lead_revenue)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{r.has_calls ? formatMoney(r.call_revenue) : <span className="text-red-400/50">—</span>}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums font-medium">{formatMoney(r.total_booked_revenue)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{r.has_cash ? formatMoney(r.buyer_collected_cash) : <span className="text-red-400/50">?</span>}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-orange-400">{formatMoney(r.supplier_payout_accrued)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(r.supplier_payout_paid)}</td>
                  <td className={`py-1.5 pr-2 text-right tabular-nums font-bold ${moneyColor(r.true_gross_margin)}`}>{formatMoney(r.true_gross_margin)}</td>
                  <td className={`py-1.5 pr-2 text-right tabular-nums font-bold ${r.cash_margin !== null ? moneyColor(r.cash_margin) : 'text-muted-foreground/40'}`}>{r.cash_margin !== null ? formatMoney(r.cash_margin) : '?'}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{r.booked_roas > 0 ? `${r.booked_roas.toFixed(2)}x` : '—'}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{r.cash_roas !== null ? `${r.cash_roas.toFixed(2)}x` : '—'}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{r.quality_score > 0 ? r.quality_score.toFixed(1) : '—'}</td>
                  <td className="py-1.5 pr-2"><DataQualityBadge quality={r.data_quality} /></td>
                  <td className="py-1.5 pr-2"><GatewayStatusBadge status={gatewayStatusMap[r.campaign_name]?.status} broken={trackingBroken.includes(r.campaign_name)} /></td>
                  <td className="py-1.5 pr-2"><StatusBadge status={r.decision} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {selectedRow && <AdDetailDrawer row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
}

function Card({ title, value, pill, color, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border p-3" style={{ background: '#14171C' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{title}</span>
        {pill && <CashBookedPill type={pill} />}
        {Icon && !pill && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</div>
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

function GatewayStatusBadge({ status, broken }) {
  if (broken) {
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-red-500/10 text-red-400">⚠ Tracking Broken</span>;
  }
  if (status === 'CAPI Missing') {
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-orange-500/10 text-orange-400">⚠ CAPI Missing</span>;
  }
  if (status === 'OK') {
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-400">✓ OK</span>;
  }
  return <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-gray-500/10 text-gray-400">— No Gateway</span>;
}

function calcQualityScore(g, returnRate, buyerConvRate) {
  if (g.web_lead_count === 0) return 0;
  const soldRate = g.sold_leads / g.web_lead_count;
  const fakeRate = g.fake_leads / g.web_lead_count;
  let score = 5;
  score += soldRate * 3;
  score -= (g.dq_leads / g.web_lead_count) * 2;
  score -= fakeRate * 3;
  score -= returnRate * 2;
  score += buyerConvRate * 1;
  return Math.max(0, Math.min(10, score));
}

function calcDecision(g, trueMargin, cashMargin, dqRate, returnRate, dataQuality, qualityScore) {
  const hasSpend = g.spend_tracked > 100;
  const enoughSpend = g.spend_tracked > 2000;

  if (dataQuality === 'Missing Calls' || dataQuality === 'Missing Spend' || dataQuality === 'Incomplete') {
    return { decision: 'UNKNOWN', reason: 'Missing calls, spend, or lead mapping. Import data before deciding.' };
  }

  if (dataQuality === 'Missing Buyer Feedback' || dataQuality === 'Missing Cash' || !enoughSpend) {
    return { decision: 'WATCH', reason: trueMargin > 0
      ? 'Booked margin positive but buyer feedback or cash signal incomplete, or spend too low for confidence.'
      : 'Early data — not enough spend volume or feedback for a decision.' };
  }

  if (trueMargin < -500 && enoughSpend) {
    return { decision: 'CUT', reason: `Negative true margin of ${formatMoney(trueMargin)} after ${formatMoney(g.spend_tracked)} spend.` };
  }
  if (dqRate > 0.4 || returnRate > 0.25) {
    return { decision: 'CUT', reason: `Lead quality poor: DQ rate ${formatPercent(dqRate * 100)}, return rate ${formatPercent(returnRate * 100)}.` };
  }
  if (cashMargin !== null && cashMargin < -500) {
    return { decision: 'CUT', reason: `Cash margin negative at ${formatMoney(cashMargin)} despite booked profit.` };
  }

  if (trueMargin > 500 && qualityScore >= 5 && dqRate < 0.25 && returnRate < 0.15) {
    if (cashMargin !== null && cashMargin > 0) {
      return { decision: 'SCALE', reason: `Positive true margin ${formatMoney(trueMargin)} and cash margin ${formatMoney(cashMargin)} with acceptable quality.` };
    }
    return { decision: 'WATCH', reason: 'Positive booked margin but cash attribution unclear. Watch until cash confirmed.' };
  }

  return { decision: 'HOLD', reason: 'Mixed signals — hold spend and review buyer feedback.' };
}