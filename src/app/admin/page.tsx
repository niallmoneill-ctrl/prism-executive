'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [pg, setPg] = useState('overview');
  const [sideOpen, setSideOpen] = useState(true);
  const [data, setData] = useState<any>({ leads: [], activities: [], orgs: [], candidates: [], searches: [], invoices: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Realtime subscription for live updates
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activities' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => loadData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async () => {
    const [leads, activities, orgs, candidates, searches, invoices, assessments] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(15),
      supabase.from('organisations').select('*').order('created_at', { ascending: false }),
      supabase.from('candidates').select('*').order('created_at', { ascending: false }),
      supabase.from('searches').select('*').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('assessments').select('*').eq('status', 'completed').order('created_at', { ascending: false }).limit(10),
    ]);
    setData({
      leads: leads.data || [], activities: activities.data || [], orgs: orgs.data || [],
      candidates: candidates.data || [], searches: searches.data || [], invoices: invoices.data || [],
      assessments: assessments.data || [],
    });
    setLoading(false);
  };

  const NAV = [
    { id:'overview', label:'Overview', e:'◆' }, { id:'leads', label:'Leads', e:'🎯' },
    { id:'companies', label:'Companies', e:'◫' }, { id:'candidates', label:'Candidates', e:'◎' },
    { id:'searches', label:'Searches', e:'🔍' }, { id:'assessments', label:'Assessments', e:'◈' },
    { id:'invoices', label:'Invoices', e:'◇' }, { id:'activity', label:'Activity', e:'▤' },
  ];

  const Pill = ({ c, children }: { c: string; children: React.ReactNode }) => {
    const colors: Record<string, string> = { green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', gold: 'bg-amber-50 text-amber-700', purple: 'bg-purple-50 text-purple-600' };
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors[c] || colors.gold}`}><span className="w-1 h-1 rounded-full bg-current" />{children}</span>;
  };

  const KPI = ({ label, value, sub }: { label: string; value: string|number; sub?: string }) => (
    <div className="bg-white rounded-xl p-4 border border-prism-border flex-1 min-w-[130px]">
      <div className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase mb-1.5">{label}</div>
      <div className="font-display text-2xl font-bold text-navy">{value}</div>
      {sub && <div className="text-[10px] text-gold-dark font-semibold mt-1">{sub}</div>}
    </div>
  );

  const timeAgo = (d: string) => {
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return `${Math.floor(mins/1440)}d ago`;
  };

  return (
    <div className="flex h-screen bg-prism-bg text-gray-800 overflow-hidden font-body">
      {/* Sidebar */}
      <div className={`${sideOpen ? 'w-52' : 'w-14'} flex-shrink-0 bg-navy flex flex-col border-r border-white/5 transition-all duration-200 overflow-hidden`}>
        <div onClick={() => setSideOpen(!sideOpen)} className="p-4 flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 bg-gradient-to-br from-gold to-gold-dark rounded-md flex items-center justify-center font-display text-base font-extrabold text-navy flex-shrink-0">P</div>
          {sideOpen && <div><div className="text-gold font-display font-bold text-xs tracking-[0.15em]">PRISM</div><div className="text-white/25 text-[7px] tracking-wider">ADMIN</div></div>}
        </div>
        <div className="flex-1 px-2 space-y-0.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPg(n.id)} title={sideOpen ? undefined : n.label}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${pg === n.id ? 'bg-gold/10 text-gold font-semibold' : 'text-white/50 hover:bg-white/5'} ${sideOpen ? '' : 'justify-center'}`}>
              <span className="text-sm flex-shrink-0">{n.e}</span>
              {sideOpen && <span>{n.label}</span>}
              {n.id === 'leads' && data.leads.filter((l:any) => l.status === 'new').length > 0 && (
                <span className="ml-auto w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {data.leads.filter((l:any) => l.status === 'new').length}
                </span>
              )}
            </button>
          ))}
        </div>
        {sideOpen && (
          <div className="p-3 border-t border-white/5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-[10px] font-bold text-navy">OB</div>
            <div><div className="text-white text-[11px] font-semibold">Orla Brennan</div><div className="text-white/30 text-[9px]">CEO</div></div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-12 px-5 flex items-center justify-between border-b border-prism-border bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSideOpen(!sideOpen)} className="text-gray-400 text-base">☰</button>
            <span className="text-xs text-gray-400 font-medium">{NAV.find(n => n.id === pg)?.label || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-[10px] text-gray-400 hover:text-gold">← Back to Site</Link>
            <div className="w-2 h-2 rounded-full bg-green-500" />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">Loading live data from Supabase...</div>
          ) : (
            <>
              {/* OVERVIEW */}
              {pg === 'overview' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Command Centre</h2>
                  <div className="flex gap-3 mb-5 flex-wrap">
                    <KPI label="Leads" value={data.leads.length} sub={`${data.leads.filter((l:any) => l.status === 'new').length} new`} />
                    <KPI label="Companies" value={data.orgs.length} />
                    <KPI label="Candidates" value={data.candidates.length} />
                    <KPI label="Searches" value={data.searches.length} />
                    <KPI label="Assessments" value={data.assessments.length} />
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-prism-border">
                    <h3 className="text-sm font-bold text-navy mb-3">Recent Activity</h3>
                    {data.activities.length === 0 ? (
                      <p className="text-xs text-gray-400 py-8 text-center">No activity yet. Leads and assessments will appear here in real-time as they come in.</p>
                    ) : data.activities.slice(0, 10).map((a: any) => (
                      <div key={a.id} className="flex gap-2.5 py-2.5 border-b border-gray-50 last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-600 truncate">{a.description}</div>
                          <div className="text-[10px] text-gray-400">{timeAgo(a.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEADS */}
              {pg === 'leads' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Leads <span className="text-sm font-normal text-gray-400">({data.leads.length})</span></h2>
                  {data.leads.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <div className="text-3xl mb-3">🎯</div>
                      <p className="text-sm text-gray-500 mb-2">No leads yet</p>
                      <p className="text-xs text-gray-400">When employers use the hiring tools on your site, leads will appear here automatically with auto-scored priority.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-prism-border overflow-hidden">
                      {data.leads.map((l: any, i: number) => (
                        <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${l.lead_score >= 7 ? 'bg-red-50 text-red-600' : l.lead_score >= 4 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'}`}>
                            {l.lead_score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-navy">{l.first_name} {l.last_name || ''}</div>
                            <div className="text-[10px] text-gray-400">{l.company_name || '—'} • {l.industry || '—'} • {l.tool_used || 'website'}</div>
                          </div>
                          <div className="text-right">
                            <Pill c={l.status === 'new' ? 'red' : l.status === 'contacted' ? 'blue' : 'green'}>{l.status}</Pill>
                            <div className="text-[9px] text-gray-400 mt-1">{timeAgo(l.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* COMPANIES */}
              {pg === 'companies' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Companies <span className="text-sm font-normal text-gray-400">({data.orgs.length})</span></h2>
                  {data.orgs.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <p className="text-xs text-gray-400">No companies yet. They'll appear as leads convert to clients.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-prism-border overflow-hidden">
                      {data.orgs.map((o: any) => (
                        <div key={o.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
                          <div className="flex-1"><div className="text-xs font-semibold text-navy">{o.name}</div><div className="text-[10px] text-gray-400">{o.industry || '—'}</div></div>
                          <Pill c={o.tier === 'retained' ? 'gold' : 'blue'}>{o.tier || 'prospect'}</Pill>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CANDIDATES */}
              {pg === 'candidates' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Candidates <span className="text-sm font-normal text-gray-400">({data.candidates.length})</span></h2>
                  {data.candidates.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <p className="text-xs text-gray-400">No candidates yet. Add candidates manually or they'll be created when assessments are completed.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-prism-border overflow-hidden">
                      {data.candidates.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
                          <div className="flex-1"><div className="text-xs font-semibold text-navy">{c.first_name} {c.last_name}</div><div className="text-[10px] text-gray-400">{c.current_title || '—'} • {c.industry || '—'}</div></div>
                          {c.prism_score && <span className="font-mono text-xs font-bold text-gold">{c.prism_score}/5</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SEARCHES */}
              {pg === 'searches' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Searches <span className="text-sm font-normal text-gray-400">({data.searches.length})</span></h2>
                  {data.searches.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <p className="text-xs text-gray-400">No active searches. Create a search when a client engagement begins.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-prism-border overflow-hidden">
                      {data.searches.map((s: any) => (
                        <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50">
                          <div className="flex-1"><div className="text-xs font-semibold text-navy">{s.role_title}</div><div className="text-[10px] text-gray-400">{s.reference} • {s.search_type}</div></div>
                          <Pill c={s.status === 'placed' ? 'green' : s.status === 'shortlist' ? 'gold' : 'blue'}>{s.status}</Pill>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ASSESSMENTS */}
              {pg === 'assessments' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Assessments <span className="text-sm font-normal text-gray-400">({data.assessments.length} completed)</span></h2>
                  {data.assessments.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <div className="text-3xl mb-3">◈</div>
                      <p className="text-sm text-gray-500 mb-2">No assessments completed yet</p>
                      <p className="text-xs text-gray-400">When someone completes an assessment on your platform, their scores will appear here in real-time.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-prism-border overflow-hidden">
                      {data.assessments.map((a: any) => (
                        <div key={a.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                          <div className="flex-1"><div className="text-xs font-semibold text-navy">{a.first_name} {a.last_name || a.email || '—'}</div><div className="text-[10px] text-gray-400">{a.tier} • {timeAgo(a.completed_at || a.created_at)}</div></div>
                          <span className="font-mono text-sm font-bold text-gold">{a.score_overall?.toFixed(1) || '—'}</span>
                          <Pill c="green">Complete</Pill>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* INVOICES */}
              {pg === 'invoices' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Invoices <span className="text-sm font-normal text-gray-400">({data.invoices.length})</span></h2>
                  {data.invoices.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <p className="text-xs text-gray-400">No invoices yet. Invoices will be created automatically via Stripe or manually for search fees.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-prism-border overflow-hidden">
                      {data.invoices.map((inv: any) => (
                        <div key={inv.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                          <div className="flex-1"><div className="text-xs font-semibold text-navy">{inv.invoice_number}</div><div className="text-[10px] text-gray-400">{inv.description}</div></div>
                          <span className="font-mono text-xs font-bold text-gold">€{((inv.total_cents || 0) / 100).toLocaleString()}</span>
                          <Pill c={inv.status === 'paid' ? 'green' : inv.status === 'overdue' ? 'red' : 'amber'}>{inv.status}</Pill>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITY */}
              {pg === 'activity' && (
                <div>
                  <h2 className="font-display text-xl font-bold text-navy mb-4">Activity Feed</h2>
                  {data.activities.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 border border-prism-border text-center">
                      <p className="text-xs text-gray-400">Activity will appear here as leads, assessments, and payments are processed.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl p-5 border border-prism-border">
                      {data.activities.map((a: any) => (
                        <div key={a.id} className="flex gap-3 py-3 border-b border-gray-50 last:border-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold mt-1.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-gray-700">{a.description}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(a.created_at)} • {a.type}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
