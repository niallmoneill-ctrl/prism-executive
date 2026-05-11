'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { FUNCTIONS_URL } from '@/lib/supabase';

const supabase = createClient();

interface Skill {
  id: string;
  skill_key: string;
  skill_name: string;
  role_title: string;
  department: string;
  persona_name: string;
  avatar_initials: string;
  color: string;
  system_prompt: string;
  capabilities: string[];
  reports_to: string;
  active: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  skill?: string;
}

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#4A7C9E',
  Technology:  '#1A1A1A',
  Finance:     '#8B4A4A',
  Marketing:   '#B8975A',
  Design:      '#6B5B8B',
  'Customer Success': '#4A8B6F',
  Operations:  '#4A7C9E',
  Consulting:  '#B8975A',
  Executive:   '#B8975A',
  People:      '#4A8B6F',
};

export default function SkillsPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [skills, setSkills]           = useState<Skill[]>([]);
  const [selected, setSelected]       = useState<Skill | null>(null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [tasks, setTasks]             = useState<any[]>([]);
  const [reports, setReports]         = useState<any[]>([]);
  const [activeTab, setActiveTab]     = useState<'chat'|'tasks'|'reports'>('chat');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login?redirect=/admin/skills'; return; }
      const { data: isStaff } = await supabase.rpc('is_staff', { user_id: user.id });
      if (isStaff !== true) { window.location.href = '/account'; return; }
      setAuthChecked(true);
      loadAll();
    })();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAll = async () => {
    const [skillsRes, tasksRes, reportsRes] = await Promise.all([
      supabase.from('ai_skills').select('*').eq('active', true).order('department'),
      supabase.from('skill_tasks').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('skill_reports').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    setSkills(skillsRes.data || []);
    setTasks(tasksRes.data || []);
    setReports(reportsRes.data || []);
  };

  const selectSkill = (skill: Skill) => {
    setSelected(skill);
    setError('');
    setMessages([{
      role: 'assistant',
      content: `Hello, I'm ${skill.persona_name} — ${skill.role_title} at Prism Executive. How can I help you today?`,
      skill: skill.skill_key,
    }]);
    setActiveTab('chat');
  };

  const callSkill = async (mode: 'chat' | 'weekly_report', userMsg: string, maxTokens = 1024) => {
    if (!selected) throw new Error('No skill selected');
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Your session has expired. Sign in again.');

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const conversation = mode === 'chat'
      ? [...history, { role: 'user' as const, content: userMsg }]
      : [{ role: 'user' as const, content: userMsg }];

    const res = await fetch(`${FUNCTIONS_URL}/skill-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        skillId: selected.id,
        mode,
        max_tokens: maxTokens,
        messages: conversation,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Server returned ${res.status}`);
    return (data.text as string) || '';
  };

  const sendMessage = async () => {
    if (!input.trim() || !selected || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    setError('');
    try {
      const reply = await callSkill('chat', userMsg);
      setMessages(m => [...m, { role: 'assistant', content: reply || '(no reply)', skill: selected.skill_key }]);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
      setMessages(m => [...m, { role: 'assistant', content: `Sorry, I hit an error: ${err?.message || 'unknown'}. Please try again.`, skill: selected.skill_key }]);
    }
    setLoading(false);
  };

  const createTask = async (skillId: string, title: string, description: string) => {
    await supabase.from('skill_tasks').insert({
      skill_id: skillId,
      task_type: 'manual',
      title,
      description,
      status: 'pending',
      priority: 'normal',
    });
    const { data } = await supabase.from('skill_tasks').select('*').order('created_at', { ascending: false }).limit(50);
    setTasks(data || []);
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from('skill_tasks').update({
      status,
      completed_at: status === 'complete' ? new Date().toISOString() : null,
    }).eq('id', taskId);
    const { data } = await supabase.from('skill_tasks').select('*').order('created_at', { ascending: false }).limit(50);
    setTasks(data || []);
  };

  const generateWeeklyReport = async (skill: Skill) => {
    setSelected(skill);
    setLoading(true);
    setError('');
    try {
      const text = await callSkill(
        'weekly_report',
        `Generate a concise weekly report for the leadership team as ${skill.role_title}. Include: executive_summary, priorities (array of 3), metrics (object), recommendations (array of 2-3). Respond with ONLY valid JSON, no markdown fences.`,
        1500,
      );

      let reportData: any;
      try {
        const cleaned = text.replace(/```json\s*/i, '').replace(/```\s*$/i, '').trim();
        reportData = JSON.parse(cleaned);
      } catch {
        reportData = { executive_summary: text };
      }

      await supabase.from('skill_reports').insert({
        report_type: 'weekly',
        generated_by_skill_id: skill.id,
        title: `${skill.role_title} Weekly Report`,
        week_ending: new Date().toISOString().split('T')[0],
        executive_summary: reportData.executive_summary || text,
        sections: reportData.priorities ? [{ title: 'Priorities', items: reportData.priorities }] : [],
        kpis: reportData.metrics || {},
        recommendations: reportData.recommendations || [],
        published_at: new Date().toISOString(),
      });

      const { data } = await supabase.from('skill_reports').select('*').order('created_at', { ascending: false }).limit(20);
      setReports(data || []);
      setActiveTab('reports');
    } catch (err: any) {
      setError(err?.message || 'Report generation failed.');
    }
    setLoading(false);
  };

  const departments = Array.from(new Set(skills.map(s => s.department)));

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#B8975A]/20 border-t-[#B8975A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF] flex flex-col">
      <nav className="bg-[#1A1A1A] px-4 sm:px-6 h-14 flex items-center justify-between sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A] flex-shrink-0">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em] truncate">PRISM EXECUTIVE</span>
          <span className="hidden sm:inline text-white/30 text-[10px] tracking-[0.25em] uppercase ml-1">Admin · Skills</span>
        </Link>
        <Link href="/admin" className="text-[10px] text-white/40 hover:text-[#B8975A] tracking-[0.15em] uppercase whitespace-nowrap">← Dashboard</Link>
      </nav>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase text-[#888] mb-2">AI Workforce</p>
          <h1 className="font-display text-3xl text-[#1A1A1A]">Skills</h1>
          <p className="text-sm text-[#888] mt-1">
            Chat with role-specialised AI personas, assign tasks, generate weekly reports.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-5">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-5 md:min-h-[calc(100vh-280px)]">
          {/* Skills list */}
          <div className="w-full md:w-72 md:flex-shrink-0 md:overflow-y-auto">
            <h2 className="font-display text-lg text-[#1A1A1A] mb-4">AI Skills Team</h2>
            {skills.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#E8E5DF] p-6 text-center">
                <p className="text-xs text-[#888]">No active skills configured yet.</p>
              </div>
            ) : departments.map(dept => (
              <div key={dept} className="mb-5">
                <p className="text-[9px] font-semibold tracking-[0.15em] uppercase mb-2"
                  style={{ color: DEPT_COLORS[dept] || '#888' }}>
                  {dept}
                </p>
                {skills.filter(s => s.department === dept).map(skill => (
                  <div key={skill.id}
                    onClick={() => selectSkill(skill)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-1.5 border transition-all ${
                      selected?.id === skill.id
                        ? 'border-[#B8975A] bg-[#FBF6ED]'
                        : 'border-[#E8E5DF] bg-white hover:bg-[#FAFAF8]'
                    }`}>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: skill.color }}>
                      {skill.avatar_initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#1A1A1A] truncate">{skill.persona_name}</p>
                      <p className="text-[10px] text-[#888] truncate">{skill.role_title}</p>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${skill.active ? 'bg-green-400' : 'bg-gray-300'}`}/>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Main panel */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-[#E8E5DF]">
                <div className="text-center px-6 py-12">
                  {skills.length > 0 && (
                    <div className="grid grid-cols-4 gap-3 mb-6 max-w-sm mx-auto">
                      {skills.slice(0, 8).map(s => (
                        <div key={s.id} onClick={() => selectSkill(s)}
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:scale-105 transition-transform mx-auto"
                          style={{ background: s.color }}>
                          {s.avatar_initials}
                        </div>
                      ))}
                    </div>
                  )}
                  <h3 className="font-display text-xl text-[#1A1A1A] mb-2">Select a Skill</h3>
                  <p className="text-xs text-[#888] max-w-sm">Choose an AI team member from the left to chat, assign tasks, or generate reports.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Skill header */}
                <div className="bg-white rounded-xl border border-[#E8E5DF] p-4 mb-4 flex items-center gap-4 flex-wrap">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: selected.color }}>
                    {selected.avatar_initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-semibold text-[#1A1A1A] truncate">{selected.persona_name}</h3>
                    <p className="text-xs text-[#888] truncate">{selected.role_title} · Reports to {selected.reports_to === 'orla_brennan' ? 'Orla Brennan' : selected.reports_to?.toUpperCase() || 'Leadership'}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap w-full sm:w-auto">
                    {(['chat','tasks','reports'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                          activeTab === tab ? 'bg-[#B8975A] text-white' : 'bg-[#F5F3EF] text-[#888] hover:text-[#333]'
                        }`}>
                        {tab}
                      </button>
                    ))}
                    <button onClick={() => generateWeeklyReport(selected)} disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#1A1A1A] text-white hover:bg-[#0F0F0F] disabled:opacity-40 transition-colors">
                      Weekly Report
                    </button>
                  </div>
                </div>

                {/* Chat tab */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[400px]">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                          {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: selected.color }}>
                              {selected.avatar_initials}
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-[#1A1A1A] text-white rounded-tr-sm'
                              : 'bg-[#F5F3EF] text-[#333] rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                      {loading && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                            style={{ background: selected.color }}>
                            {selected.avatar_initials}
                          </div>
                          <div className="bg-[#F5F3EF] rounded-xl rounded-tl-sm px-4 py-3">
                            <div className="flex gap-1">
                              {[0,1,2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#B8975A] animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}/>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEnd}/>
                    </div>
                    <div className="p-4 border-t border-[#E8E5DF] flex gap-2">
                      <input
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        placeholder={`Message ${selected.persona_name}…`}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] bg-white"
                      />
                      <button onClick={sendMessage} disabled={loading || !input.trim()}
                        className="px-5 py-2.5 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] disabled:opacity-40 transition-colors tracking-wide uppercase">
                        Send
                      </button>
                    </div>
                  </div>
                )}

                {/* Tasks tab */}
                {activeTab === 'tasks' && (
                  <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-white rounded-xl border border-[#E8E5DF] p-5">
                      <p className="text-xs font-semibold text-[#333] mb-3">Create Task for {selected.persona_name}</p>
                      <input id="task-title" placeholder="Task title…"
                        className="w-full px-4 py-2.5 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] mb-2"/>
                      <textarea id="task-desc" placeholder="Description (optional)…" rows={2}
                        className="w-full px-4 py-2.5 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] mb-3 resize-none"/>
                      <button onClick={() => {
                        const t = (document.getElementById('task-title') as HTMLInputElement);
                        const d = (document.getElementById('task-desc') as HTMLTextAreaElement);
                        if (t?.value) { createTask(selected.id, t.value, d?.value || ''); t.value = ''; if (d) d.value = ''; }
                      }} className="px-5 py-2 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] transition-colors tracking-wide uppercase">
                        Add Task
                      </button>
                    </div>
                    <div className="bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                      {tasks.filter(t => t.skill_id === selected.id).length === 0 ? (
                        <p className="text-xs text-[#888] p-8 text-center">No tasks yet for {selected.persona_name}.</p>
                      ) : tasks.filter(t => t.skill_id === selected.id).map(task => (
                        <div key={task.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#F5F3EF] last:border-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'complete' ? 'bg-green-400' : task.status === 'in_progress' ? 'bg-amber-400' : 'bg-gray-300'}`}/>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.status === 'complete' ? 'text-[#888] line-through' : 'text-[#1A1A1A]'}`}>{task.title}</p>
                            {task.description && <p className="text-[11px] text-[#888] truncate">{task.description}</p>}
                          </div>
                          <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value)}
                            className="text-[10px] border border-[#E8E5DF] rounded-lg px-2 py-1 outline-none focus:border-[#B8975A] bg-white text-[#333]">
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="complete">Complete</option>
                            <option value="flagged">Flagged</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reports tab */}
                {activeTab === 'reports' && (
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {reports.filter(r => r.generated_by_skill_id === selected.id).length === 0 ? (
                      <div className="bg-white rounded-xl border border-[#E8E5DF] p-10 text-center">
                        <p className="text-xs text-[#888] mb-4">No reports yet for {selected.persona_name}.</p>
                        <button onClick={() => generateWeeklyReport(selected)} disabled={loading}
                          className="px-6 py-2.5 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] disabled:opacity-40 transition-colors tracking-wide uppercase">
                          Generate Weekly Report
                        </button>
                      </div>
                    ) : reports.filter(r => r.generated_by_skill_id === selected.id).map(report => (
                      <div key={report.id} className="bg-white rounded-xl border border-[#E8E5DF] p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-1">{report.report_type} Report</p>
                            <h4 className="font-display text-lg text-[#1A1A1A]">{report.title}</h4>
                            <p className="text-[11px] text-[#888] mt-0.5">Week ending {report.week_ending ? new Date(report.week_ending).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                          </div>
                        </div>
                        {report.executive_summary && (
                          <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-wrap">{report.executive_summary}</p>
                        )}
                        {report.sections?.length > 0 && (
                          <div className="mb-4">
                            {report.sections.map((s: any, i: number) => (
                              <div key={i} className="mb-3">
                                <p className="text-xs font-semibold text-[#1A1A1A] mb-1">{s.title}</p>
                                {s.items?.map((item: string, j: number) => (
                                  <p key={j} className="text-xs text-[#666] flex gap-2 mb-1">
                                    <span className="text-[#B8975A]">—</span>{item}
                                  </p>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                        {report.recommendations?.length > 0 && (
                          <div className="bg-[#F5F3EF] rounded-lg p-4">
                            <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-2">Recommendations</p>
                            {report.recommendations.map((r: string, i: number) => (
                              <p key={i} className="text-xs text-[#333] flex gap-2 mb-1.5">
                                <span className="text-[#B8975A] font-bold">{i+1}.</span>{r}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-[#1A1A1A] py-6 text-center mt-10">
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Prism Executive Ltd · Internal</p>
      </footer>
    </div>
  );
}
