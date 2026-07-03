import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import { TrendingUp, TrendingDown, AlertTriangle, Megaphone, Palette, Scissors, DollarSign, Phone, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdIntelligenceCommand() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, creativeInsights, adAlerts] = await Promise.all([
        base44.entities.CampaignTruthMetric.list('-date', 200).catch(() => []),
        base44.entities.CreativeInsight.list('-date', 100).catch(() => []),
        base44.entities.AdAlert.filter({ status: 'Open' }).catch(() => []),
      ]);
      setCampaigns(truthMetrics || []);
      setCreatives(creativeInsights || []);
      setAlerts(adAlerts || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const totalSpendTracked = campaigns.reduce((s, c) => s + (c.spend_tracked || 0), 0);
  const totalSpendPaid = campaigns.reduce((s, c) => s + (c.spend_paid || 0), 0);
  const toScale = campaigns.filter(c => c.decision === 'SCALE');
  const toCut = campaigns.filter(c => c.decision === 'CUT');
  const creativeWinners = creatives.filter(c => c.verdict === 'Winner');
  const creativeFatigue = creatives.filter(c => c.verdict === 'Fatiguing' || c.verdict === 'Kill');
  const missingCallRevAlerts = alerts.filter(a => a.alert_type === 'Missing Calls');
  const negCashMarginAlerts = alerts.filter(a => a.alert_type === 'Cash Gap');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Ad Intelligence Command</h1>
        <p className="text-xs text-muted-foreground mt-1">Spend reconciliation, scale/cut decisions, creative health, and alerts</p>
      </div>

      {/* Spend Tracked vs Paid */}
      <SectionPanel title="Spend Tracked vs Paid" subtitle="Platform-reported spend vs actually paid">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <p className="text-[10px] uppercase text-muted-foreground">Spend Tracked</p>
            <p className="text-base font-bold tabular-nums text-warning">{formatMoney(totalSpendTracked, { compact: true })}</p>
            <p className="text-[9px] text-warning">ACCRUED</p>
          </div>
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <p className="text-[10px] uppercase text-muted-foreground">Spend Paid</p>
            <p className="text-base font-bold tabular-nums text-success">{formatMoney(totalSpendPaid, { compact: true })}</p>
            <p className="text-[9px] text-success">CASH</p>
          </div>
          <div className="rounded-xl border border-border p-3" style={{ background: 'hsl(214, 18%, 23%)' }}>
            <p className="text-[10px] uppercase text-muted-foreground">Variance</p>
            <p className={`text-base font-bold tabular-nums ${moneyColor(totalSpendTracked - totalSpendPaid)}`}>{formatMoney(totalSpendTracked - totalSpendPaid, { compact: true })}</p>
            <p className="text-[9px] text-muted-foreground">UNKNOWN</p>
          </div>
        </div>
      </SectionPanel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Campaigns to Scale */}
        <SectionPanel title={`Campaigns to Scale (${toScale.length})`} actions={<Link to="/cut-watch-scale" className="text-[11px] text-primary hover:underline">View Queue →</Link>}>
          {toScale.length === 0 ? <p className="text-xs text-muted-foreground">No campaigns ready to scale.</p> : (
            <div className="space-y-1.5">
              {toScale.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-success" />
                    <span className="font-medium truncate max-w-32">{c.campaign_name}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-muted-foreground">ROAS {c.booked_roas?.toFixed(1)}x</span>
                    <span className="text-success">{formatMoney(c.true_gross_margin, { compact: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        {/* Campaigns to Cut */}
        <SectionPanel title={`Campaigns to Cut (${toCut.length})`} actions={<Link to="/cut-watch-scale" className="text-[11px] text-primary hover:underline">View Queue →</Link>}>
          {toCut.length === 0 ? <p className="text-xs text-muted-foreground">No campaigns flagged for cutting.</p> : (
            <div className="space-y-1.5">
              {toCut.slice(0, 8).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3 h-3 text-critical" />
                    <span className="font-medium truncate max-w-32">{c.campaign_name}</span>
                  </div>
                  <div className="flex items-center gap-3 tabular-nums">
                    <span className="text-muted-foreground">ROAS {c.booked_roas?.toFixed(1)}x</span>
                    <span className="text-critical">{formatMoney(c.true_gross_margin, { compact: true })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Creative Winners */}
        <SectionPanel title={`Creative Winners (${creativeWinners.length})`} actions={<Link to="/creative-intelligence" className="text-[11px] text-primary hover:underline">View All →</Link>}>
          {creativeWinners.length === 0 ? <p className="text-xs text-muted-foreground">No winning creatives identified yet.</p> : (
            <div className="space-y-1.5">
              {creativeWinners.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <span className="font-medium truncate max-w-40">{c.creative_name || c.ad_name}</span>
                  <span className="text-success tabular-nums">{formatMoney(c.revenue, { compact: true })}</span>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        {/* Creative Fatigue */}
        <SectionPanel title={`Creative Fatigue (${creativeFatigue.length})`} actions={<Link to="/creative-intelligence" className="text-[11px] text-primary hover:underline">View All →</Link>}>
          {creativeFatigue.length === 0 ? <p className="text-xs text-muted-foreground">No fatiguing creatives detected.</p> : (
            <div className="space-y-1.5">
              {creativeFatigue.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <span className="font-medium truncate max-w-40">{c.creative_name || c.ad_name}</span>
                  <StatusBadge status={c.verdict} />
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionPanel title={`Missing Call Revenue Alerts (${missingCallRevAlerts.length})`}>
          {missingCallRevAlerts.length === 0 ? <p className="text-xs text-muted-foreground">No missing call revenue alerts.</p> : (
            <div className="space-y-1.5">
              {missingCallRevAlerts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0 mt-0.5" />
                  <div><p className="font-medium">{a.campaign_name}</p><p className="text-muted-foreground text-[10px]">{a.message}</p></div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel title={`Booked Positive / Cash Negative Margin (${negCashMarginAlerts.length})`}>
          {negCashMarginAlerts.length === 0 ? <p className="text-xs text-muted-foreground">No cash gap alerts.</p> : (
            <div className="space-y-1.5">
              {negCashMarginAlerts.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded-lg" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <AlertTriangle className="w-3 h-3 text-critical flex-shrink-0 mt-0.5" />
                  <div><p className="font-medium">{a.campaign_name}</p><p className="text-muted-foreground text-[10px]">{a.message}</p></div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>

      {/* Quick Actions */}
      <SectionPanel title="Quick Actions">
        <div className="flex flex-wrap gap-2">
          <Link to="/smart-ad-reporting" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><Megaphone className="w-3 h-3" /> Smart Ad Reporting</Link>
          <Link to="/creative-intelligence" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><Palette className="w-3 h-3" /> Creative Intelligence</Link>
          <Link to="/cut-watch-scale" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><Scissors className="w-3 h-3" /> Cut / Watch / Scale</Link>
          <Link to="/platform-spend-recon" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-accent transition-colors"><DollarSign className="w-3 h-3" /> Spend Recon</Link>
        </div>
      </SectionPanel>
    </div>
  );
}