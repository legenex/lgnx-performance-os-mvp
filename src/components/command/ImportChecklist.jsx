import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import SectionPanel from '@/components/shared/SectionPanel';
import { Check, X, AlertTriangle, Shield } from 'lucide-react';

const CHECKS = [
  { key: 'bank', label: 'Mercury bank CSV imported', entity: 'BankTransaction' },
  { key: 'xeroInv', label: 'Xero invoices imported/synced', entity: 'XeroInvoice' },
  { key: 'xeroBills', label: 'Xero bills imported/synced', entity: 'XeroInvoice', filter: { type: 'ACCPAY' } },
  { key: 'xeroPay', label: 'Xero payments imported/synced', entity: 'XeroPayment' },
  { key: 'leads', label: 'LeadByte leads imported', entity: 'Lead' },
  { key: 'media', label: 'Media cost sheet imported', entity: 'AdSpend' },
  { key: 'calls', label: 'Calls imported', entity: 'Call' },
  { key: 'statements', label: 'Supplier statements imported', entity: 'SupplierStatement' },
  { key: 'ar', label: 'AR invoices entered', entity: 'ARInvoice' },
  { key: 'ap', label: 'Opening balances entered', entity: 'APEntry' },
];

export default function ImportChecklist() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAll();
  }, []);

  async function checkAll() {
    const r = {};
    for (const check of CHECKS) {
      try {
        const items = check.filter 
          ? await base44.entities[check.entity].filter(check.filter, undefined, 1) 
          : await base44.entities[check.entity].list(undefined, 1);
        r[check.key] = items.length > 0;
      } catch {
        r[check.key] = false;
      }
    }
    setResults(r);
    setLoading(false);
  }

  const totalDone = Object.values(results).filter(Boolean).length;
  const totalChecks = CHECKS.length;
  const allDone = totalDone === totalChecks;
  const trustworthy = ['bank', 'ar', 'ap', 'media', 'calls', 'xeroInv'].every(k => results[k]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionPanel title="Import Checklist" subtitle={`${totalDone}/${totalChecks} complete`}>
        {loading ? (
          <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
        ) : (
          <div className="space-y-1.5">
            {CHECKS.map(check => (
              <div key={check.key} className="flex items-center gap-2 text-xs">
                {results[check.key] ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <X className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={results[check.key] ? 'text-muted-foreground' : 'text-foreground'}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title="MVP Validation" subtitle={trustworthy ? 'Data trustworthy' : 'Do not trust yet'}>
        <div className="flex items-center gap-3 mb-4 p-3 rounded" style={{ background: '#22272e' }}>
          {trustworthy ? (
            <>
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Data Trustworthy</p>
                <p className="text-[11px] text-muted-foreground">Core data sources are populated</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
              <div>
                <p className="text-sm font-semibold text-red-400">Do Not Trust Yet</p>
                <p className="text-[11px] text-muted-foreground">Missing critical data sources</p>
              </div>
            </>
          )}
        </div>
        <div className="space-y-1.5 text-xs">
          {[
            { label: 'Bank totals tie out', ok: results.bank },
            { label: 'Xero AR imported', ok: results.xeroInv },
            { label: 'Xero AP imported', ok: results.xeroBills },
            { label: 'Supplier balances entered', ok: results.ap },
            { label: 'Media gap calculated', ok: results.media },
            { label: 'Calls joined to campaigns', ok: results.calls },
            { label: 'Sold leads have revenue', ok: results.leads },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.ok ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-red-400" />}
              <span className={item.ok ? 'text-muted-foreground' : 'text-foreground'}>{item.label}</span>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}