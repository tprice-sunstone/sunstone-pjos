'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  email: string;
  role: string;
  invited_by: string | null;
  created_at: string;
  is_self: boolean;
}

const ROLE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  super_admin: { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B' },
  admin: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6' },
  support: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22C55E' },
  viewer: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94A3B8' },
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support',
  viewer: 'Viewer',
};

const INVITABLE_ROLES = ['admin', 'support', 'viewer'];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('admin');
  const [inviting, setInviting] = useState(false);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      const res = await fetch('/api/admin/team');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to load');
      }
      const data = await res.json();
      setMembers(data.members);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch('/api/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to invite');
      toast.success(`Invited ${inviteEmail.trim()} as ${ROLE_LABELS[inviteRole]}`);
      setInviteEmail('');
      loadTeam();
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    setChangingRole(memberId);
    try {
      const res = await fetch(`/api/admin/team/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');
      toast.success('Role updated');
      loadTeam();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setChangingRole(null);
    }
  }

  async function handleRemove(member: TeamMember) {
    if (!confirm(`Remove ${member.email} from the admin team?`)) return;
    setRemoving(member.id);
    try {
      const res = await fetch(`/api/admin/team/${member.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      toast.success(`Removed ${member.email}`);
      loadTeam();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove');
    } finally {
      setRemoving(null);
    }
  }

  // Count super_admins for protection logic
  const superAdminCount = members.filter(m => m.role === 'super_admin').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-display, Georgia)' }}
          >
            Team
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage platform admin access
          </p>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-6 animate-pulse"
            >
              <div className="h-4 w-48 bg-[var(--surface-subtle)] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold text-[var(--text-primary)]"
          style={{ fontFamily: 'var(--font-display, Georgia)' }}
        >
          Team
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage platform admin access
        </p>
      </div>

      {/* Invite Card */}
      <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Invite Admin
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
            className="flex-1 px-3 py-2.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value)}
            className="px-3 py-2.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
          >
            {INVITABLE_ROLES.map(role => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={inviting || !inviteEmail.trim()}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg text-[var(--text-on-accent)] disabled:opacity-50 transition-colors shrink-0"
            style={{ background: 'var(--accent-primary)' }}
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      </div>

      {/* Member List */}
      <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border-default)]">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Members ({members.length})
          </h2>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)]">
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-5 py-3">
                  Email
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-5 py-3">
                  Role
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-5 py-3">
                  Joined
                </th>
                <th className="text-left text-xs font-medium text-[var(--text-secondary)] px-5 py-3">
                  Invited By
                </th>
                <th className="text-right text-xs font-medium text-[var(--text-secondary)] px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-[var(--surface-subtle)]">
                  <td className="px-5 py-3 font-medium text-[var(--text-primary)]">
                    {member.email}
                    {member.is_self && (
                      <span className="ml-2 text-[10px] font-medium text-[var(--text-tertiary)]">
                        (you)
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-3 text-[var(--text-secondary)]">
                    {member.invited_by || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {!member.is_self && (
                        <>
                          <select
                            value={member.role}
                            onChange={e => handleRoleChange(member.id, e.target.value)}
                            disabled={
                              changingRole === member.id ||
                              (member.role === 'super_admin' && superAdminCount <= 1)
                            }
                            className="px-2 py-1.5 text-xs rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] disabled:opacity-50"
                          >
                            {['super_admin', 'admin', 'support', 'viewer'].map(r => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleRemove(member)}
                            disabled={
                              removing === member.id ||
                              (member.role === 'super_admin' && superAdminCount <= 1)
                            }
                            className="px-2.5 py-1.5 text-[11px] font-medium rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          >
                            {removing === member.id ? '...' : 'Remove'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-[var(--border-subtle)]">
          {members.map(member => (
            <div key={member.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {member.email}
                    {member.is_self && (
                      <span className="ml-1 text-[10px] text-[var(--text-tertiary)]">(you)</span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {member.created_at
                      ? new Date(member.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : ''}
                    {member.invited_by ? ` · Invited by ${member.invited_by}` : ''}
                  </p>
                </div>
                <RoleBadge role={member.role} />
              </div>
              {!member.is_self && (
                <div className="flex items-center gap-2">
                  <select
                    value={member.role}
                    onChange={e => handleRoleChange(member.id, e.target.value)}
                    disabled={
                      changingRole === member.id ||
                      (member.role === 'super_admin' && superAdminCount <= 1)
                    }
                    className="flex-1 px-2 py-1.5 text-xs rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[var(--text-primary)] disabled:opacity-50"
                  >
                    {['super_admin', 'admin', 'support', 'viewer'].map(r => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={
                      removing === member.id ||
                      (member.role === 'super_admin' && superAdminCount <= 1)
                    }
                    className="px-3 py-1.5 text-[11px] font-medium rounded-md border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                  >
                    {removing === member.id ? '...' : 'Remove'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <div className="px-5 py-12 text-center text-sm text-[var(--text-tertiary)]">
            No team members found
          </div>
        )}
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.viewer;
  return (
    <span
      className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {ROLE_LABELS[role] || role}
    </span>
  );
}
