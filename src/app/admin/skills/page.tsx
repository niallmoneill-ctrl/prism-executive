'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`;

const SKILL_COLORS: Record<string, string> = {
  '#4A7C9E': 'bg-blue-50 text-blue-800 border-blue-200',
  '#4A8B6F': 'bg-green-50 text-green-800 border-green-200',
  '#1A1A1A': 'bg-gray-50 text-gray-800 border-gray-200',
  '#8B4A4A': 'bg-red-50 text-red-800 border-red-200',
  '#B8975A': 'bg-amber-50 text-amber-800 border-amber-200',
  '#6B5B8B': 'bg-purple-50 text-purple-800 border-purple-200',
};

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

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat'|'tasks'|'reports'>('chat');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSkills();
    loadTasks();
    loadReports();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSkills = async () => {
    const { data } = await supabase.from('ai_skills').select('*').eq('active', true).order('department');
    setSkills(data || []);
  };

  const loadTasks = async () => {
    const { data } = await supabase.from('skill_tasks').select('*, ai_skills(skill_name, avatar_initials, color)').order('created_at', { ascending: false }).limit(20);
    setTasks(data || []);
  };

  const loadReports = async () => {
    const { data } = await supabase.from('skill_reports').select('*').order('created_at', { ascending: false }).limit(10);
    setReports(data || []);
  };

  const selectSkill = (skill: Skill) => {
    setSelected(skill);
    setMessages([{
      role: 'assistant',
      content: `Hello, I'm ${skill.persona_name} — ${skill.role_title} at Prism Executive. How can I help you today?`,
      skill: skill.skill_key,
    }]);
    setActiveTab('chat');
  };

  const sendMessage = async () => {
    if (!input.trim() || !selected || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: selected.system_prompt,
          messages: [...history, { role: 'user', content: userMsg }],
        }),
      });

      const data = await res.json();
      const reply = data.content?.[0]?.text || 'No response received.';

      setMessages(m => [...m, { role: 'assistant', content: reply, skill: selected.skill_key }]);

      // Log to skill_logs
      await supabase.from('skill_logs').insert({
        skill_id: selected.id,
        action: 'chat',
        input: { message: userMsg },
        output: { reply },
        success: true,
      });

    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', skill: selected.skill_key }]);
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
    loadTasks();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await supabase.from('skill_tasks').update({
      status,
      completed_at: status === 'complete' ? new Date().toISOString() : null,
    }).eq('id', taskId);
    loadTasks();
  };

  const generateWeeklyReport = async (skill: Skill) => {
    setLoading(true);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: skill.system_prompt,
          messages: [{
            role: 'user',
            content: `Generate a concise weekly report for Orla Brennan as ${skill.role_title}. Include: executive summary, top 3 priorities this week, key metrics or observations relevant to your role, and 2-3 recommendations. Format as JSON with keys: executive_summary, priorities (array), metrics (object), recommendations (array).`,
          }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '{}';
      let reportData;
      try {
        const cleaned = text.replace(/```json\s*/i, '').replace(/\s*```/i, '').trim();
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

      loadReports();
      setActiveTab('reports');
      alert(`Weekly report generated for ${skill.role_title}`);
    } catch (err) {
      alert('Report generation failed. Please try again.');
    }
    setLoading(false);
  };

  const deptColors: Record<string, string> = {
    'Engineering': '#4A7C9E',
    'Technology': '#1A1A1A',
    'Finance': '#8B4A4A',
    'Marketing': '#B8975A',
    'Design': '#6B5B8B',
    'Customer Success': '#4A8B6F',
  };

  const departments = Array.from(new Set(skills.map(s => s.department)));

  return (
    <div className="flex h-full gap-5">
      {/* Skills list */}
      <div className="w-72 flex-shrink-0 overflow-y-auto">
        <h2 className="font-display text-lg font-bold text-[#0F1D35] mb-4">AI Skills Team</h2>
        {departments.map(dept => (
          <div key={dept} className="mb-5">
            <p className="text-[9px] font-semibold tracking-[0.15em] uppercase mb-2"
              style={{ color: deptColors[dept] || '#888' }}>
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
                  <p className="text-xs font-semibold text-[#0F1D35] truncate">{skill.persona_name}</p>
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
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="grid grid-cols-4 gap-3 mb-6 max-w-sm mx-auto">
                {skills.slice(0, 8).map(s => (
                  <div key={s.id} onClick={() => selectSkill(s)}
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold text-white cursor-pointer hover:scale-105 transition-transform mx-auto"
                    style={{ background: s.color }}>
                    {s.avatar_initials}
                  </div>
                ))}
              </div>
              <h3 className="font-display text-xl text-[#0F1D35] mb-2">Select a Skill</h3>
              <p className="text-xs text-[#888]">Choose an AI team member to chat, assign tasks, or generate reports.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Skill header */}
            <div className="bg-white rounded-xl border border-[#E8E5DF] p-4 mb-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: selected.color }}>
                {selected.avatar_initials}
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-[#0F1D35]">{selected.persona_name}</h3>
                <p className="text-xs text-[#888]">{selected.role_title} · Reports to {selected.reports_to === 'orla_brennan' ? 'Orla Brennan' : selected.reports_to.toUpperCase()}</p>
              </div>
              <div className="flex gap-2">
                {(['chat','tasks','reports'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                      activeTab === tab ? 'bg-[#B8975A] text-white' : 'bg-[#F5F3EF] text-[#888] hover:text-[#333]'
                    }`}>
                    {tab}
                  </button>
                ))}
                <button onClick={() => generateWeeklyReport(selected)} disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#0F1D35] text-white hover:bg-[#1A2D4D] disabled:opacity-40 transition-colors">
                  Weekly Report
                </button>
              </div>
            </div>

            {/* Chat tab */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col bg-white rounded-xl border border-[#E8E5DF] overflow-hidden">
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: selected.color }}>
                          {selected.avatar_initials}
                        </div>
                      )}
                      <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-[#0F1D35] text-white rounded-tr-sm'
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
                    className="px-5 py-2.5 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] disabled:opacity-40 transition-colors">
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
                    const title = (document.getElementById('task-title') as HTMLInputElement)?.value;
                    const desc = (document.getElementById('task-desc') as HTMLTextAreaElement)?.value;
                    if (title) { createTask(selected.id, title, desc); (document.getElementById('task-title') as HTMLInputElement).value = ''; (document.getElementById('task-desc') as HTMLTextAreaElement).value = ''; }
                  }} className="px-5 py-2 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] transition-colors">
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
                        <p className={`text-sm font-medium ${task.status === 'complete' ? 'text-[#888] line-through' : 'text-[#0F1D35]'}`}>{task.title}</p>
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
                      className="px-6 py-2.5 bg-[#B8975A] text-white rounded-lg text-xs font-semibold hover:bg-[#96793F] disabled:opacity-40 transition-colors">
                      Generate Weekly Report
                    </button>
                  </div>
                ) : reports.filter(r => r.generated_by_skill_id === selected.id).map(report => (
                  <div key={report.id} className="bg-white rounded-xl border border-[#E8E5DF] p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-1">{report.report_type} Report</p>
                        <h4 className="font-display text-lg text-[#0F1D35]">{report.title}</h4>
                        <p className="text-[11px] text-[#888] mt-0.5">Week ending {report.week_ending ? new Date(report.week_ending).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                      </div>
                    </div>
                    {report.executive_summary && (
                      <p className="text-sm text-[#333] leading-relaxed mb-4">{report.executive_summary}</p>
                    )}
                    {report.sections?.length > 0 && (
                      <div className="mb-4">
                        {report.sections.map((s: any, i: number) => (
                          <div key={i} className="mb-3">
                            <p className="text-xs font-semibold text-[#0F1D35] mb-1">{s.title}</p>
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
  );
}
