'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const DIM = {
  dopamine:     { label:'Exploration & Innovation', color:'#B8975A' },
  serotonin:    { label:'Structure & Planning',     color:'#4A7C9E' },
  testosterone: { label:'Drive & Assertiveness',    color:'#8B4A4A' },
  estrogen:     { label:'Connection & Empathy',     color:'#4A8B6F' },
};

export default function AccountPage() {
  const [user, setUser]               = useState<any>(null);
  const [profile, setProfile]         = useState<any>(null);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { window.location.href = '/login'; return; }
      setUser(u);

      const [{ data: prof }, { data: ass }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', u.id).maybeSingle(),
        supabase.from('assessments').select('*').eq('email', u.email).order('created_at', { ascending: false }),
      ]);
      setProfile(prof);
      setAssessments(ass || []);
      setLoading(false);
    };
    init();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const tierLabel = (tier: string) => ({ explorer:'Explorer', professional:'Professional', enterprise:'Enterprise', practitioner:'Practitioner' }[tier] || tier);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#B8975A]/20 border-t-[#B8975A] rounded-full animate-spin"/>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <nav className="sticky top-0 z-50 bg-[#1A1A1A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-white/40 text-xs">{user?.email}</span>
          <button onClick={handleSignOut} className="text-xs text-white/40 hover:text-white transition-colors">Sign Out</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* Profile header */}
        <div className="bg-[#1A1A1A] rounded-xl p-8 text-white mb-8">
          <p className="text-[#B8975A]/50 text-[10px] tracking-[0.3em] uppercase mb-3">My Account</p>
          <h1 className="font-display text-3xl mb-1">
            {profile?.first_name || user?.user_metadata?.first_name || 'Welcome'}
            {(profile?.last_name || user?.user_metadata?.last_name) ? ` ${profile?.last_name || user?.user_metadata?.last_name}` : ''}
          </h1>
          <p className="text-white/40 text-sm">
            {profile?.seniority || ''}{profile?.industry ? ` · ${profile.industry}` : ''}
          </p>
          <div className="mt-5 flex gap-3">
            <span className="px-3 py-1 rounded-full text-[10px] font-semibold border border-[#B8975A]/30 text-[#B8975A]">
              {tierLabel(profile?.subscription_tier || 'explorer')}
            </span>
            {assessments.length > 0 && (
              <span className="px-3 py-1 rounded-full text-[10px] font-semibold border border-white/10 text-white/40">
                {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Assessments */}
        <div className="mb-8">
          <h2 className="font-display text-xl text-[#1A1A1A] mb-4">My Assessments</h2>

          {assessments.length === 0 ? (
            <div className="bg-white rounded-xl p-10 border border-[#E8E5DF] text-center">
              <p className="text-[#888] text-sm mb-5">You haven&apos;t completed an assessment yet.</p>
              <Link href="/assess" className="inline-block bg-[#B8975A] hover:bg-[#96793F] text-white px-8 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors">
                Start Free Assessment
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((a: any) => (
                <div key={a.id} className="bg-white rounded-xl p-6 border border-[#E8E5DF]">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold tracking-widest uppercase text-[#B8975A]">
                          {tierLabel(a.tier)}
                        </span>
                        <span className="text-[#E8E5DF]">·</span>
                        <span className="text-xs text-[#888]">
                          {a.completed_at ? new Date(a.completed_at).toLocaleDateString('en-IE', { day:'numeric', month:'long', year:'numeric' }) : '—'}
                        </span>
                      </div>
                      <p className="text-[#888] text-xs">{a.questions_answered} questions · {a.duration_seconds ? `${Math.round(a.duration_seconds/60)} min` : '—'}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-[#1A1A1A] font-semibold">
                        {a.score_overall ? Number(a.score_overall).toFixed(1) : '—'}
                      </div>
                      <div className="text-[10px] text-[#888]">overall</div>
                    </div>
                  </div>

                  {/* Dimension bars */}
                  {a.score_dopamine && (
                    <div className="space-y-3 mb-5">
                      {(Object.entries(DIM) as [string, {label:string;color:string}][]).map(([k, d]) => (
                        <div key={k}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-[#888]">{d.label}</span>
                            <span className="font-mono font-semibold" style={{color:d.color}}>
                              {Number(a[`score_${k}`]||0).toFixed(1)}
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#F5F3EF] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{width:`${(Number(a[`score_${k}`]||0)/5)*100}%`, background:d.color}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-[#E8E5DF]">
                    {a.tier === 'explorer' ? (
                      <Link href="/pricing" className="flex-1 text-center bg-[#B8975A] hover:bg-[#96793F] text-white py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors">
                        Upgrade to Professional — €49
                      </Link>
                    ) : a.report_data ? (
                      <Link href={`/assess/professional?session_id=saved&id=${a.id}`}
                        className="flex-1 text-center border border-[#B8975A] text-[#B8975A] hover:bg-[#B8975A] hover:text-white py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors">
                        View Full Report
                      </Link>
                    ) : (
                      <span className="flex-1 text-center border border-[#E8E5DF] text-[#888] py-2.5 rounded-lg text-xs">
                        Report generating…
                      </span>
                    )}
                    <a href="mailto:orla.brennan@prismexecutive.ie?subject=Assessment Debrief Request"
                      className="px-4 py-2.5 border border-[#E8E5DF] text-[#888] hover:border-[#B8975A] hover:text-[#B8975A] rounded-lg text-xs font-medium transition-colors">
                      Book Debrief
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade CTA if on explorer */}
        {(!profile?.subscription_tier || profile?.subscription_tier === 'explorer') && assessments.length > 0 && (
          <div className="bg-white rounded-xl p-8 border border-[#E8E5DF] text-center">
            <p className="text-[10px] tracking-widest uppercase text-[#888] mb-2">Unlock More</p>
            <h3 className="font-display text-xl text-[#1A1A1A] mb-2">Get Your Full 15-Page Report</h3>
            <p className="text-xs text-[#888] mb-6 max-w-sm mx-auto">Complete the 80-question Professional assessment for a comprehensive analysis of your natural and adapted behavioural profile.</p>
            <Link href="/pricing" className="inline-block bg-[#B8975A] hover:bg-[#96793F] text-white px-8 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors">
              View Pricing — From €49
            </Link>
          </div>
        )}

      </div>

      <footer className="bg-[#1A1A1A] py-8 text-center mt-12">
        <p className="text-[#B8975A] text-xs tracking-[0.25em] mb-2">PRISM EXECUTIVE</p>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Prism Executive Ltd</p>
      </footer>
    </div>
  );
}
