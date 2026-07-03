import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import { formatMoney } from '@/lib/formatters';

export default function General() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, bankTxns, leads, calls, adMetrics] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.GatewayLead.list().catch(() => []),
        base44.entities.Call.list().catch(() => []),
        base44.entities.AdDailyMetric.list().catch(() => []),
      ]);
      setStats({
        truthMetrics: truthMetrics.length,
        bankTxns: bankTxns.length,
        leads: leads.length,
        calls: calls.length,
        adMetrics: adMetrics.length,
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">General</h1>
        <p className="text-sm text-muted-foreground mt-1">App settings and business assumptions.</p>
      </div>

      <SectionPanel title="Business Assumptions" subtitle="Core calculations and terminology used across the dashboard">
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div>
              <span className="text-foreground font-medium">Booked Revenue</span> — performance-reported revenue from LeadByte/masterview/Lead records.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div>
              <span className="text-foreground font-medium">Verified Income</span> — actual cash received in bank/Xero/Stripe.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div>
              <span className="text-foreground font-medium">Revenue Gap</span> = Reported Revenue − Verified Income.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div>
              <span className="text-foreground font-medium">Cash-Verified Profit</span> = Verified Income − Verified Paid Media − Verified Supplier Costs − Known Opex.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div>
              <span className="text-foreground font-medium">True CPL</span> = Total Verified/Accrued Cost ÷ Relevant Lead Count (labeled as accrued or paid).
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">•</span>
            <div>
              <span className="text-foreground font-medium">Missing Data</span> — shows UNKNOWN or NEEDS SOURCE, never zero.
            </div>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Data Volume" subtitle="Current record counts by entity">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Truth Metrics', value: stats?.truthMetrics || 0 },
            { label: 'Bank Transactions', value: stats?.bankTxns || 0 },
            { label: 'Gateway Leads', value: stats?.leads || 0 },
            { label: 'Calls', value: stats?.calls || 0 },
            { label: 'Ad Daily Metrics', value: stats?.adMetrics || 0 },
          ].map(item => (
            <div key={item.label} className="bg-accent/30 rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{item.label}</p>
              <p className="text-xl font-bold tabular-nums text-foreground mt-1">{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="About" subtitle="Legenex PerformanceOS">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Version 3.0.0 — Performance dashboard for lead generation business.</p>
          <p>Not an accounting system. Not a lead gateway. A smarter Data Studio for true performance truth.</p>
        </div>
      </SectionPanel>
    </div>
  );
}