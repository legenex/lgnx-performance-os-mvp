import React from 'react';
import { ChevronDown } from 'lucide-react';

const PLATFORMS = ['Meta', 'Google', 'YouTube', 'Taboola', 'Other'];
const DECISIONS = ['SCALE', 'WATCH', 'CUT', 'HOLD', 'UNKNOWN'];
const DATA_QUALITY = ['Complete', 'Missing Calls', 'Missing Spend', 'Missing Buyer Feedback', 'Missing Cash', 'Incomplete'];

function Select({ label, value, options, onChange, allLabel = 'All' }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="appearance-none bg-secondary text-xs rounded px-2 py-1.5 pr-7 border border-border focus:border-[#E4262C]/50 outline-none cursor-pointer min-w-[100px]"
        >
          <option value="">{allLabel}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

export default function AdFilterBar({ filters, onChange, accounts = [], campaigns = [], suppliers = [], buyers = [], states = [] }) {
  function update(key, val) {
    onChange({ ...filters, [key]: val });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border border-border" style={{ background: '#1c2128' }}>
      <Select label="From" value={filters.dateFrom || ''} options={[]} onChange={v => update('dateFrom', v)} allLabel="—" />
      <input
        type="date"
        value={filters.dateFrom || ''}
        onChange={e => update('dateFrom', e.target.value)}
        className="bg-secondary text-xs rounded px-2 py-1.5 border border-border focus:border-[#E4262C]/50 outline-none"
      />
      <span className="text-xs text-muted-foreground pb-1.5">to</span>
      <input
        type="date"
        value={filters.dateTo || ''}
        onChange={e => update('dateTo', e.target.value)}
        className="bg-secondary text-xs rounded px-2 py-1.5 border border-border focus:border-[#E4262C]/50 outline-none"
      />
      <Select label="Platform" value={filters.platform || ''} options={PLATFORMS} onChange={v => update('platform', v)} />
      <Select label="Account" value={filters.account || ''} options={accounts} onChange={v => update('account', v)} />
      <Select label="Campaign" value={filters.campaign || ''} options={campaigns} onChange={v => update('campaign', v)} />
      <Select label="Supplier" value={filters.supplier || ''} options={suppliers} onChange={v => update('supplier', v)} />
      <Select label="Buyer" value={filters.buyer || ''} options={buyers} onChange={v => update('buyer', v)} />
      <Select label="State" value={filters.state || ''} options={states} onChange={v => update('state', v)} />
      <Select label="Decision" value={filters.decision || ''} options={DECISIONS} onChange={v => update('decision', v)} />
      <Select label="Data Quality" value={filters.dataQuality || ''} options={DATA_QUALITY} onChange={v => update('dataQuality', v)} />
      <button
        onClick={() => onChange({})}
        className="text-[10px] text-muted-foreground hover:text-foreground pb-1.5"
      >
        Clear
      </button>
    </div>
  );
}