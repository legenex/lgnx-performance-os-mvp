import React from 'react';
import SectionPanel from '@/components/shared/SectionPanel';
import StatusBadge from '@/components/shared/StatusBadge';
import { Users, Shield, Crown, DollarSign, Settings, Radio, Megaphone } from 'lucide-react';

const ROLES = [
  {
    name: 'Owner',
    icon: Crown,
    description: 'Full access to all modules, settings, billing, and user management',
    access: ['Overview', 'Finances', 'Performance', 'Ad Intelligence', 'Lead Gateway', 'Data & System'],
    canInvite: true,
    canEditRoles: true,
  },
  {
    name: 'Finance',
    icon: DollarSign,
    description: 'Cash, AR/AP, reconciliation, Xero, and financial reporting',
    access: ['Overview', 'Finances', 'Performance'],
    canInvite: false,
    canEditRoles: false,
  },
  {
    name: 'Ops',
    icon: Settings,
    description: 'Day-to-day operations, lead gateway, supplier/buyer management',
    access: ['Overview', 'Finances', 'Performance', 'Lead Gateway', 'Data & System'],
    canInvite: false,
    canEditRoles: false,
  },
  {
    name: 'Media Buyer',
    icon: Megaphone,
    description: 'Ad intelligence, campaign performance, creative analysis',
    access: ['Overview', 'Performance', 'Ad Intelligence'],
    canInvite: false,
    canEditRoles: false,
  },
  {
    name: 'Gateway / Infra',
    icon: Radio,
    description: 'Lead gateway, routing, delivery, compliance, error queue',
    access: ['Overview', 'Lead Gateway', 'Data & System'],
    canInvite: false,
    canEditRoles: false,
  },
];

const ALL_MODULES = ['Overview', 'Finances', 'Performance', 'Ad Intelligence', 'Lead Gateway', 'Data & System'];

export default function UsersRoles() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Users & Roles</h1>
        <p className="text-xs text-muted-foreground mt-1">Role definitions and module access permissions</p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ROLES.map(role => {
          const Icon = role.icon;
          return (
            <div key={role.name} className="rounded-xl border border-border p-4" style={{ background: 'hsl(213, 17%, 20%)' }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(214, 18%, 23%)' }}>
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{role.name}</p>
                  {role.canInvite && <span className="text-[9px] text-success">Can invite users</span>}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">{role.description}</p>
              <div className="flex flex-wrap gap-1">
                {ALL_MODULES.map(m => (
                  <span key={m} className={`text-[9px] px-1.5 py-0.5 rounded border ${role.access.includes(m) ? 'border-success/30 bg-success/10 text-success' : 'border-border bg-muted/20 text-muted-foreground line-through'}`}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Access Matrix */}
      <SectionPanel title="Module Access Matrix">
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 pr-3">Module</th>
                {ROLES.map(r => <th key={r.name} className="pb-2 pr-3 text-center">{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {ALL_MODULES.map(module => (
                <tr key={module} className="border-b border-border/30">
                  <td className="py-2 pr-3 font-medium">{module}</td>
                  {ROLES.map(r => (
                    <td key={r.name} className="py-2 pr-3 text-center">
                      {r.access.includes(module)
                        ? <StatusBadge status="Active" />
                        : <span className="text-muted-foreground text-[10px]">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Invite User */}
      <SectionPanel title="Invite User" subtitle="Send an invitation to join the platform">
        <div className="flex items-center gap-2">
          <input type="email" placeholder="user@example.com" className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground" />
          <select className="bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground">
            {ROLES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ background: 'hsl(358, 78%, 52%)' }}>
            Invite
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">Only Owners can assign Admin roles. Invited users will receive an email with setup instructions.</p>
      </SectionPanel>
    </div>
  );
}