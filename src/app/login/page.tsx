'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const inputClass = "w-full px-4 py-3 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] bg-white placeholder:text-[#bbb] transition-colors";

export default function LoginPage() {
  const [mode, setMode] = useState<'password'|'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [redirect, setRedirect] = useState('/account');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect')) setRedirect(params.get('redirect')!);
    if (params.get('error')) setError('Authentication failed. Please try again.');
    if (params.get('registered')) setMessage('Account created. Please sign in.');
  }, []);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      window.location.href = redirect;
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirect}` },
    });
    if (err) { setError(err.message); } else {
      setMessage('Check your email — a sign-in link has been sent.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      <nav className="bg-[#1A1A1A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl text-[#1A1A1A] mb-2">Sign In</h1>
            <p className="text-[#888] text-sm">Access your assessment reports and profile.</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 bg-white rounded-xl border border-[#E8E5DF] p-1 mb-6">
            <button onClick={() => setMode('password')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${mode==='password'?'bg-[#1A1A1A] text-white':'text-[#888] hover:text-[#333]'}`}>
              Email & Password
            </button>
            <button onClick={() => setMode('magic')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${mode==='magic'?'bg-[#1A1A1A] text-white':'text-[#888] hover:text-[#333]'}`}>
              Magic Link
            </button>
          </div>

          <div className="bg-white rounded-xl p-8 border border-[#E8E5DF]">
            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-5">{error}</div>}
            {message && <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 mb-5">{message}</div>}

            <form onSubmit={mode==='password' ? handlePassword : handleMagicLink} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#333] mb-1.5">Email Address</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  placeholder="your@email.com" required className={inputClass}/>
              </div>

              {mode==='password' && (
                <div>
                  <label className="block text-xs font-medium text-[#333] mb-1.5">Password</label>
                  <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                    placeholder="••••••••" required className={inputClass}/>
                </div>
              )}

              <button type="submit" disabled={loading || !email || (mode==='password' && !password)}
                className="w-full bg-[#B8975A] hover:bg-[#96793F] text-white py-3 rounded-lg text-sm font-medium tracking-wide transition-colors disabled:opacity-40 mt-2">
                {loading ? 'Please wait…' : mode==='password' ? 'Sign In' : 'Send Magic Link'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[#E8E5DF] text-center">
              <p className="text-xs text-[#888]">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-[#B8975A] font-medium hover:underline">Create one</Link>
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
