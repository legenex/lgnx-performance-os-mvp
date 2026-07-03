import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function MediaSpendCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, bankTxns, adDailyMetrics] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
        base44.entities.AdDailyMetric.list().catch(() => []),
      ]);

      const mediaPaidFromBank = bankTxns.filter(t => t.cash_type === 'Media Spend').reduce((s, t) => s + Math.abs(t.amount || 0), 0);
      const mediaTrackedFromTruth = truthMetrics.reduce((s, m) => s + (m.spend_tracked || 0), 0);
      const mediaTrackedFromAdDaily = adDailyMetrics.reduce((s, m) => s + (m.spend || 0), 0);
      const mediaTracked = mediaTrackedFromTruth || mediaTrackedFromAdDaily;
      const mediaGap = mediaTracked - mediaPaidFromBank;

      // By platform
      const byPlatform = {};
      adDailyMetrics.forEach(m => {
        const p = m.platform || 'Unknown';
        if (!byPlatform[p]) byPlatform[p] = { platform: p, tracked: 0, paid: 0, leads: 0, impressions: 0, clicks: 0 };
        byPlatform[p].tracked += (m.spend || 0);
        byPlatform[p].leads += (m.leads || 0);
        byPlatform[p].impressions += (m.impressions || 0);
        byPlatform[p].clicks += (m.clicks || 0);
      });
      bankTxns.filter(t => t.cash_type === 'Media Spend').forEach(t => {
        const desc = (t.description || '').toLowerCase();
        let p = 'Unknown';
        if (desc.includes('meta') || desc.includes('facebook')) p = 'Meta';
        else if (desc.includes('google')) p = 'Google';
        else if (desc.includes('youtube')) p = 'YouTube';
        else if (desc.includes('taboola')) p = 'Taboola';
        if (!byPlatform[p]) byPlatform[p] = { platform: p, tracked: 0, paid: 0, leads: 0, impressions: 0, clicks: 0 };
        byPlatform[p].paid += Math.abs(t.amount || 0);
      });
      const platformData = Object.values(byPlatform).map(r => {
        const gap = r.tracked - r.paid;
        const gapPct = r.tracked > 0 ? (gap / r.tracked) * 100 : 0;
        return { ...r, gap, gapPct, status: Math.abs(gap) < 100 ? 'OK' : 'Gap' };
      });

      // By account
      const byAccount = {};
      adDailyMetrics.forEach(m => {
        const a = m.account_name || m.platform || 'Unknown';
        if (!byAccount[a]) byAccount[a] = { account: a, platform: m.platform || '—', tracked: 0, leads: 0, impressions: 0, clicks: 0 };
        byAccount[a].tracked += (m.spend || 0);
        byAccount[a].leads += (m.leads || 0);
        byAccount[a].impressions += (m.impressions || 0);
        byAccount[a].clicks += (m.clicks || 0);
      });
      const accountData = Object.values(byAccount);

      // By campaign
      const byCampaign = {};
      adDailyMetrics.forEach(m => {
        const c = m.campaign_name || m.adset_name || 'Unknown';
        if (!byCampaign[c]) byCampaign[c] = { campaign: c, platform: m.platform || '—', tracked: 0, leads: 0, clicks: 0 };
        byCampaign[c].tracked += (m.spend || 0);
        byCampaign[c].leads += (m.leads || 0);
        byCampaign[c].clicks += (m.clicks || 0);
      });
      const campaignData = Object.values(byCampaign).map(r => ({
        ...r,
        cpl: r.leads > 0 ? r.tracked / r.leads : 0,
        ctr: r.impressions > 0 ? (r.clicks / r.impressions) * 100 : 0,
      })).sort((a, b) => b.tracked - a.tracked);

      // By month
      const byMonth = {};
      adDailyMetrics.forEach(m => {
        if (!m.date) return;
        const mo = moment(m.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, tracked: 0, paid: 0 };
        byMonth[mo].tracked += (m.spend || 0);
      });
      bankTxns.filter(t => t.cash_type === 'Media Spend').forEach(t => {
        if (!t.date) return;
        const mo = moment(t.date).format('YYYY-MM');
        if (!byMonth[mo]) byMonth[mo] = { month: mo, tracked: 0, paid: 0 };
        byMonth[mo].paid += Math.abs(t.amount || 0);
      });
      const monthData = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)).map(r => ({
        ...r,
        gap: r.tracked - r.paid,
        gapPct: r.tracked > 0 ? ((r.tracked - r.paid) / r.tracked) * 100 : 0,
        status: Math.abs(r.tracked - r.paid) < 100 ? 'OK' : 'Gap',
      }));

      setData({ mediaTracked, mediaPaid: mediaPaidFromBank, mediaGap, platformData, accountData, campaignData, monthData });
    } catch (err) {
      console.error('MediaSpendCheck error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const pctCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatPercent(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Media Spend Check</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform-reported spend vs actual paid spend from bank/Xero/Stripe/LeadFlow.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Spend Tracked" value={d.mediaTracked || 0} label="BOOKED" />
        <MetricCard title="Spend Paid" value={d.mediaPaid || 0} label="CASH" />
        <MetricCard title="Spend Gap" value={d.mediaGap || 0} sublabel="Tracked - Paid" />
        <MetricCard title="Gap %" value={d.mediaTracked > 0 ? `${formatPercent((d.mediaGap / d.mediaTracked) * 100)}` : '—'} />
      </div>

      <SectionPanel title="By Platform" subtitle="Tracked vs paid spend by platform">
        <DataTable
          exportFileName="media_spend_by_platform"
          data={d.platformData || []}
          columns={[
            { key: 'platform', label: 'Platform' },
            moneyCol('tracked'),
            moneyCol('paid'),
            moneyCol('gap'),
            pctCol('gapPct'),
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'impressions', label: 'Impressions', align: 'right' },
            { key: 'clicks', label: 'Clicks', align: 'right' },
            { key: 'status', label: 'Status' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="By Account" subtitle="Spend by ad account">
          <DataTable
            exportFileName="media_spend_by_account"
            data={d.accountData || []}
            maxHeight="350px"
            columns={[
              { key: 'account', label: 'Account' },
              { key: 'platform', label: 'Platform' },
              moneyCol('tracked'),
              { key: 'leads', label: 'Leads', align: 'right' },
            ]}
          />
        </SectionPanel>
        <SectionPanel title="By Month" subtitle="Tracked vs paid spend by month">
          <DataTable
            exportFileName="media_spend_by_month"
            data={d.monthData || []}
            maxHeight="350px"
            columns={[
              { key: 'month', label: 'Month' },
              moneyCol('tracked'),
              moneyCol('paid'),
              moneyCol('gap'),
              pctCol('gapPct'),
              { key: 'status', label: 'Status' },
            ]}
          />
        </SectionPanel>
      </div>

      <SectionPanel title="By Campaign" subtitle="Spend and CPL by campaign">
        <DataTable
          exportFileName="media_spend_by_campaign"
          data={d.campaignData || []}
          maxHeight="400px"
          columns={[
            { key: 'campaign', label: 'Campaign' },
            { key: 'platform', label: 'Platform' },
            moneyCol('tracked'),
            { key: 'leads', label: 'Leads', align: 'right' },
            { key: 'clicks', label: 'Clicks', align: 'right' },
            moneyCol('cpl'),
            pctCol('ctr'),
          ]}
        />
      </SectionPanel>
    </div>
  );
}