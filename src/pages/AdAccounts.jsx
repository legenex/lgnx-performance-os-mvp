import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { formatNumber } from '@/lib/formatters';

const PLATFORMS = ['Meta', 'Google', 'YouTube', 'Taboola'];

export default function AdAccounts() {
  const [activeTab, setActiveTab] = useState('Meta');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [adMetrics, adCampaigns, adAccounts] = await Promise.all([
        base44.entities.AdDailyMetric.list().catch(() => []),
        base44.entities.AdCampaign.list().catch(() => []),
        base44.entities.AdAccount.list().catch(() => []),
      ]);

      const byPlatform = {};
      PLATFORMS.forEach(p => {
        const metrics = adMetrics.filter(m => m.platform === p);
        const campaigns = adCampaigns.filter(c => c.platform === p);
        const accounts = adAccounts.filter(a => a.platform === p);
        byPlatform[p] = {
          accounts: accounts.map(a => ({
            name: a.account_name || a.name || '—',
            status: a.status || 'Unknown',
            lastSync: a.last_synced_at || a.updated_date,
            campaignCount: campaigns.filter(c => c.account_name === a.account_name).length,
          })),
          campaigns: campaigns.map(c => ({
            name: c.campaign_name,
            status: c.campaign_status || 'Unknown',
            naming: c.naming_quality || 'Unknown',
            mappedVertical: c.mapped_vertical || '—',
            mappedState: c.mapped_state || '—',
            mappedBuyer: c.mapped_buyer || '—',
            mappedSupplier: c.mapped_supplier_sid || '—',
            lastSync: c.last_synced_at || c.updated_date,
          })),
          totalSpend: metrics.reduce((s, m) => s + (m.spend || 0), 0),
          totalLeads: metrics.reduce((s, m) => s + (m.leads || 0), 0),
          totalImpressions: metrics.reduce((s, m) => s + (m.impressions || 0), 0),
          totalClicks: metrics.reduce((s, m) => s + (m.clicks || 0), 0),
          recordCount: metrics.length,
        };
      });

      setData(byPlatform);
    } catch (err) {
      console.error('AdAccounts error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  const current = data[activeTab] || { accounts: [], campaigns: [], totalSpend: 0, totalLeads: 0, totalImpressions: 0, totalClicks: 0, recordCount: 0 };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Ad Accounts</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform account mapping, import status, and campaign naming.</p>
      </div>

      <div className="flex items-center gap-1 p-1 bg-muted rounded-[10px] w-fit">
        {PLATFORMS.map(p => (
          <button
            key={p}
            onClick={() => setActiveTab(p)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${activeTab === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-card border border-border rounded-[10px] p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Spend</span>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">${(current.totalSpend || 0).toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Total Leads</span>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">{formatNumber(current.totalLeads)}</p>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Impressions</span>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">{formatNumber(current.totalImpressions)}</p>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Clicks</span>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">{formatNumber(current.totalClicks)}</p>
        </div>
        <div className="bg-card border border-border rounded-[10px] p-4">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Records</span>
          <p className="text-xl font-bold tabular-nums text-foreground mt-1">{formatNumber(current.recordCount)}</p>
        </div>
      </div>

      <SectionPanel title={`${activeTab} Accounts`} subtitle="Account mapping and import status">
        {current.accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Account Name</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Campaigns</th>
                  <th className="pb-2 pr-3">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {current.accounts.map((a, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium">{a.name}</td>
                    <td className="py-2 pr-3"><StatusBadge status={a.status} /></td>
                    <td className="py-2 pr-3 tabular-nums">{a.campaignCount}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{a.lastSync ? new Date(a.lastSync).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No {activeTab} accounts configured. Import ad data to populate.</p>
        )}
      </SectionPanel>

      <SectionPanel title={`${activeTab} Campaign Mapping`} subtitle="Campaign naming quality and field mapping">
        {current.campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-3">Campaign Name</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">Naming</th>
                  <th className="pb-2 pr-3">Vertical</th>
                  <th className="pb-2 pr-3">State</th>
                  <th className="pb-2 pr-3">Buyer</th>
                  <th className="pb-2 pr-3">Supplier</th>
                  <th className="pb-2 pr-3">Last Sync</th>
                </tr>
              </thead>
              <tbody>
                {current.campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 font-medium max-w-48 truncate">{c.name}</td>
                    <td className="py-2 pr-3"><StatusBadge status={c.status} /></td>
                    <td className="py-2 pr-3"><StatusBadge status={c.naming} /></td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.mappedVertical}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.mappedState}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.mappedBuyer}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.mappedSupplier}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{c.lastSync ? new Date(c.lastSync).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No {activeTab} campaigns found.</p>
        )}
      </SectionPanel>
    </div>
  );
}