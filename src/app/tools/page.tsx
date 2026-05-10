'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FUNCTIONS_URL } from '@/lib/supabase';

export default function ToolsPage() {
  const [tool, setTool] = useState<string|null>(null);
  const [salary, setSalary] = useState('150000');
  const [months, setMonths] = useState('4');
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', company:'', role:'', industry:'' });
  const INDUSTRIES = ['Healthcare','Pharmaceuticals','Financial Services','Construction','Solar & Energy','Engineering','Professional Services','FMCG & Retail','ICT & Technology','Not-For-Profit'];

  const mc = () => { const s=parseInt(salary)||150000; const m=parseInt(months)||4; return { direct:s*0.5, prod:(s/12)*m*0.6, team:s*0.15, total:s*0.5+(s/12)*m*0.6+s*0.15, sal:s }; };

  const submitLead = async () => {
    if (!form.firstName || !form.email) return;
    try {
      await fetch(`${FUNCTIONS_URL}/lead-capture`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, toolUsed: tool, intent: 'hiring' }),
      });
      setSubmitted(true);
    } catch (e) { console.error(e); }
  };

  const Inp = ({ ph, k }: { ph: string; k: string }) => (
    <input placeholder={ph} value={(form as any)[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
      className="px-3 py-2.5 border border-prism-border rounded-lg text-sm font-body w-full outline-none focus:border-gold" />
  );

  return (
    <div className="min-h-screen bg-prism-bg">
      <nav className="sticky top-0 z-50 bg-prism-black px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-gold/40 rounded flex items-center justify-center font-display text-xl font-semibold text-gold">P</div>
          <span className="text-gold text-xs tracking-[0.25em] font-body">PRISM EXECUTIVE</span>
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {!tool && !submitted && (
          <>
            <div className="bg-prism-black rounded-xl p-14 mb-8">
              <p className="text-gold/60 text-[10px] tracking-[0.4em] uppercase mb-4">For Hiring Leaders</p>
              <h1 className="font-display text-3xl text-white mb-3">Stop Guessing. <span className="text-gold">Hire With Science.</span></h1>
              <p className="text-white/40 text-sm font-body max-w-md">A bad executive hire costs 5× their salary. Define the behavioural profile your role needs.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id:'benchmark', title:'Role Benchmark', desc:'Define ideal behavioural profile for your role', time:'3 min', color:'var(--prism-gold)' },
                { id:'mishire', title:'Mis-Hire Calculator', desc:'Calculate the true cost of getting it wrong', time:'1 min', color:'var(--dim-exploration)' },
                { id:'salary', title:'Salary Benchmarks', desc:'Executive salary ranges by industry', time:'Instant', color:'var(--dim-structure)' },
                { id:'talent', title:'Talent Snapshot', desc:'Market heat, supply, and competition data', time:'Instant', color:'var(--dim-drive)' },
              ].map(t => (
                <button key={t.id} onClick={() => setTool(t.id)} className="bg-white rounded-xl p-6 border border-prism-border text-left hover:shadow-sm hover:-translate-y-px transition-all" style={{ borderTopColor: t.color, borderTopWidth: 2 }}>
                  <h3 className="font-display text-base text-prism-black mb-1">{t.title}</h3>
                  <p className="text-xs text-prism-muted font-body mb-3">{t.desc}</p>
                  <p className="text-xs font-body font-medium" style={{ color: t.color }}>{t.time} →</p>
                </button>
              ))}
            </div>
          </>
        )}

        {tool === 'mishire' && !submitted && (
          <div>
            <button onClick={() => setTool(null)} className="text-xs text-prism-muted mb-6 inline-block font-body">← Back</button>
            <h2 className="font-display text-2xl text-prism-black mb-8 text-center">The True Cost of Getting It Wrong</h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-6 border border-prism-border">
                <label className="text-[11px] font-medium text-prism-charcoal block mb-1 font-body">Annual Salary (€)</label>
                <input value={salary} onChange={e => setSalary(e.target.value)} className="w-full px-3 py-2 border border-prism-border rounded-lg text-sm mb-3 font-body" />
                <label className="text-[11px] font-medium text-prism-charcoal block mb-1 font-body">Months to Fill</label>
                <input value={months} onChange={e => setMonths(e.target.value)} className="w-full px-3 py-2 border border-prism-border rounded-lg text-sm font-body" />
              </div>
              <div className="bg-prism-black rounded-xl p-6 text-white">
                <p className="text-gold/50 text-[9px] tracking-[0.2em] uppercase mb-3">Total Mis-Hire Cost</p>
                <p className="font-display text-3xl text-red-400 mb-4">€{Math.round(mc().total).toLocaleString()}</p>
                {[{l:'Direct Costs',v:mc().direct},{l:'Lost Productivity',v:mc().prod},{l:'Team Impact',v:mc().team}].map(c => (
                  <div key={c.l} className="flex justify-between py-2 border-b border-white/5">
                    <span className="text-xs font-body">{c.l}</span>
                    <span className="font-mono text-xs">€{Math.round(c.v).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 border border-prism-border">
              <p className="text-[10px] tracking-[0.2em] uppercase text-prism-muted font-body mb-4">Get your full report</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Inp ph="First Name *" k="firstName" /><Inp ph="Email *" k="email" />
                <Inp ph="Company" k="company" /><Inp ph="Phone" k="phone" />
              </div>
              <button onClick={submitLead} disabled={!form.email||!form.firstName} className="w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm font-body font-medium tracking-wide disabled:opacity-40 transition-colors">SEND REPORT</button>
            </div>
          </div>
        )}

        {(tool === 'benchmark' || tool === 'salary' || tool === 'talent') && !submitted && (
          <div>
            <button onClick={() => setTool(null)} className="text-xs text-prism-muted mb-6 inline-block font-body">← Back</button>
            <h2 className="font-display text-2xl text-prism-black mb-8 text-center">{tool === 'benchmark' ? 'Role Benchmark Builder' : tool === 'salary' ? 'Salary Benchmarks' : 'Talent Market Snapshot'}</h2>
            <div className="bg-white rounded-xl p-6 border border-prism-border max-w-md mx-auto">
              <select value={form.industry} onChange={e => setForm(f => ({...f, industry: e.target.value}))} className="w-full px-3 py-2.5 border border-prism-border rounded-lg text-sm mb-4 font-body">
                <option value="">Select industry...</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Inp ph="First Name *" k="firstName" /><Inp ph="Email *" k="email" />
                <Inp ph="Company" k="company" /><Inp ph="Role you're hiring" k="role" />
              </div>
              <button onClick={submitLead} disabled={!form.email||!form.firstName} className="w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm font-body font-medium tracking-wide disabled:opacity-40 transition-colors">GET REPORT</button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="text-center py-16">
            <h2 className="font-display text-2xl text-prism-black mb-3">Report on its way</h2>
            <p className="text-prism-muted text-sm font-body mb-8">Orla Brennan will personally review your needs and be in touch within 24 hours.</p>
            <p className="text-sm text-prism-charcoal font-body">Direct: <strong>+353 86 172 0090</strong> · orla.brennan@prismexecutive.ie</p>
          </div>
        )}
      </div>
    </div>
  );
}
