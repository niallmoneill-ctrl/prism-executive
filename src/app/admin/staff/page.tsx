'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const STAFF_ROLES = [
  'ceo',
  'cfo',
  'cto',
  'operations_manager',
  'senior_consultant',
  'consultant',
  'customer_support',
  'marketing',
  'finance',
  'hr',
] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

const ROLE_LABELS: Record<StaffRole, string> = {
  ceo: 'CEO',
  cfo: 'CFO',
  cto: 'CTO',
  operations_manager: 'Operations Manager',
  senior_consultant: 'Senior Consultant',
  consultant: 'Consultant',
  customer_support: 'Customer Support',
  marketing: 'Marketing',
  finance: 'Finance',
  hr: 'HR',
};

const ROLE_TONE: Record<StaffRole, string> = {
  ceo: 'bg-[#B8975A] text-white',
  cfo: 'bg-[#0F1D35] text-white',
  cto: 'bg-[#0F1D35] text-white',
  operations_manager: 'bg-[#4A7C9E]/15 text-[#3a6280]',
  senior_consultant: 'bg-[#B8975A]/15 text-[#96793F]',
  consultant: 'bg-[#B8975A]/10 text-[#96793F]',
  customer_support: 'bg-[#4A8B6F]/15 text-[#3a6e57]',
  marketing: 'bg-[#8B4A4A]/15 text-[#6e3a3a]',
  finance: 'bg-[#4A7C9E]/15 text-[#3a6280]',
  hr: 'bg-[#4A8B6F]/15 text-[#3a6e57]',
};

interface StaffMember {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  created_at: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  created_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      // Defence-in-depth: middleware already gates /admin server-side, but
      // prerendered `'use client'` pages can be served from CDN cache, so
      // mirror the auth + role check on the client too.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login?redirect=/admin/staff'; return; }
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!me?.role || !(STAFF_ROLES as readonly string[]).includes(me.role)) {
        window.location.href = '/account';
        return;
      }

      const { data: members, error: membersErr } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, created_at')
        .in('role', STAFF_ROLES as unknown as string[])
        .order('created_at', { ascending: true });

      if (membersErr) {
        setError(membersErr.message);
      } else {
        setStaff((members || []) as StaffMember[]);
      }

      // Pending invites (best-effort — table may have different columns).
      const { data: pending } = await supabase
        .from('staff_invites')
        .select('id, email, role, created_at, expires_at, accepted_at')
        .is('accepted_at', null)
        .order('created_at', { ascending: false });
      if (pending) setInvites(pending as PendingInvite[]);

      setLoading(false);
    })();
  }, []);

  const inviteRoleCount = (role: StaffRole) =>
    staff.filter(s => s.role === role).length;

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Top bar */}
      <nav className="bg-[#1A1A1A] px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
          <span className="text-white/30 text-[10px] tracking-[0.25em] uppercase ml-1">Admin · Staff</span>
        </Link>
        <Link href="/admin" className="text-[10px] text-white/40 hover:text-[#B8975A] tracking-[0.15em] uppercase">← Dashboard</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] tracking-[0.3em] uppercase text-[#888] mb-2">Team Management</p>
            <h1 className="font-display text-3xl text-[#1A1A1A]">Staff</h1>
            <p className="text-sm text-[#888] mt-1">
              {staff.length} team {staff.length === 1 ? 'member' : 'members'}
              {invites.length > 0 ? ` · ${invites.length} pending ${invites.length === 1 ? 'invite' : 'invites'}` : ''}
            </p>
          </div>
          <Link
            href="/admin/staff/invite"
            className="bg-[#B8975A] hover:bg-[#96793F] text-white px-5 py-2.5 rounded-lg text-xs font-medium tracking-[0.15em] uppercase transition-colors"
          >
            + Invite Staff
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-6">
            Could not load staff: {error}
          </div>
        )}

        {/* Role distribution */}
        {!loading && staff.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E5DF] p-6 mb-8">
            <p className="text-[10px] tracking-[0.25em] uppercase text-[#888] font-medium mb-4">Role Distribution</p>
            <div className="flex flex-wrap gap-2">
              {STAFF_ROLES.map(r => {
                const count = inviteRoleCount(r);
                if (count === 0) return null;
                return (
                  <span key={r} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium ${ROLE_TONE[r]}`}>
                    {ROLE_LABELS[r]}
                    <span className="bg-white/30 rounded-full px-1.5 text-[10px] font-mono">{count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Team list */}
        <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-[#E8E5DF] flex items-center justify-between">
            <h2 className="font-display text-lg text-[#1A1A1A]">Team Members</h2>
          </div>
          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-[#888]">Loading team…</div>
          ) : staff.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-[#888] mb-3">No staff yet.</p>
              <Link href="/admin/staff/invite" className="text-xs text-[#B8975A] hover:underline tracking-wide uppercase">
                Invite your first team member →
              </Link>
            </div>
          ) : (
            <div>
              {staff.map(member => {
                const role = (member.role || '') as StaffRole;
                const initials = `${(member.first_name?.[0] || '?').toUpperCase()}${(member.last_name?.[0] || '').toUpperCase()}`;
                const fullName = [member.first_name, member.last_name].filter(Boolean).join(' ') || member.email || 'Unnamed staff';
                return (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#F5F3EF] last:border-0">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#B8975A] to-[#96793F] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{fullName}</p>
                      <p className="text-xs text-[#888] truncate">{member.email || '—'}</p>
                    </div>
                    {STAFF_ROLES.includes(role) ? (
                      <span className={`text-[10px] tracking-widest uppercase font-semibold px-3 py-1 rounded-full ${ROLE_TONE[role]}`}>
                        {ROLE_LABELS[role]}
                      </span>
                    ) : (
                      <span className="text-[10px] tracking-widest uppercase font-semibold px-3 py-1 rounded-full bg-[#F5F3EF] text-[#888]">
                        {member.role || 'unknown'}
                      </span>
                    )}
                    <span className="text-[10px] text-[#888] w-24 text-right">
                      {member.created_at ? new Date(member.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E8E5DF]">
              <h2 className="font-display text-lg text-[#1A1A1A]">Pending Invites</h2>
              <p className="text-xs text-[#888] mt-0.5">Invitations that haven&apos;t been accepted yet.</p>
            </div>
            {invites.map(inv => {
              const role = (inv.role || '') as StaffRole;
              return (
                <div key={inv.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#F5F3EF] last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-[#F5F3EF] border border-dashed border-[#D8D5CF] flex items-center justify-center text-[#888] text-xs flex-shrink-0">
                    @
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A1A1A] truncate">{inv.email}</p>
                    <p className="text-[11px] text-[#888]">
                      Invited {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' }) : '—'}
                      {inv.expires_at ? ` · expires ${new Date(inv.expires_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })}` : ''}
                    </p>
                  </div>
                  {STAFF_ROLES.includes(role) ? (
                    <span className={`text-[10px] tracking-widest uppercase font-semibold px-3 py-1 rounded-full ${ROLE_TONE[role]}`}>
                      {ROLE_LABELS[role]}
                    </span>
                  ) : (
                    <span className="text-[10px] tracking-widest uppercase font-semibold px-3 py-1 rounded-full bg-[#F5F3EF] text-[#888]">
                      {inv.role || 'unknown'}
                    </span>
                  )}
                  <span className="text-[10px] text-[#B8975A] tracking-widest uppercase w-24 text-right">Pending</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="bg-[#1A1A1A] py-6 text-center mt-10">
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Prism Executive Ltd · Internal</p>
      </footer>
    </div>
  );
}
