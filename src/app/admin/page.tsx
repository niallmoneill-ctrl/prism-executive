'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const LEAD_STATUSES = ['new','contacted','qualified','proposal','negotiation','won','lost','nurturing'] as const;
const STATUS_COLORS: Record<string,string> = {new:'red',contacted:'blue',qualified:'amber',proposal:'purple',negotiation:'purple',won:'green',lost:'red',nurturing:'blue'};

export default function AdminPage() {
  const [pg, setPg] = useState('overview');
  const [sideOpen, setSideOpen] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [detailType, setDetailType] = useState('');
  const [noteText, setNoteText] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>({ leads:[], activities:[], orgs:[], candidates:[], searches:[], invoices:[], assessments:[] });
  const [loading, setLoading] = useState(true);
  const [leadFilter, setLeadFilter] = useState<'all'|'individual'|'company'>('all');

  useEffect(() => {
    loadData();
    const ch = supabase.channel('admin')
      .on('postgres_changes',{event:'*',schema:'public',table:'leads'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'activities'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'assessments'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'candidates'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'organisations'},()=>loadData())
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
    setData({ leads:leads.data||[], activities:activities.data||[], orgs:orgs.data||[], candidates:candidates.data||[], searches:searches.data||[], invoices:invoices.data||[], assessments:assessments.data||[] });
    setLoading(false);
  };

  const openDetail = (item: any, type: string) => {
    setDetail(item); setDetailType(type);
    setNoteText(''); setNextAction(item.next_action||''); setNextDate(item.next_action_date||'');
  };
  const closeDetail = () => { setDetail(null); setDetailType(''); };

  const updateLeadStatus = async (newStatus: string) => {
    setSaving(true);
    await supabase.from('leads').update({ status: newStatus }).eq('id', detail.id);
    await supabase.from('activities').insert({
      type: 'status_changed',
      description: `Lead ${detail.first_name} ${detail.last_name||''} status → ${newStatus}`,
      actor_name: 'Orla Brennan', lead_id: detail.id,
      metadata: { from: detail.status, to: newStatus },
    });
    setDetail({ ...detail, status: newStatus });
    setSaving(false);
    loadData();
  };

  const saveNextAction = async () => {
    setSaving(true);
    await supabase.from('leads').update({ next_action: nextAction, next_action_date: nextDate || null }).eq('id', detail.id);
    setDetail({ ...detail, next_action: nextAction, next_action_date: nextDate });
    setSaving(false);
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    await supabase.from('leads').update({
      notes: detail.notes ? `${detail.notes}\n\n[${new Date().toLocaleDateString('en-IE')}] ${noteText}` : `[${new Date().toLocaleDateString('en-IE')}] ${noteText}`
    }).eq('id', detail.id);
    await supabase.from('activities').insert({
      type: 'note_added',
      description: `Note on ${detail.first_name} ${detail.last_name||''}: ${noteText.slice(0,80)}`,
      actor_name: 'Orla Brennan', lead_id: detail.id,
    });
    setDetail({ ...detail, notes: detail.notes ? `${detail.notes}\n\n[${new Date().toLocaleDateString('en-IE')}] ${noteText}` : `[${new Date().toLocaleDateString('en-IE')}] ${noteText}` });
    setNoteText('');
    setSaving(false);
    loadData();
  };

  const convertToCompany = async () => {
    if (!detail.company_name) { alert('No company name on this lead'); return; }
    setSaving(true);
    const validIndustries = ['healthcare','pharma','finance','construction','solar','engineering','professional_services','fmcg','ict','not_for_profit','other'];
    let ind = detail.industry ? String(detail.industry).toLowerCase().replace(/[&\s]+/g,'_').replace(/_+/g,'_') : null;
    if (ind && !validIndustries.includes(ind)) ind = 'other';
    const { data: org, error } = await supabase.from('organisations').insert({
      name: detail.company_name, industry: ind, company_size: detail.company_size,
      website: detail.website, tier: 'prospect', source: detail.source,
    }).select().single();
    if (org) {
      await supabase.from('leads').update({ status: 'won', converted_to_org_id: org.id, converted_at: new Date().toISOString() }).eq('id', detail.id);
      await supabase.from('contacts').insert({
        organisation_id: org.id, first_name: detail.first_name, last_name: detail.last_name,
        email: detail.email, phone: detail.phone, job_title: detail.job_title, is_primary: true, is_decision_maker: true,
      });
      await supabase.from('activities').insert({
        type: 'lead_created', description: `Lead converted to company: ${detail.company_name}`,
        actor_name: 'Orla Brennan', lead_id: detail.id, organisation_id: org.id,
      });
      setDetail({ ...detail, status: 'won', converted_to_org_id: org.id });
      alert(`${detail.company_name} created as a company with ${detail.first_name} as primary contact.`);
    } else {
      alert('Error: ' + (error?.message || 'Unknown'));
    }
    setSaving(false);
    loadData();
  };

  const convertToCandidate = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from('candidates').select('id').eq('email', detail.email).maybeSingle();
    if (existing) { alert('Candidate already exists with this email.'); setSaving(false); return; }
    const validIndustries = ['healthcare','pharma','finance','construction','solar','engineering','professional_services','fmcg','ict','not_for_profit','other'];
    let ind = detail.industry ? String(detail.industry).toLowerCase().replace(/[&\s]+/g,'_').replace(/_+/g,'_') : null;
    if (ind && !validIndustries.includes(ind)) ind = 'other';
    const { data: cand } = await supabase.from('candidates').insert({
      first_name: detail.first_name, last_name: detail.last_name || '',
      email: detail.email, phone: detail.phone,
      current_title: detail.job_title || detail.role_hiring, industry: ind,
      source: detail.source || 'website', is_active: true,
      gdpr_consent: true, gdpr_consent_date: new Date().toISOString(),
    }).select().single();
    if (cand) {
      await supabase.from('activities').insert({
        type: 'candidate_added', description: `Lead ${detail.first_name} ${detail.last_name||''} converted to candidate`,
        actor_name: 'Orla Brennan', lead_id: detail.id, candidate_id: cand.id,
      });
      alert(`${detail.first_name} added as a candidate.`);
    }
    setSaving(false);
    loadData();
  };

  const NAV = [
    {id:'overview',label:'Overview',e:'◆'},{id:'leads',label:'Leads',e:'◎'},
    {id:'companies',label:'Companies',e:'◫'},{id:'candidates',label:'Candidates',e:'◉'},
    {id:'searches',label:'Searches',e:'◇'},{id:'assessments',label:'Assessments',e:'◈'},
    {id:'invoices',label:'Invoices',e:'▤'},{id:'activity',label:'Activity',e:'▥'},{id:'skills',label:'Skills',e:'◑'},{id:'skills',label:'Skills',e:'◑'},
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

  // ── Redesigned Field: readable label + value with proper hierarchy ──
  const Field = ({label,value,mono}:{label:string;value:any;mono?:boolean}) => {
    if (!value && value !== 0) return null;
    return (
      <div className="flex items-start justify-between gap-4 py-3 border-b border-[#EDEAE4] last:border-0">
        <span className="text-xs text-[#999] font-medium w-28 flex-shrink-0 pt-0.5">{label}</span>
        <span className={`text-sm text-[#1A1A1A] text-right flex-1 leading-snug ${mono ? 'font-mono' : ''}`}>{String(value)}</span>
      </div>
    );
  };

  // ── Section header inside drawer ──
  const SectionHead = ({title, icon}:{title:string;icon?:string}) => (
    <div className="flex items-center gap-2 mb-3 mt-1">
      {icon && <span className="text-[#B8975A] text-sm">{icon}</span>}
      <span className="text-xs font-semibold tracking-[0.12em] uppercase text-[#555]">{title}</span>
      <div className="flex-1 h-px bg-[#EDEAE4] ml-1"/>
    </div>
  );

  const filteredLeads = data.leads.filter((l: any) => {
    if (leadFilter === 'company') return l.company_name && l.company_name.trim() !== '';
    if (leadFilter === 'individual') return !l.company_name || l.company_name.trim() === '';
    return true;
  });

  /* ═══ DETAIL DRAWER — wider, readable, refined ═══ */
  const Drawer = () => {
    if (!detail) return null;
    const isLead = detailType === 'Lead';
    const isCompany = !!(detail.company_name && detail.company_name.trim());
    const currentIdx = LEAD_STATUSES.indexOf(detail.status);

    const PIPELINE = LEAD_STATUSES.filter(s => s !== 'lost');
    const PIPELINE_LABELS: Record<string,string> = {
      new:'New', contacted:'Contacted', qualified:'Qualified',
      proposal:'Proposal', negotiation:'Negotiation', won:'Won', nurturing:'Nurturing',
    };

    return (
      <>
        <div onClick={closeDetail} className="fixed inset-0 bg-black/25 z-[199] backdrop-blur-[1px]"/>

        {/* Drawer — 620px wide, full height, clean design */}
        <div className="fixed top-0 right-0 w-[620px] max-w-[95vw] h-full bg-white border-l border-[#E0DDD7] z-[200] overflow-y-auto flex flex-col shadow-2xl">

          {/* ── Sticky Header ── */}
          <div className="sticky top-0 bg-white border-b border-[#E0DDD7] px-7 py-4 flex justify-between items-center z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold tracking-[0.15em] uppercase text-[#888]">{detailType}</span>
              {isLead && (
                <Pill c={isCompany ? 'purple' : 'blue'}>{isCompany ? 'Company' : 'Individual'}</Pill>
              )}
            </div>
            <button onClick={closeDetail}
              className="w-8 h-8 rounded-lg bg-[#F5F3EF] border border-[#E0DDD7] flex items-center justify-center text-[#666] hover:bg-[#E8E5DF] text-sm transition-colors">
              ✕
            </button>
          </div>

          <div className="p-7 flex-1">

            {/* ── Identity Header ── */}
            <div className="flex items-center gap-4 mb-7 pb-6 border-b border-[#EDEAE4]">
              <div className="w-14 h-14 rounded-xl bg-[#0F1D35] flex items-center justify-center text-white text-lg font-bold flex-shrink-0 tracking-wide">
                {(detail.first_name?.[0]||detail.name?.[0]||'?').toUpperCase()}{(detail.last_name?.[0]||'').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl text-[#0F1D35] font-semibold leading-tight">
                  {detail.first_name||detail.name||'—'} {detail.last_name||''}
                </h2>
                <p className="text-sm text-[#666] mt-0.5 truncate">
                  {detail.job_title||detail.current_title||detail.role_hiring||''}
                  {(detail.company_name||detail.current_company) ? ` · ${detail.company_name||detail.current_company}` : ''}
                </p>
              </div>
              {/* Quick action buttons top-right */}
              <div className="flex gap-2 flex-shrink-0">
                {detail.email && (
                  <a href={`mailto:${detail.email}`}
                    className="px-3 py-2 bg-[#B8975A] text-white rounded-lg text-xs font-medium hover:bg-[#96793F] transition-colors">
                    Email
                  </a>
                )}
                {detail.phone && (
                  <a href={`tel:${detail.phone}`}
                    className="px-3 py-2 border border-[#E0DDD7] rounded-lg text-xs font-medium text-[#333] hover:bg-[#F5F3EF] transition-colors">
                    Call
                  </a>
                )}
              </div>
            </div>

            {/* ── STATUS PIPELINE ── */}
            {isLead && (
              <div className="mb-7">
                <SectionHead title="Status Pipeline"/>
                <div className="grid grid-cols-7 gap-1.5 mb-3">
                  {PIPELINE.map((s, i) => (
                    <button key={s} onClick={() => updateLeadStatus(s)} disabled={saving}
                      className={`py-2.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all text-center ${
                        detail.status === s
                          ? 'bg-[#B8975A] text-white shadow-sm'
                          : i <= currentIdx
                            ? 'bg-[#B8975A]/15 text-[#B8975A] hover:bg-[#B8975A]/25'
                            : 'bg-[#F5F3EF] text-[#999] hover:bg-[#EDEAE4] hover:text-[#555]'
                      }`}>
                      {PIPELINE_LABELS[s]}
                    </button>
                  ))}
                </div>
                {detail.status !== 'lost' && (
                  <button onClick={() => updateLeadStatus('lost')} disabled={saving}
                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
                    Mark as Lost
                  </button>
                )}
              </div>
            )}

            {/* ── LEAD SCORE ── */}
            {detail.lead_score !== undefined && detail.lead_score !== null && (
              <div className="mb-7">
                <SectionHead title="Lead Score"/>
                <div className="flex items-center gap-5 bg-[#F5F3EF] rounded-xl p-5">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-mono text-2xl font-bold flex-shrink-0 ${
                    detail.lead_score >= 7 ? 'bg-red-50 text-red-700 border border-red-200' :
                    detail.lead_score >= 4 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-white text-[#888] border border-[#E0DDD7]'
                  }`}>{detail.lead_score}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A1A] mb-0.5">
                      {detail.lead_score >= 7 ? 'Hot Lead' : detail.lead_score >= 4 ? 'Warm Lead' : 'Nurture'}
                    </p>
                    <p className="text-xs text-[#888] leading-relaxed">
                      {detail.lead_score >= 7 ? 'Contact within 2 hours' :
                       detail.lead_score >= 4 ? 'Contact within 24 hours' :
                       'Add to nurture sequence'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── PRISM SCORE ── */}
            {(detail.score_overall || detail.prism_score) && (
              <div className="mb-7">
                <SectionHead title="Prism Behavioural Score"/>
                <div className="bg-[#0F1D35] rounded-xl p-6">
                  <div className="flex items-baseline gap-2 mb-5">
                    <span className="font-display text-4xl text-white font-bold">
                      {Number(detail.score_overall||detail.prism_score).toFixed(1)}
                    </span>
                    <span className="text-white/30 text-lg">/5.0</span>
                    <span className="ml-auto text-[#B8975A] text-xs tracking-widest uppercase font-semibold">
                      {detail.tier || 'Explorer'}
                    </span>
                  </div>
                  {detail.score_dopamine && (
                    <div className="space-y-3">
                      {[
                        {l:'Exploration & Innovation', v:detail.score_dopamine,     c:'#B8975A'},
                        {l:'Structure & Planning',     v:detail.score_serotonin,    c:'#4A7C9E'},
                        {l:'Drive & Assertiveness',    v:detail.score_testosterone, c:'#8B4A4A'},
                        {l:'Connection & Empathy',     v:detail.score_estrogen,     c:'#4A8B6F'},
                      ].map(d => (
                        <div key={d.l}>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-white/60">{d.l}</span>
                            <span className="font-mono text-xs text-white/80 font-semibold">{Number(d.v||0).toFixed(1)}</span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{width:`${(Number(d.v||0)/5)*100}%`, background:d.c}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── CONTACT ── */}
            <div className="mb-7">
              <SectionHead title="Contact"/>
              <div className="bg-[#F5F3EF] rounded-xl px-5 py-1">
                <Field label="Email"    value={detail.email}/>
                <Field label="Phone"    value={detail.phone}/>
                <Field label="LinkedIn" value={detail.linkedin_url}/>
                <Field label="Location" value={detail.location}/>
              </div>
            </div>

            {/* ── PROFESSIONAL ── */}
            <div className="mb-7">
              <SectionHead title="Professional"/>
              <div className="bg-[#F5F3EF] rounded-xl px-5 py-1">
                <Field label="Title"        value={detail.job_title||detail.current_title||detail.role_hiring}/>
                <Field label="Company"      value={detail.company_name||detail.current_company}/>
                <Field label="Industry"     value={detail.industry}/>
                <Field label="Seniority"    value={detail.seniority}/>
                <Field label="Company Size" value={detail.company_size}/>
              </div>
            </div>

            {/* ── HIRING CONTEXT ── */}
            {isLead && (detail.role_hiring || detail.urgency || detail.challenge) && (
              <div className="mb-7">
                <SectionHead title="Hiring Context"/>
                <div className="bg-[#F5F3EF] rounded-xl px-5 py-1">
                  <Field label="Role Hiring" value={detail.role_hiring}/>
                  <Field label="Urgency"     value={detail.urgency}/>
                  <Field label="Challenge"   value={detail.challenge}/>
                  <Field label="Source"      value={detail.source}/>
                  <Field label="Tool Used"   value={detail.tool_used}/>
                </div>
              </div>
            )}

            {/* ── ASSESSMENT DETAILS ── */}
            {detailType === 'Assessment' && (
              <div className="mb-7">
                <SectionHead title="Assessment Details"/>
                <div className="bg-[#F5F3EF] rounded-xl px-5 py-1">
                  <Field label="Tier"       value={detail.tier}/>
                  <Field label="Questions"  value={detail.questions_answered}/>
                  <Field label="Duration"   value={detail.duration_seconds ? `${Math.round(detail.duration_seconds/60)} min` : null}/>
                  <Field label="Completed"  value={detail.completed_at ? new Date(detail.completed_at).toLocaleString('en-IE') : null}/>
                  <Field label="Validity"   value={detail.validity_flag ? 'Valid' : 'Flagged'}/>
                </div>
              </div>
            )}

            {/* ── NEXT ACTION ── */}
            {isLead && (
              <div className="mb-7">
                <SectionHead title="Next Action"/>
                <div className="bg-[#F5F3EF] rounded-xl p-5 space-y-3">
                  <input value={nextAction} onChange={e => setNextAction(e.target.value)}
                    placeholder="e.g. Call to discuss CFO search requirements"
                    className="w-full px-4 py-2.5 rounded-lg border border-[#E0DDD7] text-sm outline-none focus:border-[#B8975A] bg-white placeholder:text-[#bbb]"/>
                  <div className="flex gap-2">
                    <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-[#E0DDD7] text-sm outline-none focus:border-[#B8975A] bg-white"/>
                    <button onClick={saveNextAction} disabled={saving}
                      className="px-5 py-2.5 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] disabled:opacity-40 transition-colors tracking-wide">
                      Save
                    </button>
                  </div>
                  {detail.next_action && (
                    <p className="text-xs text-[#888]">Current: <span className="text-[#333] font-medium">{detail.next_action}</span>
                      {detail.next_action_date && <span className="text-[#B8975A]"> · {new Date(detail.next_action_date).toLocaleDateString('en-IE')}</span>}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── NOTES ── */}
            {isLead && (
              <div className="mb-7">
                <SectionHead title="Notes"/>
                <div className="bg-[#F5F3EF] rounded-xl p-5 space-y-3">
                  {detail.notes && (
                    <div className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap p-4 bg-white rounded-lg border border-[#E0DDD7] max-h-48 overflow-y-auto">
                      {detail.notes}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={noteText} onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note…"
                      onKeyDown={e => { if (e.key === 'Enter' && noteText.trim()) saveNote(); }}
                      className="flex-1 px-4 py-2.5 rounded-lg border border-[#E0DDD7] text-sm outline-none focus:border-[#B8975A] bg-white placeholder:text-[#bbb]"/>
                    <button onClick={saveNote} disabled={saving || !noteText.trim()}
                      className="px-5 py-2.5 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] disabled:opacity-40 transition-colors tracking-wide">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── LINKEDIN ── */}
            {detail.linkedin_url && (
              <div className="mb-7">
                <a href={detail.linkedin_url.startsWith('http') ? detail.linkedin_url : `https://${detail.linkedin_url}`}
                  target="_blank"
                  className="flex items-center gap-3 px-5 py-3.5 border border-[#E0DDD7] rounded-xl text-sm text-[#333] hover:bg-[#F5F3EF] hover:border-[#B8975A] transition-colors group">
                  <span className="text-[#0077B5] font-bold text-base">in</span>
                  <span className="flex-1 text-xs text-[#888] truncate group-hover:text-[#333]">{detail.linkedin_url}</span>
                  <span className="text-[#ccc] text-xs">↗</span>
                </a>
              </div>
            )}

            {/* ── CONVERT LEAD ── */}
            {isLead && detail.status !== 'won' && (
              <div className="mb-7">
                <SectionHead title="Convert Lead"/>
                <div className="flex gap-3">
                  {isCompany && !detail.converted_to_org_id && (
                    <button onClick={convertToCompany} disabled={saving}
                      className="flex-1 px-4 py-3 bg-[#0F1D35] text-white rounded-xl text-xs font-semibold hover:bg-[#1A2D4D] disabled:opacity-40 transition-colors tracking-wide">
                      Convert to Company
                    </button>
                  )}
                  <button onClick={convertToCandidate} disabled={saving}
                    className="flex-1 px-4 py-3 border-2 border-[#0F1D35] text-[#0F1D35] rounded-xl text-xs font-semibold hover:bg-[#F5F3EF] disabled:opacity-40 transition-colors tracking-wide">
                    Convert to Candidate
                  </button>
                </div>
                {detail.converted_to_org_id && (
                  <p className="text-xs text-green-600 mt-2 font-medium">Already converted to company</p>
                )}
              </div>
            )}

            {/* ── META ── */}
            <div className="pt-4 border-t border-[#EDEAE4] text-xs text-[#aaa]">
              Created {detail.created_at ? new Date(detail.created_at).toLocaleString('en-IE') : '—'}
              {detail.converted_at && <span> · Converted {new Date(detail.converted_at).toLocaleString('en-IE')}</span>}
              {detail.id && <span className="ml-2 font-mono text-[10px]">#{detail.id.slice(0,8)}</span>}
            </div>

          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#F5F3EF] text-[#333] overflow-hidden">
      {/* Sidebar — unchanged */}
      <div className={`${sideOpen?'w-52':'w-14'} flex-shrink-0 bg-[#0F1D35] flex flex-col border-r border-white/5 transition-all duration-200 overflow-hidden`}>
        <div onClick={()=>setSideOpen(!sideOpen)} className="p-4 flex items-center gap-2.5 cursor-pointer">
          <div className="w-8 h-8 bg-gradient-to-br from-[#B8975A] to-[#96793F] rounded-md flex items-center justify-center font-display text-base font-bold text-[#0F1D35] flex-shrink-0">P</div>
          {sideOpen&&<div><div className="text-[#B8975A] font-display font-bold text-xs tracking-[0.15em]">PRISM</div><div className="text-white/25 text-[7px] tracking-wider">ADMIN</div></div>}
        </div>
        <div className="flex-1 px-2 space-y-0.5">
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{ if(n.id==='skills'){ window.location.href='/admin/skills'; } else { setPg(n.id); } }} title={sideOpen?undefined:n.label}
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

      {/* Main — unchanged */}
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
            <div className="flex items-center justify-center h-64 text-[#888]">Loading…</div>
          ) : (
            <>
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
                    ):data.activities.slice(0,15).map((a:any)=>(
                      <div key={a.id} className="flex gap-2.5 py-2.5 border-b border-[#F5F3EF] last:border-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#B8975A] mt-1.5 flex-shrink-0"/>
                        <div className="flex-1 min-w-0"><div className="text-xs text-[#333] truncate">{a.description}</div><div className="text-[10px] text-[#888]">{timeAgo(a.created_at)}</div></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pg==='leads'&&(
                <div>
                  <div className="flex justify-between items-end mb-5">
                    <h2 className="font-display text-xl font-bold text-[#0F1D35]">Leads <span className="text-sm font-normal text-[#888]">({filteredLeads.length})</span></h2>
                    <div className="flex gap-1 bg-white rounded-lg border border-[#E8E5DF] p-0.5">
                      {([['all','All'],['individual','Individual'],['company','Company']] as const).map(([k,l]) => (
                        <button key={k} onClick={()=>setLeadFilter(k)}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${leadFilter===k?'bg-[#B8975A]/10 text-[#B8975A]':'text-[#888] hover:bg-[#F5F3EF]'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {filteredLeads.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center">
                      <p className="text-xs text-[#888]">No leads match this filter.</p>
                    </div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {filteredLeads.map((l:any)=>(
                        <div key={l.id} onClick={()=>openDetail(l,'Lead')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer transition-colors">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${l.lead_score>=7?'bg-red-50 text-red-700':l.lead_score>=4?'bg-amber-50 text-amber-700':'bg-gray-50 text-gray-500'}`}>
                            {l.lead_score}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#0F1D35]">{l.first_name} {l.last_name||''}</div>
                            <div className="text-[11px] text-[#888]">{l.company_name||'Individual'} · {l.industry||'—'} · {l.tool_used||'website'}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <Pill c={STATUS_COLORS[l.status]||'gold'}>{l.status}</Pill>
                            <div className="text-[9px] text-[#888] mt-1">{timeAgo(l.created_at)}</div>
                          </div>
                          <span className="text-[#ccc] text-xs ml-1">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pg==='candidates'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Candidates <span className="text-sm font-normal text-[#888]">({data.candidates.length})</span></h2>
                  {data.candidates.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">Candidates appear when assessments are completed or leads are converted.</p></div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.candidates.map((c:any)=>(
                        <div key={c.id} onClick={()=>openDetail(c,'Candidate')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#B8975A] to-[#96793F] flex items-center justify-center text-white text-[11px] font-bold">{c.first_name?.[0]||''}{c.last_name?.[0]||''}</div>
                          <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#0F1D35]">{c.first_name} {c.last_name}</div><div className="text-[11px] text-[#888]">{c.current_title||'—'} · {c.current_company||'—'}</div></div>
                          {c.prism_score&&<span className="font-mono text-sm font-bold text-[#B8975A]">{Number(c.prism_score).toFixed(1)}</span>}
                          <span className="text-[#ccc] text-xs ml-1">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pg==='assessments'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Assessments <span className="text-sm font-normal text-[#888]">({data.assessments.length})</span></h2>
                  {data.assessments.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No assessments yet.</p></div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.assessments.map((a:any)=>(
                        <div key={a.id} onClick={()=>openDetail(a,'Assessment')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer">
                          <div className="w-9 h-9 rounded-lg bg-[#F5F3EF] flex items-center justify-center text-[11px] font-bold text-[#0F1D35]">{a.first_name?.[0]||'?'}{a.last_name?.[0]||''}</div>
                          <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-[#0F1D35]">{a.first_name||'Anonymous'} {a.last_name||''}</div><div className="text-[11px] text-[#888]">{a.email||'—'} · {a.tier} · {timeAgo(a.completed_at||a.created_at)}</div></div>
                          <span className="font-mono text-sm font-bold text-[#B8975A]">{a.score_overall?Number(a.score_overall).toFixed(1):'—'}</span>
                          <Pill c="green">Complete</Pill>
                          <span className="text-[#ccc] text-xs ml-1">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pg==='companies'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Companies <span className="text-sm font-normal text-[#888]">({data.orgs.length})</span></h2>
                  {data.orgs.length===0?(
                    <div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No companies yet. Convert a lead to create one.</p></div>
                  ):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {data.orgs.map((o:any)=>(
                        <div key={o.id} onClick={()=>openDetail(o,'Company')} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] hover:bg-[#FAFAF8] cursor-pointer">
                          <div className="flex-1"><div className="text-sm font-semibold text-[#0F1D35]">{o.name}</div><div className="text-[11px] text-[#888]">{o.industry||'—'}</div></div>
                          <Pill c={o.tier==='retained'?'gold':'blue'}>{o.tier||'prospect'}</Pill>
                          <span className="text-[#ccc] text-xs">→</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {pg==='searches'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Searches <span className="text-sm font-normal text-[#888]">({data.searches.length})</span></h2>
                  {data.searches.length===0?(<div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No active searches.</p></div>):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">{data.searches.map((s:any)=>(<div key={s.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF]"><div className="flex-1"><div className="text-sm font-semibold text-[#0F1D35]">{s.role_title}</div><div className="text-[11px] text-[#888]">{s.reference} · {s.search_type}</div></div><Pill c={s.status==='placed'?'green':'blue'}>{s.status}</Pill></div>))}</div>
                  )}
                </div>
              )}

              {pg==='invoices'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Invoices <span className="text-sm font-normal text-[#888]">({data.invoices.length})</span></h2>
                  {data.invoices.length===0?(<div className="bg-white rounded-xl p-12 border border-[#E8E5DF] text-center"><p className="text-xs text-[#888]">No invoices yet.</p></div>):(
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">{data.invoices.map((inv:any)=>(<div key={inv.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF]"><div className="flex-1"><div className="text-sm font-semibold text-[#0F1D35]">{inv.invoice_number}</div><div className="text-[11px] text-[#888]">{inv.description}</div></div><span className="font-mono text-xs font-bold text-[#B8975A]">€{((inv.total_cents||0)/100).toLocaleString()}</span><Pill c={inv.status==='paid'?'green':inv.status==='overdue'?'red':'amber'}>{inv.status}</Pill></div>))}</div>
                  )}
                </div>
              )}

              {pg==='activity'&&(
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0F1D35] mb-5">Activity Feed</h2>
                  <div className="bg-white rounded-xl p-5 border border-[#E8E5DF]">
                    {data.activities.map((a:any)=>(<div key={a.id} className="flex gap-3 py-3 border-b border-[#F5F3EF] last:border-0"><div className="w-1.5 h-1.5 rounded-full bg-[#B8975A] mt-1.5 flex-shrink-0"/><div><div className="text-xs text-[#333]">{a.description}</div><div className="text-[10px] text-[#888] mt-0.5">{timeAgo(a.created_at)} · {a.type?.replace(/_/g,' ')}</div></div></div>))}
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
