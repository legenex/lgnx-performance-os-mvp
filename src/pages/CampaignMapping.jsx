import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Link2, Plus, Edit, Trash2 } from 'lucide-react';

export default function CampaignMapping() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [namingRules, setNamingRules] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [adCampaigns, rules] = await Promise.all([
        base44.entities.AdCampaign.list().catch(() => []),
        base44.entities.NamingRule.list().catch(() => []),
      ]);
      setCampaigns(adCampaigns || []);
      setNamingRules(rules || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Campaign Mapping</h1>
        <p className="text-xs text-muted-foreground mt-1">Campaign naming rules and field extraction mappings</p>
      </div>

      <SectionPanel title={`Naming Rules (${namingRules.length})`} actions={<button className="flex items-center gap-1 text-[11px] text-primary hover:underline"><Plus className="w-3 h-3" /> Add Rule</button>}>
        {namingRules.length === 0 ? (
          <p className="text-xs text-muted-foreground">No naming rules configured. Add rules to auto-extract vertical, state, supplier, and buyer from campaign names.</p>
        ) : (
          <table className="w-full text-xs">
            <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="pb-2">Rule Name</th><th className="pb-2">Pattern</th><th className="pb-2">Platform</th><th className="pb-2">Extracts</th><th className="pb-2">Status</th><th className="pb-2">Actions</th></tr></thead>
            <tbody>
              {namingRules.map(r => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="py-2 font-medium">{r.rule_name}</td>
                  <td className="py-2 text-muted-foreground font-mono text-[10px]">{r.pattern}</td>
                  <td className="py-2">{r.platform || 'All'}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.extracts_vertical && <span className="text-[9px] px-1 py-0.5 rounded bg-info/10 text-info">Vertical</span>}
                      {r.extracts_state && <span className="text-[9px] px-1 py-0.5 rounded bg-info/10 text-info">State</span>}
                      {r.extracts_supplier && <span className="text-[9px] px-1 py-0.5 rounded bg-info/10 text-info">Supplier</span>}
                      {r.extracts_buyer && <span className="text-[9px] px-1 py-0.5 rounded bg-info/10 text-info">Buyer</span>}
                      {r.extracts_offer && <span className="text-[9px] px-1 py-0.5 rounded bg-info/10 text-info">Offer</span>}
                    </div>
                  </td>
                  <td className="py-2"><StatusBadge status={r.active ? 'Active' : 'Paused'} /></td>
                  <td className="py-2"><div className="flex gap-1"><button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"><Edit className="w-3 h-3" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionPanel>

      <SectionPanel title={`Mapped Campaigns (${campaigns.length})`}>
        {campaigns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No campaigns imported. Import ad campaign data from the Data Imports page.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-left text-muted-foreground border-b border-border"><th className="pb-2">Platform</th><th className="pb-2">Campaign</th><th className="pb-2">Status</th><th className="pb-2">Vertical</th><th className="pb-2">Supplier SID</th><th className="pb-2">State</th><th className="pb-2">Buyer</th><th className="pb-2">Naming Quality</th></tr></thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b border-border/30">
                    <td className="py-2">{c.platform}</td>
                    <td className="py-2 font-medium">{c.campaign_name}</td>
                    <td className="py-2"><StatusBadge status={c.campaign_status} /></td>
                    <td className="py-2">{c.mapped_vertical || 'UNKNOWN'}</td>
                    <td className="py-2">{c.mapped_supplier_sid || 'UNKNOWN'}</td>
                    <td className="py-2">{c.mapped_state || 'UNKNOWN'}</td>
                    <td className="py-2">{c.mapped_buyer || 'UNKNOWN'}</td>
                    <td className="py-2"><StatusBadge status={c.naming_quality} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionPanel>
    </div>
  );
}