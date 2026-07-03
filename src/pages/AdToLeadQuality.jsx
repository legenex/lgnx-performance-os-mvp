import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, formatPercent, formatNumber } from '@/lib/formatters';
import { Phone, ShieldCheck } from 'lucide-react';

export default function AdToLeadQuality() {
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [lds, cls] = await Promise.all([
        base44.entities.Lead.list(undefined, 500),
        base44.entities.Call.list(undefined, 500),
      ]);
      setLeads(lds);
      setCalls(cls);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const qualityData = useMemo(() => {
    // Group by campaign + state + supplier + buyer
    const groups = {};
    leads.forEach(l => {
      const camp = l.utm_campaign || 'Unknown';
      const state = l.accident_state || 'Unknown';
      const supplier = l.supplier_source || l.supplier_sid || 'Unknown';
      const buyer = l.buyer_name || 'Unknown';
      const key = `${camp}|${state}|${supplier}|${buyer}`;
      if (!groups[key]) groups[key] = {
        campaign: camp, state, supplier, buyer,
        platform: detectPlatformFromCampaign(camp),
        leads: 0, sold: 0, dq: 0, fake: 0, returned: 0,
        revenue: 0, supplier_payout: 0, profit: 0,
        phone_verified: 0, treatment_quality: [],
        call_count: 0, call_revenue: 0,
      };
      const g = groups[key];
      g.leads++;
      if (l.lead_status === 'Sold') g.sold++;
      if (l.lead_status === 'Disqualified') g.dq++;
      if (l.lead_status === 'Fake') g.fake++;
      if (l.lead_status === 'Returned') g.returned++;
      g.revenue += l.lead_revenue || 0;
      g.supplier_payout += l.supplier_payout || 0;
      g.profit += l.profit || 0;
      if (l.trustedform_present) g.phone_verified++;
      if (l.treatment) g.treatment_quality.push(l.treatment);
    });

    // Add call data
    calls.forEach(c => {
      const camp = c.campaign || c.utm_campaign || 'Unknown';
      // Match to any group with same campaign
      Object.values(groups).forEach(g => {
        if (g.campaign === camp) {
          g.call_count++;
          g.call_revenue += c.revenue || 0;
        }
      });
    });

    return Object.values(groups).map(g => {
      const soldRate = g.leads > 0 ? g.sold / g.leads : 0;
      const dqRate = g.leads > 0 ? g.dq / g.leads : 0;
      const fakeRate = g.leads > 0 ? g.fake / g.leads : 0;
      const returnRate = (g.sold + g.returned) > 0 ? g.returned / (g.sold + g.returned) : 0;
      const phoneVerifiedRate = g.leads > 0 ? g.phone_verified / g.leads : 0;
      const buyerConvRate = g.leads > 0 ? g.sold / g.leads : 0;
      const revPerLead = g.leads > 0 ? g.revenue / g.leads : 0;
      const marginPerLead = g.leads > 0 ? g.profit / g.leads : 0;

      const qualityScore = calcQualityScore({
        soldRate, dqRate, fakeRate, returnRate, buyerConvRate, phoneVerifiedRate, revPerLead, marginPerLead, callCount: g.call_count
      });

      return { ...g, soldRate, dqRate, fakeRate, returnRate, phoneVerifiedRate, buyerConvRate, revPerLead, marginPerLead, qualityScore };
    }).sort((a, b) => b.qualityScore - a.qualityScore);
  }, [leads, calls]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Ad-to-Lead Quality</h1>
        <p className="text-xs text-muted-foreground mt-1">Ad source joined to lead quality and buyer outcomes</p>
      </div>

      <SectionPanel title="Lead Quality by Campaign / State / Supplier / Buyer" subtitle={`${qualityData.length} segments`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-2">Platform</th>
                <th className="pb-2 pr-2">Campaign</th>
                <th className="pb-2 pr-2">State</th>
                <th className="pb-2 pr-2">Supplier</th>
                <th className="pb-2 pr-2">Buyer</th>
                <th className="pb-2 pr-2 text-right">Leads</th>
                <th className="pb-2 pr-2 text-right">Sold</th>
                <th className="pb-2 pr-2 text-right">DQ</th>
                <th className="pb-2 pr-2 text-right">Fake</th>
                <th className="pb-2 pr-2 text-right">Ret</th>
                <th className="pb-2 pr-2 text-right">Phone ✓</th>
                <th className="pb-2 pr-2 text-right">Buyer Conv</th>
                <th className="pb-2 pr-2 text-right">Ret Rate</th>
                <th className="pb-2 pr-2 text-right">Rev/Lead</th>
                <th className="pb-2 pr-2 text-right">Margin/Lead</th>
                <th className="pb-2 pr-2 text-right">Calls</th>
                <th className="pb-2 pr-2 text-right">Quality</th>
              </tr>
            </thead>
            <tbody>
              {qualityData.map((r, i) => (
                <tr key={i} className="border-b border-border/30 hover:bg-white/5">
                  <td className="py-1.5 pr-2 text-muted-foreground">{r.platform}</td>
                  <td className="py-1.5 pr-2 font-medium max-w-36 truncate">{r.campaign}</td>
                  <td className="py-1.5 pr-2 tabular-nums">{r.state}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-24 truncate">{r.supplier}</td>
                  <td className="py-1.5 pr-2 text-muted-foreground max-w-24 truncate">{r.buyer}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatNumber(r.leads)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-emerald-400">{formatNumber(r.sold)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-red-400">{formatNumber(r.dq)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-red-400">{formatNumber(r.fake)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-orange-400">{formatNumber(r.returned)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {r.leads > 0 ? (
                      <span className={r.phoneVerifiedRate > 0.7 ? 'text-emerald-400' : 'text-yellow-400'}>
                        {formatPercent(r.phoneVerifiedRate * 100)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatPercent(r.buyerConvRate * 100)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums text-orange-400">{formatPercent(r.returnRate * 100)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(r.revPerLead)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatMoney(r.marginPerLead)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{r.call_count > 0 ? formatNumber(r.call_count) : <span className="text-red-400/50">—</span>}</td>
                  <td className="py-1.5 pr-2 text-right">
                    <QualityScoreBadge score={r.qualityScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Quality Score Formula */}
      <SectionPanel title="Quality Score Formula" subtitle="How scores are calculated">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
          <p>• <strong className="text-foreground">Sold rate</strong> (positive weight): higher = better</p>
          <p>• <strong className="text-foreground">DQ rate</strong> (negative): penalizes disqualified leads</p>
          <p>• <strong className="text-foreground">Fake rate</strong> (negative, heavy): fake leads hurt most</p>
          <p>• <strong className="text-foreground">Return rate</strong> (negative): returned leads signal quality issues</p>
          <p>• <strong className="text-foreground">Buyer conversion rate</strong> (positive): buyers accepting leads</p>
          <p>• <strong className="text-foreground">Phone verified rate</strong> (positive): TrustedForm present</p>
          <p>• <strong className="text-foreground">Revenue per lead</strong> (positive): profitability signal</p>
          <p>• <strong className="text-foreground">Margin per lead</strong> (positive): net profitability</p>
        </div>
      </SectionPanel>
    </div>
  );
}

function QualityScoreBadge({ score }) {
  const color = score >= 7 ? 'bg-emerald-500/20 text-emerald-400' : score >= 4 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded font-bold tabular-nums ${color}`}>
      {score.toFixed(1)}
    </span>
  );
}

function detectPlatformFromCampaign(camp) {
  const c = (camp || '').toLowerCase();
  if (c.includes('google')) return 'Google';
  if (c.includes('youtube')) return 'YouTube';
  if (c.includes('taboola')) return 'Taboola';
  if (c.includes('meta') || c.includes('cac') || c.includes('leadflow')) return 'Meta';
  return 'Unknown';
}

function calcQualityScore({ soldRate, dqRate, fakeRate, returnRate, buyerConvRate, phoneVerifiedRate, revPerLead, marginPerLead, callCount }) {
  let score = 5;
  score += soldRate * 2;
  score += buyerConvRate * 1;
  score -= dqRate * 1.5;
  score -= fakeRate * 3;
  score -= returnRate * 2;
  score += phoneVerifiedRate * 0.5;
  if (revPerLead > 150) score += 0.5;
  if (marginPerLead > 50) score += 0.5;
  if (callCount > 0) score += 0.3;
  return Math.max(0, Math.min(10, score));
}