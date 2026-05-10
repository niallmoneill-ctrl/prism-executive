'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [pg, setPg] = useState('overview');
  const [sideOpen, setSideOpen] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState('');
  const [data, setData] = useState<any>({ leads:[], activities:[], orgs:[], candidates:[], searches:[], invoices:[], assessments:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const ch = supabase.channel('admin')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'activities'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'assessments'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'candidates'},()=>loadData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const loadData = async () => {
    const [leads,activities,orgs,candidates,searches,invoices,assessments] = await Promise.all([
      supabase.from('leads').select('*').order('created_at',{ascending:false}).limit(50),
      supabase.from('activities').select('*').order('created_at',{ascending:false}).limit(30),
      supabase.from('organisations').select('*').order('created_at',{ascending:false}),
      supabase.from('candidates').select('*').order('created_at',{ascending:false}),
      supabase.from('searches').select('*').order('created_at',{ascending:false}),
      supabase.from('invoices').select('*').order('created_at',{ascending:false}),
      supabase.from('assessments').select('*').eq('status','completed').order('created_at',{ascending:false}).limit(50),
    ]);
    setData({
      leads:leads.data||[], activities:activities.data||[], orgs:orgs.data||[],
      candidates:candidates.data||[], searches:searches.data||[], invoices:invoices.data||[],
      assessments:assessments.data||[],
    });
    setLoading(false);
  };

  const openDetail = (item: any, type: string) => { setDetail(item); setDetailType(type); };
  const closeDetail = () => { setDetail(null); setDetailType(''); };

  const NAV = [
    {id:'overview',label:'Overview',e:'◆'},{id:'leads',label:'Leads',e:'◎'},
    {id:'companies',label:'Companies',e:'◫'},{id:'candidates',label:'Candidates',e:'◉'},
    {id:'searches',label:'Searches',e:'◇'},{id:'assessments',label:'Assessments',e:'◈'},
    {id:'invoices',label:'Invoices',e:'▤'},{id:'activity',label:'Activity',e:'▥'},
  ];

  const timeAgo = (d: string) => {
    if (!d) return '—';
    const m = Math.floor((Date.now()-new Date(d).getTime())/60000);
    if (m<1) return 'Just now'; if (m<60) return `${m}m ago`; if (m<1440) return `${Math.floor(m/60)}h ago`; return `${Math.floor(m/1440)}d ago`;
  };

  const Pill = ({c,children}:{c:string;children:React.ReactNode}) => {
    const cls:Record<string,string> = {green:'bg-green-50 text-green-700',red:'bg-red-50 text-red-700',blue:'bg-blue-50 text-blue-700',amber:'bg-amber-50 text-amber-700',gold:'bg-amber-50 text-amber-800',purple:'bg-purple-50 text-purple-700'};
    return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cls[c]||cls.gold}`}><span className="w-1.5 h-1.5 rounded-full bg-current"/>{children}</span>;
  };

  const KPI = ({label,value,sub}:{label:string;value:string|number;sub?:string}) => (
    <div className="bg-white rounded-xl p-5 border border-[#E8E5DF] flex-1 min-w-[130px]">
      <div className="text-[9px] text-[#888] font-semibold tracking-wider uppercase mb-2">{label}</div>
      <div className="font-display text-2xl font-bold text-[#0F1D35]">{value}</div>
      {sub && <div className="text-[10px] text-[#B8975A] font-semibold mt-1">{sub}</div>}
    </div>
  );

  const Field = ({label,value}:{label:string;value:any}) => {
    if (!value && value !== 0) return null;
    return (
      <div className="py-2.5 border-b border-[#E8E5DF] last:border-0">
        <div className="text-[9px] text-[#888] font-semibold tracking-wider uppercase mb-0.5">{label}</div>
        <div className="text-sm text-[#333]">{String(value)}</div>
      </div>
    );
  };

  /* DETAIL DRAWER */
  const Drawer = () => {
    if (!detail) return null;
    return (
      <>
        <div onClick={closeDetail} className="fixed inset-0 bg-black/20 z-[199]"/>
        <div className="fixed top-0 right-0 w-[420px] max-w-[90vw] h-full bg-white border-l border-[#E8E5DF] z-[200] overflow-y-auto shadow-xl">
          <div className="sticky top-0 bg-white border-b border-[#E8E5DF] px-6 py-4 flex justify-between items-center z-10">
            <span className="text-[10px] text-[#888] font-semibold tracking-wider uppercase">{detailType} Detail</span>
            <button onClick={closeDetail} className="w-7 h-7 rounded-lg bg-[#F5F3EF] border border-[#E8E5DF] flex items-center justify-center text-[#888] text-sm cursor-pointer hover:bg-[#E8E5DF]">✕</button>
          </div>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#B8975A] to-[#96793F] flex items-center justify-center text-white text-sm font-bold">
                {(detail.first_name?.[0]||detail.name?.[0]||'?').toUpperCase()}{(detail.last_name?.[0]||'').toUpperCase()}
              </div>
              <div>
                <div className="font-display text-lg text-[#0F1D35] font-semibold">
                  {detail.first_name||detail.name||'—'} {detail.last_name||''}
                </div>
                <div className="text-xs text-[#888]">
                  {detail.job_title||detail.current_title||detail.role_hiring||detail.tier||''} {detail.company_name||detail.current_company||''}
                </div>
              </div>
            </div>

            {/* Score if assessment or candidate */}
            {(detail.score_overall || detail.prism_score) && (
              <div className="bg-[#0F1D35] rounded-xl p-5 mb-6">
                <div className="text-[9px] text-[#B8975A]/50 tracking-wider uppercase mb-2">Prism Score</div>
                <div className="font-display text-3xl text-white font-bold mb-3">{(detail.score_overall || detail.prism_score)?.toFixed?.(1) || detail.score_overall || detail.prism_score}/5.0</div>
                {detail.score_dopamine && (
                  <div className="space-y-2">
                    {[
                      {l:'Exploration',v:detail.score_dopamine,c:'#9B4D3A'},
                      {l:'Structure',v:detail.score_serotonin,c:'#3A5A8C'},
                      {l:'Drive',v:detail.score_testosterone,c:'#3A7052'},
                      {l:'Connection',v:detail.score_estrogen,c:'#6B4A7D'},
                    ].map(d => (
                      <div key={d.l} className="flex items-center gap-2">
                        <span className="text-[10px] text-white/50 w-20">{d.l}</span>
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${(Number(d.v||0)/5)*100}%`,background:d.c}}/>
                        </div>
                        <span className="font-mono text-[10px] text-white/70 w-6 text-right">{Number(d.v||0).toFixed(1)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lead score */}
            {detail.lead_score !== undefined && detail.lead_score !== null && (
              <div className="bg-[#F5F3EF] rounded-xl p-4 mb-6 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono text-lg font-bold ${
                  detail.lead_score >= 7 ? 'bg-red-50 text-red-700' : detail.lead_score >= 4 ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
                }`}>{detail.lead_score}</div>
                <div>
                  <div className="text-xs font-semibold text-[#333]">Lead Score</div>
                  <div className="text-[10px] text-[#888]">
                    {detail.lead_score >= 7 ? 'Hot — Contact within 2 hours' : detail.lead_score >= 4 ? 'Warm — Contact within 24 hours' : 'Nurture — Add to sequence'}
                  </div>
                </div>
              </div>
            )}

            {/* All fields */}
            <div className="bg-[#F5F3EF] rounded-xl p-5 mb-6">
              <div className="text-[9px] text-[#888] font-semibold tracking-wider uppercase mb-3">Contact</div>
              <Field label="Email" value={detail.email}/>
              <Field label="Phone" value={detail.phone}/>
              <Field label="LinkedIn" value={detail.linkedin_url}/>
              <Field label="Location" value={detail.location}/>
            </div>

            <div className="bg-[#F5F3EF] rounded-xl p-5 mb-6">
              <div className="text-[9px] text-[#888] font-semibold tracking-wider uppercase mb-3">Professional</div>
              <Field label="Job Title" value={detail.job_title||detail.current_title||detail.role_hiring}/>
              <Field label="Company" value={detail.company_name||detail.current_company}/>
              <Field label="Industry" value={detail.industry}/>
              <Field label="Seniority" value={detail.seniority}/>
              <Field label="Experience" value={detail.years_experience||detail.experience}/>
              <Field label="Qualification" value={detail.qualification}/>
              <Field label="Company Size" value={detail.company_size}/>
            </div>

            {/* Lead-specific fields */}
            {detailType === 'Lead' && (
              <div className="bg-[#F5F3EF] rounded-xl p-5 mb-6">
                <div className="text-[9px] text-[#888] font-semibold tracking-wider uppercase mb-3">Hiring Context</div>
                <Field label="Role Hiring" value={detail.role_hiring}/>
                <Field label="Urgency" value={detail.urgency}/>
                <Field label="Challenge" value={detail.challenge}/>
                <Field label="Source" value={detail.source}/>
                <Field label="Tool Used" value={detail.tool_used}/>
                <Field label="Status" value={detail.status}/>
              </div>
            )}

            {/* Assessment-specific */}
            {detailType === 'Assessment' && (
              <div className="bg-[#F5F3EF] rounded-xl p-5 mb-6">
                <div className="text-[9px] text-[#888] font-semibold tracking-wider uppercase mb-3">Assessment Details</div>
                <Field label="Tier" value={detail.tier}/>
                <Field label="Questions Answered" value={detail.questions_answered}/>
                <Field label="Duration" value={detail.duration_seconds ? `${Math.round(detail.duration_seconds/60)} minutes` : null}/>
                <Field label="Completed" value={detail.completed_at ? new Date(detail.completed_at).toLocaleString('en-IE') : null}/>
                <Field label="Valid" value={detail.validity_flag ? 'Yes' : 'Flagged'}/>
              </div>
            )}

            <div className="text-[9px] text-[#888] mt-4">
              Created: {detail.created_at ? new Date(detail.created_at).toLocaleString('en-IE') : '—'}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-6 flex-wrap">
              {detail.email && (
                <a href={`mailto:${detail.email}`} className="px-4 py-2 bg-[#B8975A] text-white rounded-lg text-xs font-medium hover:bg-[#96793F] transition-colors">
                  Email
                </a>
              )}
              {detail.phone && (
                <a href={`tel:${detail.phone}`} className="px-4 py-2 border border-[#E8E5DF] rounded-lg text-xs font-medium text-[#333] hover:bg-[#F5F3EF] transition-colors">
                  Call
                </a>
              )}
              {detail.linkedin_url && (
                <a href={detail.linkedin_url} target="_blank" className="px-4 py-2 border border-[#E8E5DF] rounded-lg text-xs font-medium text-[#333] hover:bg-[#F5F3EF] transition-colors">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#F5F3EF] text-[#333] overflow-hidden">
      {/* Sidebar */}
      <div className={`${sideOpen?'w-52':'w-14'} flex-shrink-0 bg-[#0F1D35] flex flex-col border-r border-white/5 transition-all duration-200 overflow-hidden`}>
        <div onClick={()=>setSideOpen(!sideOpen)} className="p-4 flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 bg-gradient-to-br from-[#B8975A] to-[#96793F] rounded-md flex items-center justify-center font-display text-base font-bold text-[#0F1D35] flex-shrink-0">P</div>
          {sideOpen&&<div><div className="text-[#B8975A] font-display font-bold text-xs tracking-[0.15em]">PRISM</div><div className="text-white/25 text-[7px] tracking-wider">ADMIN</div></div>}
        </div>
        <div className="flex-1 px-2 space-y-0.5">
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setPg(n.id)} title={sideOpen?undefined:n.label}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${pg===n.id?'bg-[#B8975A]/10 text-[#B8975A] font-semibold':'text-white/50 hover:bg-white/5'} ${sideOpen?'':'justify-center'}`}>
              <span className="text-sm flex-shrink-0">{n.e}</span>
              {sideOpen&&<span>{n.label}</span>}
              {n.id==='leads'&&data.leads.filter((l:any)=>l.status==='new').length>0&&(
                <span className="ml-auto w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {data.leads.filter((l:any)=>l.status==='new').length}
                </span>
              )}
            </button>
          ))}
        </div>
        {sideOpen&&(
          <div className="p-3 border-t border-white/5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#B8975A] to-[#96793F] flex items-center justify-center text-[10px] font-bold text-[#0F1D35]">OB</div>
            <div><div className="text-white text-[11px] font-semibold">Orla Brennan</div><div className="text-white/30 text-[9px]">CEO</div></div>
          </div>
        )}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="h-12 px-5 flex items-center justify-between border-b border-[#E8E5DF] bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={()=>setSideOpen(!sideOpen)} className="text-[#888] text-base">☰</button>
            <span className="text-xs text-[#888] font-medium">{NAV.find(n=>n.id===pg)?.label||'Overview'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/" className="text-[10px] text-[#888] hover:text-[#B8975A]">← Site</Link>
            <div className="w-2 h-2 rounded-full bg-green-500"/>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-[#888]">Loading...</div>
          ) : (
            <>
              {/* OVERVIEW */}
              {pg==='overview'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Command Centre</h2>
                  <div className="flex gap-3 mb-6 flex-wrap">
                    <KPI label="Leads" value={data.leads.length} sub={`${data.leads.filter((l:any)=>l.status==='new').length} new`}/>
                    <KPI label="Companies" value={data.orgs.length}/>
                    <KPI label="Candidates" value={data.candidates.length}/>
                    <KPI label="Searches" value={data.searches.length}/>
                    <KPI label="Assessments" value={data.assessments.length}/>
                  </div>
                  <div className="bg-white rounded-xl p-5 border border-[#E8E5DF]">
                    <h3 className="text-sm font-bold text-[#0F1D35] mb-3">Recent Activity</h3>
                    {data.activities.length===0?(
                      <p className="text-xs text-[#888] py-8 text-center">No activity yet.</p>
                    ):data.activities.slice(0,12).map((a:any)=>(
                      <div key={a.id} className="flex gap-2.5 py-2.5 border-b border-[#F5F3EF] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B8975A] mt-1.5 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[#333] truncate">{a.description}</div>
                          <div className="text-[10px] text-[#888]">{timeAgo(a.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEADS */}
              {pg==='leads'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Leads <span className="text-sm font-normal text-[#888]">({data.leads.length})</span></h2>
                  {data.leads.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center">
                      <p className="text-sm text-[#888] mb-2">No leads yet</p>
                      <p className="text-xs text-[#888]">Leads appear when employers use the hiring tools or individuals complete assessments.</p>
                    </div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.leads.map((l:any)=>(
                        <div key={l.id} onClick={()=>openDetail(l,'Lead')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer transition-colors">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${l.lead_score>=7?'bg-red-50 text-red-700':l.lead_score>=4?'bg-amber-50 text-amber-700':'bg-gray-50 text-gray-500'}`}>
                            {l.lead_score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#0F1D35]">{l.first_name} {l.last_name||''}</div>
                            <div className="text-[11px] text-[#888]">{l.company_name||'—'} · {l.industry||'—'} · {l.tool_used||'website'}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Pill c={l.status==='new'?'red':l.status==='contacted'?'blue':'green'}>{l.status}</Pill>
                            <div className="text-[9px] text-[#888] mt-1">{timeAgo(l.created_at)}</div>
                          </div>
                          <span className="text-[#888] text-xs ml-2">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CANDIDATES */}
              {pg==='candidates'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Candidates <span className="text-sm font-normal text-[#888]">({data.candidates.length})</span></h2>
                  {data.candidates.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center">
                      <p className="text-xs text-[#888]">Candidates are created when someone completes an assessment with their profile details.</p>
                    </div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.candidates.map((c:any)=>(
                        <div key={c.id} onClick={()=>openDetail(c,'Candidate')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#B8975A] to-[#96793F] flex items-center justify-center text-white text-[11px] font-bold">
                            {c.first_name?.[0]||''}{c.last_name?.[0]||''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#0F1D35]">{c.first_name} {c.last_name}</div>
                            <div className="text-[11px] text-[#888]">{c.current_title||'—'} · {c.current_company||'—'} · {c.industry||'—'}</div>
                          </div>
                          {c.prism_score&&<span className="font-mono text-sm font-bold text-[#B8975A]">{Number(c.prism_score).toFixed(1)}</span>}
                          <span className="text-[#888] text-xs ml-2">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ASSESSMENTS */}
              {pg==='assessments'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Assessments <span className="text-sm font-normal text-[#888]">({data.assessments.length})</span></h2>
                  {data.assessments.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center">
                      <p className="text-xs text-[#888]">No assessments completed yet.</p>
                    </div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.assessments.map((a:any)=>(
                        <div key={a.id} onClick={()=>openDetail(a,'Assessment')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-[#F5F3EF] flex items-center justify-center text-[11px] font-bold text-[#0F1D35]">
                            {a.first_name?.[0]||'?'}{a.last_name?.[0]||''}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#0F1D35]">{a.first_name||'Anonymous'} {a.last_name||''}</div>
                            <div className="text-[11px] text-[#888]">{a.email||'No email'} · {a.tier} · {timeAgo(a.completed_at||a.created_at)}</div>
                          </div>
                          <span className="font-mono text-sm font-bold text-[#B8975A]">{a.score_overall ? Number(a.score_overall).toFixed(1) : '—'}</span>
                          <Pill c="green">Complete</Pill>
                          <span className="text-[#888] text-xs ml-1">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* COMPANIES */}
              {pg==='companies'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Companies <span className="text-sm font-normal text-[#888]">({data.orgs.length})</span></h2>
                  {data.orgs.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No companies yet.</p></div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.orgs.map((o:any)=>(
                        <div key={o.id} onClick={()=>openDetail(o,'Company')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer">
                          <div className="flex-1"><div className="text-sm font-semibold text-[#0F1D35]">{o.name}</div><div className="text-[11px] text-[#888]">{o.industry||'—'}</div></div>
                          <Pill c={o.tier==='retained'?'gold':'blue'}>{o.tier||'prospect'}</Pill>
                          <span className="text-[#888] text-xs">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SEARCHES */}
              {pg==='searches'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Searches <span className="text-sm font-normal text-[#888]">({data.searches.length})</span></h2>
                  {data.searches.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No active searches.</p></div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.searches.map((s:any)=>(
                        <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF]">
                          <div className="flex-1"><div className="text-sm font-semibold text-[#0F1D35]">{s.role_title}</div><div className="text-[11px] text-[#888]">{s.reference} · {s.search_type}</div></div>
                          <Pill c={s.status==='placed'?'green':s.status==='shortlist'?'gold':'blue'}>{s.status}</Pill>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* INVOICES */}
              {pg==='invoices'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Invoices <span className="text-sm font-normal text-[#888]">({data.invoices.length})</span></h2>
                  {data.invoices.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No invoices yet.</p></div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.invoices.map((inv:any)=>(
                        <div key={inv.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF]">
                          <div className="flex-1"><div className="text-sm font-semibold text-[#0F1D35]">{inv.invoice_number}</div><div className="text-[11px] text-[#888]">{inv.description}</div></div>
                          <span className="font-mono text-xs font-bold text-[#B8975A]">€{((inv.total_cents||0)/100).toLocaleString()}</span>
                          <Pill c={inv.status==='paid'?'green':inv.status==='overdue'?'red':'amber'}>{inv.status}</Pill>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVITY */}
              {pg==='activity'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Activity Feed</h2>
                  <div className="bg-white rounded-xl p-5 border border-[#E8E5DF]">
                    {data.activities.map((a:any)=>(
                      <div key={a.id} className="flex gap-3 py-3 border-b border-[#F5F3EF] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B8975A] mt-1.5 flex-shrink-0"/>
                        <div>
                          <div className="text-xs text-[#333]">{a.description}</div>
                          <div className="text-[10px] text-[#888] mt-0.5">{timeAgo(a.created_at)} · {a.type?.replace(/_/g,' ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <Drawer/>
    </div>
  );
}
