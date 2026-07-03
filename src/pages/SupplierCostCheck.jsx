import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatMoney, moneyColor, formatNumber, formatPercent } from '@/lib/formatters';
import SectionPanel from '@/components/shared/SectionPanel';
import MetricCard from '@/components/shared/MetricCard';
import DataTable from '@/components/shared/DataTable';
import moment from 'moment';

export default function SupplierCostCheck() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [truthMetrics, gatewayLeads, apEntries, bankTxns] = await Promise.all([
        base44.entities.CampaignTruthMetric.list().catch(() => []),
        base44.entities.GatewayLead.list('-received_at', 500).catch(() => []),
        base44.entities.APEntry.list().catch(() => []),
        base44.entities.BankTransaction.list().catch(() => []),
      ]);

      const supplierPaidFromBank = {};
      bankTxns.filter(t => t.cash_type === 'Supplier Payout').forEach(t => {
        const s = t.counterparty || 'Unknown';
        supplierPaidFromBank[s] = (supplierPaidFromBank[s] || 0) + Math.abs(t.amount || 0);
      });

      // By day
      const byDay = {};
      gatewayLeads.forEach(l => {
        if (!l.received_at) return;
        const d = moment(l.received_at).format('YYYY-MM-DD');
        const s = l.supplier_sid || l.supplier_source || 'Unknown';
        if (!byDay[d]) byDay[d] = {};
        if (!byDay[d][s]) byDay[d][s] = { date: d, supplier: s, leads: 0, sold: 0, dq: 0, returned: 0, costAccrued: 0, costPaid: 0, revenue: 0 };
        byDay[d][s].leads++;
        if (l.lead_status === 'Sold') byDay[d][s].sold++;
        if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') byDay[d][s].dq++;
        if (l.lead_status === 'Returned') byDay[d][s].returned++;
        byDay[d][s].costAccrued += (l.supplier_payout || 0);
        byDay[d][s].revenue += (l.lead_revenue || 0);
      });
      const dayData = Object.values(byDay).flatMap(day => Object.values(day)).map(r => {
        const margin = r.revenue - r.costAccrued;
        const trueCPL = r.leads > 0 ? r.costAccrued / r.leads : 0;
        return { ...r, margin, trueCPL, status: margin > 0 ? 'Profitable' : margin < 0 ? 'Unprofitable' : 'Neutral' };
      }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      // By buyer
      const byBuyer = {};
      gatewayLeads.forEach(l => {
        const s = l.supplier_sid || l.supplier_source || 'Unknown';
        const b = l.buyer_name || 'Unknown';
        const key = `${s}|${b}`;
        if (!byBuyer[key]) byBuyer[key] = { supplier: s, buyer: b, leads: 0, sold: 0, dq: 0, returned: 0, costAccrued: 0, costPaid: 0, revenue: 0 };
        byBuyer[key].leads++;
        if (l.lead_status === 'Sold') byBuyer[key].sold++;
        if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') byBuyer[key].dq++;
        if (l.lead_status === 'Returned') byBuyer[key].returned++;
        byBuyer[key].costAccrued += (l.supplier_payout || 0);
        byBuyer[key].revenue += (l.lead_revenue || 0);
      });
      const buyerData = Object.values(byBuyer).map(r => {
        const margin = r.revenue - r.costAccrued;
        const trueCPL = r.leads > 0 ? r.costAccrued / r.leads : 0;
        return { ...r, margin, trueCPL, status: margin > 0 ? 'Profitable' : 'Unprofitable' };
      });

      // By lead status
      const byStatus = {};
      gatewayLeads.forEach(l => {
        const s = l.supplier_sid || l.supplier_source || 'Unknown';
        const st = l.lead_status || 'Unknown';
        const key = `${s}|${st}`;
        if (!byStatus[key]) byStatus[key] = { supplier: s, leadStatus: st, leads: 0, costAccrued: 0, costPaid: 0, revenue: 0 };
        byStatus[key].leads++;
        byStatus[key].costAccrued += (l.supplier_payout || 0);
        byStatus[key].revenue += (l.lead_revenue || 0);
      });
      const statusData = Object.values(byStatus).map(r => {
        const trueCPL = r.leads > 0 ? r.costAccrued / r.leads : 0;
        return { ...r, trueCPL };
      });

      // By state
      const byState = {};
      gatewayLeads.forEach(l => {
        const s = l.supplier_sid || l.supplier_source || 'Unknown';
        const st = l.accident_state || l.geo_state || 'Unknown';
        const key = `${s}|${st}`;
        if (!byState[key]) byState[key] = { supplier: s, state: st, leads: 0, sold: 0, dq: 0, returned: 0, costAccrued: 0, costPaid: 0, revenue: 0 };
        byState[key].leads++;
        if (l.lead_status === 'Sold') byState[key].sold++;
        if (l.lead_status === 'Disqualified' || l.lead_status === 'DQ') byState[key].dq++;
        if (l.lead_status === 'Returned') byState[key].returned++;
        byState[key].costAccrued += (l.supplier_payout || 0);
        byState[key].revenue += (l.lead_revenue || 0);
      });
      const stateData = Object.values(byState).map(r => {
        const margin = r.revenue - r.costAccrued;
        const trueCPL = r.leads > 0 ? r.costAccrued / r.leads : 0;
        return { ...r, margin, trueCPL, status: margin > 0 ? 'Profitable' : 'Unprofitable' };
      });

      const totalCost = gatewayLeads.reduce((s, l) => s + (l.supplier_payout || 0), 0);
      const totalLeads = gatewayLeads.length;
      const trueCPL = totalLeads > 0 ? totalCost / totalLeads : 0;

      setData({ dayData, buyerData, statusData, stateData, trueCPL, totalCost, totalLeads });
    } catch (err) {
      console.error('SupplierCostCheck error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" /></div>;
  const d = data || {};

  const moneyCol = (key) => ({ key, align: 'right', render: (v) => <span className={moneyColor(v)}>{formatMoney(v)}</span> });
  const numCol = (key) => ({ key, align: 'right', render: (v) => <span>{formatNumber(v)}</span> });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Supplier Cost Check</h1>
        <p className="text-sm text-muted-foreground mt-1">True supplier cost and CPL by day, buyer, lead status, and state.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard title="Total Supplier Cost" value={d.totalCost || 0} label="ACCRUED" />
        <MetricCard title="Total Leads" value={formatNumber(d.totalLeads || 0)} />
        <MetricCard title="True CPL" value={d.trueCPL || 0} />
        <MetricCard title="Cost per Sold" value={d.dayData?.filter(r => r.sold > 0).reduce((s, r) => s + r.costAccrued, 0) / (d.dayData?.reduce((s, r) => s + r.sold, 0) || 1) || 0} />
      </div>

      <SectionPanel title="Supplier by Day" subtitle="Cost, revenue, and margin by supplier per day">
        <DataTable
          exportFileName="supplier_cost_by_day"
          data={d.dayData || []}
          maxHeight="400px"
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'supplier', label: 'Supplier' },
            numCol('leads'),
            numCol('sold'),
            numCol('dq'),
            numCol('returned'),
            moneyCol('costAccrued'),
            moneyCol('revenue'),
            moneyCol('margin'),
            moneyCol('trueCPL'),
            { key: 'status', label: 'Status' },
          ]}
        />
      </SectionPanel>

      <SectionPanel title="Supplier by Buyer" subtitle="Cost and margin by supplier per buyer">
        <DataTable
          exportFileName="supplier_cost_by_buyer"
          data={d.buyerData || []}
          maxHeight="400px"
          columns={[
            { key: 'supplier', label: 'Supplier' },
            { key: 'buyer', label: 'Buyer' },
            numCol('leads'),
            numCol('sold'),
            numCol('dq'),
            numCol('returned'),
            moneyCol('costAccrued'),
            moneyCol('revenue'),
            moneyCol('margin'),
            moneyCol('trueCPL'),
            { key: 'status', label: 'Status' },
          ]}
        />
      </SectionPanel>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SectionPanel title="Supplier by Lead Status" subtitle="Cost breakdown by lead outcome">
          <DataTable
            exportFileName="supplier_cost_by_status"
            data={d.statusData || []}
            maxHeight="350px"
            columns={[
              { key: 'supplier', label: 'Supplier' },
              { key: 'leadStatus', label: 'Lead Status' },
              numCol('leads'),
              moneyCol('costAccrued'),
              moneyCol('revenue'),
              moneyCol('trueCPL'),
            ]}
          />
        </SectionPanel>
        <SectionPanel title="Supplier by State" subtitle="Cost and margin by supplier per state">
          <DataTable
            exportFileName="supplier_cost_by_state"
            data={d.stateData || []}
            maxHeight="350px"
            columns={[
              { key: 'supplier', label: 'Supplier' },
              { key: 'state', label: 'State' },
              numCol('leads'),
              numCol('sold'),
              numCol('dq'),
              moneyCol('costAccrued'),
              moneyCol('revenue'),
              moneyCol('margin'),
              moneyCol('trueCPL'),
              { key: 'status', label: 'Status' },
            ]}
          />
        </SectionPanel>
      </div>
    </div>
  );
}