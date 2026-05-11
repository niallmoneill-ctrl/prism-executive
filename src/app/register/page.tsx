'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const inputClass = "w-full px-4 py-3 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] bg-white placeholder:text-[#bbb] transition-colors";

const INDUSTRIES = ['Healthcare','Pharmaceuticals & Biotech','Financial Services','Construction & Infrastructure','Solar & Renewable Energy','Engineering & Manufacturing','Professional Services','FMCG & Retail','ICT & Technology','Not-For-Profit','Other'];
const SENIORITY  = ['C-Suite (CEO, CFO, COO, CTO)','Director / VP','Senior Manager','Manager','Team Lead','Individual Contributor','Student / Graduate'];

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [industry, setIndustry]   = useState('');
  const [seniority, setSeniority] = useState('');
  const [role, setRole]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);
  const [redirect, setRedirect]   = useState('/account');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('redirect');
    if (r) setRedirect(r);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');

    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`;
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { first_name: firstName, last_name: lastName, industry, seniority, role },
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    // Upsert profile
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        industry,
        seniority,
        role: 'candidate',
        subscription_tier: 'explorer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // If Supabase returned a session, email confirmation is disabled — the
    // user is fully signed in. Send them straight to where they were going
    // (e.g. /pricing?tier=professional) so checkout can resume without a
    // second "register again" step.
    if (data.session) {
      window.location.href = redirect;
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center px-6">
        <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-5 text-2xl">✓</div>
          <h2 className="font-display text-2xl text-[#1A1A1A] mb-2">Check Your Email</h2>
          <p className="text-[#888] text-sm leading-relaxed mb-6">
            We&apos;ve sent a confirmation link to <strong className="text-[#333]">{email}</strong>.
            Click it to activate your account and access your reports.
          </p>
          <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="inline-block bg-[#B8975A] hover:bg-[#96793F] text-white px-8 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      <nav className="bg-[#1A1A1A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl text-[#1A1A1A] mb-2">Create Account</h1>
            <p className="text-[#888] text-sm">Save your reports and track your development.</p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-[#E8E5DF]">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-5">{error}</div>}

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#333] mb-1.5">First Name <span className="text-red-400">*</span></label>
                  <input value={firstName} onChange={e=>setFirstName(e.target.value)} required placeholder="Orla" className={inputClass}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#333] mb-1.5">Last Name</label>
                  <input value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Brennan" className={inputClass}/>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#333] mb-1.5">Email Address <span className="text-red-400">*</span></label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="your@email.com" className={inputClass}/>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#333] mb-1.5">Password <span className="text-red-400">*</span></label>
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Min. 8 characters" className={inputClass}/>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#333] mb-1.5">Industry</label>
                <select value={industry} onChange={e=>setIndustry(e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#333] mb-1.5">Seniority</label>
                <select value={seniority} onChange={e=>setSeniority(e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  {SENIORITY.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#333] mb-1.5">Job Title</label>
                <input value={role} onChange={e=>setRole(e.target.value)} placeholder="e.g. Chief Operating Officer" className={inputClass}/>
              </div>

              <button type="submit" disabled={loading||!firstName||!email||!password}
                className="w-full bg-[#B8975A] hover:bg-[#96793F] text-white py-3 rounded-lg text-sm font-medium tracking-wide transition-colors disabled:opacity-40 mt-2">
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#E8E5DF] text-center">
              <p className="text-xs text-[#888]">
                Already have an account?{' '}
                <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-[#B8975A] font-medium hover:underline">Sign in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-[#1A1A1A] py-6 text-center">
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Prism Executive Ltd</p>
      </footer>
    </div>
  );
}
