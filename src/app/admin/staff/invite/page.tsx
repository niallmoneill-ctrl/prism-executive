'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { FUNCTIONS_URL } from '@/lib/supabase';

const STAFF_ROLE_SET: ReadonlyArray<string> = [
  'ceo','cfo','cto','operations_manager','senior_consultant','consultant',
  'customer_support','marketing','finance','hr',
];

const STAFF_ROLES = [
  { value: 'ceo',                label: 'CEO',                 hint: 'Full access to every workspace and finance.' },
  { value: 'cfo',                label: 'CFO',                 hint: 'Finance, invoices, payments, reporting.' },
  { value: 'cto',                label: 'CTO',                 hint: 'Engineering, integrations, system settings.' },
  { value: 'operations_manager', label: 'Operations Manager',  hint: 'Pipeline, searches, candidates, scheduling.' },
  { value: 'senior_consultant',  label: 'Senior Consultant',   hint: 'Owns retained searches and key accounts.' },
  { value: 'consultant',         label: 'Consultant',          hint: 'Day-to-day candidate and client work.' },
  { value: 'customer_support',   label: 'Customer Support',    hint: 'Client enquiries and account assistance.' },
  { value: 'marketing',          label: 'Marketing',           hint: 'Campaigns, content, lead nurture.' },
  { value: 'finance',            label: 'Finance',             hint: 'Invoicing, AR/AP, expense management.' },
  { value: 'hr',                 label: 'HR',                  hint: 'People operations and internal onboarding.' },
] as const;

const inputClass =
  'w-full px-4 py-3 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] bg-white placeholder:text-[#bbb] transition-colors';

export default function InviteStaffPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<string>('consultant');
  const [message, setMessage]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login?redirect=/admin/staff/invite'; return; }
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (!me?.role || !STAFF_ROLE_SET.includes(me.role)) {
        window.location.href = '/account';
      }
    })();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!email || !role) return;

    setLoading(true);
    const supabase = createClient();

    const { data: userRes } = await supabase.auth.getUser();
    const inviter = userRes.user;
    if (!inviter) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }

    // Generate a single-use invite token. crypto.randomUUID is available in
    // every browser we ship to (Edge, Safari 15+, Chromium, Firefox).
    const token = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const inviteRow: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      role,
      token,
      invited_by: inviter.id,
      expires_at: expiresAt,
    };
    if (firstName.trim()) inviteRow.first_name = firstName.trim();
    if (lastName.trim())  inviteRow.last_name  = lastName.trim();
    if (message.trim())   inviteRow.message    = message.trim();

    const { data: inserted, error: insertErr } = await supabase
      .from('staff_invites')
      .insert(inviteRow)
      .select()
      .maybeSingle();

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    // Notify the auth/onboarding side. We try the on-register edge function
    // first (the project's invite hook) and fall back to send-email so the
    // invitee always receives something. Either path is fire-and-forget.
    const origin = window.location.origin;
    const acceptUrl = `${origin}/register?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(email.trim().toLowerCase())}`;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const onRegister = await fetch(`${FUNCTIONS_URL}/on-register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: 'staff_invite',
          inviteId: inserted?.id,
          email: email.trim().toLowerCase(),
          firstName: firstName.trim() || null,
          lastName:  lastName.trim()  || null,
          role,
          token,
          acceptUrl,
          message: message.trim() || null,
          invitedBy: inviter.id,
        }),
      });

      if (!onRegister.ok) {
        await fetch(`${FUNCTIONS_URL}/send-email`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'staff_invite',
            data: {
              email: email.trim().toLowerCase(),
              firstName: firstName.trim() || 'there',
              role,
              acceptUrl,
              message: message.trim() || null,
              invitedBy: inviter.email || 'The Prism Executive team',
            },
          }),
        });
      }
    } catch {
      // The invite row is committed regardless — the staff list still shows it
      // as pending and the team can resend.
    }

    setSuccess(`Invite sent to ${email}. They'll appear under Pending Invites until they accept.`);
    setLoading(false);

    setTimeout(() => router.push('/admin/staff'), 1200);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      <nav className="bg-[#1A1A1A] px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
          <span className="text-white/30 text-[10px] tracking-[0.25em] uppercase ml-1">Admin · Staff · Invite</span>
        </Link>
        <Link href="/admin/staff" className="text-[10px] text-white/40 hover:text-[#B8975A] tracking-[0.15em] uppercase">← Staff</Link>
      </nav>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <div className="mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#888] mb-2">Team Management</p>
          <h1 className="font-display text-3xl text-[#1A1A1A] mb-1">Invite a Team Member</h1>
          <p className="text-sm text-[#888]">
            They&apos;ll receive an email with a single-use link. Their permissions are set the moment they accept.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-5">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 mb-5">
            {success}
          </div>
        )}

        <form onSubmit={submit} className="bg-white rounded-xl border border-[#E8E5DF] p-8 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#333] mb-1.5">First Name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Orla" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#333] mb-1.5">Last Name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Brennan" className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#333] mb-1.5">
              Work Email <span className="text-red-400">*</span>
            </label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="orla@prismexecutive.ie" className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#333] mb-2">
              Role <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STAFF_ROLES.map(r => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`text-left px-4 py-3 rounded-lg border transition-all ${
                    role === r.value
                      ? 'border-[#B8975A] bg-[#FBF6ED] shadow-sm'
                      : 'border-[#E8E5DF] bg-white hover:border-[#D6D3CD]'
                  }`}
                >
                  <p className={`text-[11px] tracking-[0.15em] uppercase font-semibold mb-0.5 ${role === r.value ? 'text-[#B8975A]' : 'text-[#1A1A1A]'}`}>{r.label}</p>
                  <p className="text-[10px] text-[#888] leading-snug">{r.hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#333] mb-1.5">Personal Note <span className="text-[#bbb]">(optional)</span></label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="A short message included in the invitation email."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-4">
            <Link href="/admin/staff" className="text-xs text-[#888] hover:text-[#333] tracking-wide">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading || !email || !role}
              className="bg-[#B8975A] hover:bg-[#96793F] text-white px-6 py-3 rounded-lg text-xs font-medium tracking-[0.15em] uppercase transition-colors disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>

        <p className="text-[11px] text-[#888] text-center mt-5">
          Invites expire 7 days after sending. You can re-send from the Staff page.
        </p>
      </div>

      <footer className="bg-[#1A1A1A] py-6 text-center">
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Prism Executive Ltd · Internal</p>
      </footer>
    </div>
  );
}
