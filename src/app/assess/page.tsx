'use client';
import { useState } from 'react';
import Link from 'next/link';
import { supabase, FUNCTIONS_URL } from '@/lib/supabase';

const QS = [
  { id:1, text:"I enjoy exploring new ideas, even when they involve uncertainty.", dim:"dopamine", sub:"A" },
  { id:2, text:"I prefer environments where I can innovate and experiment.", dim:"dopamine", sub:"B" },
  { id:3, text:"I am energised by unfamiliar situations and new people.", dim:"dopamine", sub:"A" },
  { id:4, text:"I like having detailed plans and structured schedules.", dim:"serotonin", sub:"A" },
  { id:5, text:"I feel most comfortable when expectations are clearly defined.", dim:"serotonin", sub:"A" },
  { id:6, text:"I am thorough and careful, checking details before proceeding.", dim:"serotonin", sub:"B" },
  { id:7, text:"I am comfortable making quick, decisive judgements under pressure.", dim:"testosterone", sub:"A" },
  { id:8, text:"I tend to be direct and straightforward in my communication.", dim:"testosterone", sub:"B" },
  { id:9, text:"I enjoy competitive situations where I can demonstrate abilities.", dim:"testosterone", sub:"A" },
  { id:10, text:"I am naturally attentive to how others are feeling.", dim:"estrogen", sub:"A" },
  { id:11, text:"Building genuine, trusting relationships is important to me.", dim:"estrogen", sub:"A" },
  { id:12, text:"I prefer collaborative decision-making that considers everyone.", dim:"estrogen", sub:"B" },
];

const DIM: Record<string, { label: string; color: string }> = {
  dopamine: { label: 'Exploration', color: 'var(--dim-exploration)' },
  serotonin: { label: 'Structure', color: 'var(--dim-structure)' },
  testosterone: { label: 'Drive', color: 'var(--dim-drive)' },
  estrogen: { label: 'Connection', color: 'var(--dim-connection)' },
};

const INDUSTRIES = ['Healthcare','Pharmaceuticals & Biotech','Financial Services','Construction & Infrastructure','Solar & Renewable Energy','Engineering & Manufacturing','Professional Services','FMCG & Retail','ICT & Technology','Not-For-Profit','Other'];
const SENIORITY = ['C-Suite (CEO, CFO, COO, CTO)','Director / VP','Senior Manager','Manager','Team Lead','Individual Contributor','Student / Graduate'];
const EXPERIENCE = ['0–2 years','3–5 years','6–10 years','11–15 years','16–20 years','20+ years','30+ years'];
const QUALIFICATIONS = ['Doctorate (PhD, DBA, MD)','Master\'s (MSc, MBA, MA)','Postgraduate Diploma','Bachelor\'s Degree','Professional (ACA, ACCA, CIPD)','Higher Diploma / HND','Trade / Apprenticeship','Leaving Certificate','Other'];

export default function AssessPage() {
  const [step, setStep] = useState<'intro'|'assess'|'profile'|'results'>('intro');
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [scores, setScores] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    firstName:'', lastName:'', email:'', phone:'',
    industry:'', seniority:'', role:'', experience:'', qualification:'',
    company:'', companySize:'', location:'', linkedin:'',
    gdprConsent: false, marketingConsent: false,
  });
  const startTime = Date.now();

  const handleAnswer = (v: number) => {
    setAnswers(p => ({ ...p, [QS[qi].id]: v }));
    if (qi < QS.length - 1) setQi(qi + 1);
    else setStep('profile');
  };

  const submitAssessment = async () => {
    if (!profile.firstName || !profile.email || !profile.gdprConsent) return;
    setLoading(true);
    try {
      // Score the assessment via Edge Function
      const responses = QS.map(q => ({
        questionId: q.id, dimension: q.dim, subDimension: q.sub,
        response: answers[q.id] || 3,
      }));

      const res = await fetch(`${FUNCTIONS_URL}/score-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses, tier: 'explorer',
          durationSeconds: Math.round((Date.now() - startTime) / 1000),
        }),
      });
      const scoreData = await res.json();

      // Also capture as a lead for the admin
      await fetch(`${FUNCTIONS_URL}/lead-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profile.firstName, lastName: profile.lastName,
          email: profile.email, phone: profile.phone,
          company: profile.company, industry: profile.industry,
          title: profile.role, toolUsed: 'assessment',
          intent: 'development', companySize: profile.companySize,
        }),
      });

      setScores(scoreData);
      setStep('results');
    } catch (err) {
      console.error('Error:', err);
      alert('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const Sel = ({ label, options, value, onChange, required }: any) => (
    <div className="mb-4">
      <label className="block text-[11px] font-medium text-prism-charcoal mb-1 font-body">{label} {required && <span className="text-red-500">*</span>}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-prism-border text-sm font-body outline-none focus:border-gold bg-white">
        <option value="">Select...</option>
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const Inp = ({ label, value, onChange, type = 'text', placeholder = '', required = false }: any) => (
    <div className="mb-4">
      <label className="block text-[11px] font-medium text-prism-charcoal mb-1 font-body">{label} {required && <span className="text-red-500">*</span>}</label>
      <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg border border-prism-border text-sm font-body outline-none focus:border-gold" />
    </div>
  );

  return (
    <div className="min-h-screen bg-prism-bg">
      <nav className="sticky top-0 z-50 bg-prism-black px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-gold/40 rounded flex items-center justify-center font-display text-xl font-semibold text-gold">P</div>
          <span className="text-gold text-xs tracking-[0.25em] font-body">PRISM EXECUTIVE</span>
        </Link>
        {step === 'assess' && <span className="text-white/30 text-xs font-body">Question {qi + 1} of {QS.length}</span>}
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">

        {/* INTRO */}
        {step === 'intro' && (
          <div className="text-center">
            <div className="bg-prism-black rounded-xl p-14 text-white mb-8">
              <p className="text-gold/60 text-[10px] tracking-[0.4em] uppercase mb-6">Free Behavioural Assessment</p>
              <h1 className="font-display text-3xl text-white mb-3">Discover Your Behavioural Profile</h1>
              <p className="text-white/40 text-sm mb-8 font-body">12 questions · 5 minutes · No right or wrong answers</p>
              <button onClick={() => setStep('assess')} className="bg-gold hover:bg-gold-dark text-white px-10 py-3 rounded-lg text-sm font-body font-medium tracking-wide transition-colors">
                BEGIN ASSESSMENT
              </button>
            </div>
          </div>
        )}

        {/* ASSESSMENT */}
        {step === 'assess' && (
          <div>
            <div className="mb-8">
              <div className="flex justify-between text-xs text-prism-muted mb-2 font-body">
                <span>Question {qi + 1} of {QS.length}</span>
                <span style={{ color: DIM[QS[qi].dim].color }} className="font-medium">{DIM[QS[qi].dim].label}</span>
              </div>
              <div className="h-1 bg-prism-border rounded-full overflow-hidden">
                <div className="h-full bg-gold rounded-full transition-all duration-500" style={{ width: `${(qi / QS.length) * 100}%` }} />
              </div>
            </div>

            <div className="bg-prism-card rounded-xl p-10 border border-prism-border mb-8">
              <p className="font-display text-xl text-prism-black leading-relaxed italic">&ldquo;{QS[qi].text}&rdquo;</p>
            </div>

            <div className="flex justify-between text-[10px] text-prism-muted mb-3 px-2 font-body">
              <span>Strongly Disagree</span><span>Strongly Agree</span>
            </div>
            <div className="flex gap-3 justify-center">
              {[1,2,3,4,5].map(v => (
                <button key={v} onClick={() => handleAnswer(v)}
                  className="w-14 h-14 rounded-lg border border-prism-border bg-white text-lg font-display text-prism-charcoal hover:bg-gold hover:text-white hover:border-gold transition-all">
                  {v}
                </button>
              ))}
            </div>
            {qi > 0 && <button onClick={() => setQi(qi-1)} className="mt-6 text-xs text-prism-muted hover:text-prism-charcoal font-body">← Previous</button>}
          </div>
        )}

        {/* PROFILE CAPTURE */}
        {step === 'profile' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl text-prism-black mb-2">Assessment Complete</h2>
              <p className="text-prism-muted text-sm font-body">Enter your details to receive your personalised behavioural report.</p>
            </div>

            <div className="bg-prism-card rounded-xl p-8 border border-prism-border">
              <p className="text-[10px] tracking-[0.2em] uppercase text-prism-muted font-body font-medium mb-4">Your Details</p>
              <div className="grid grid-cols-2 gap-x-4">
                <Inp label="First Name" required value={profile.firstName} onChange={(v: string) => setProfile(p => ({...p, firstName: v}))} />
                <Inp label="Last Name" value={profile.lastName} onChange={(v: string) => setProfile(p => ({...p, lastName: v}))} />
              </div>
              <Inp label="Email Address" required type="email" value={profile.email} onChange={(v: string) => setProfile(p => ({...p, email: v}))} placeholder="your@email.com" />
              <Inp label="Phone" value={profile.phone} onChange={(v: string) => setProfile(p => ({...p, phone: v}))} placeholder="+353 86 172 0090" />

              <p className="text-[10px] tracking-[0.2em] uppercase text-prism-muted font-body font-medium mb-4 mt-6">Professional Details</p>
              <Sel label="Industry" required options={INDUSTRIES} value={profile.industry} onChange={(v: string) => setProfile(p => ({...p, industry: v}))} />
              <Sel label="Seniority Level" options={SENIORITY} value={profile.seniority} onChange={(v: string) => setProfile(p => ({...p, seniority: v}))} />
              <Inp label="Current Role / Job Title" value={profile.role} onChange={(v: string) => setProfile(p => ({...p, role: v}))} placeholder="e.g. Operations Director" />
              <div className="grid grid-cols-2 gap-x-4">
                <Sel label="Experience" options={EXPERIENCE} value={profile.experience} onChange={(v: string) => setProfile(p => ({...p, experience: v}))} />
                <Sel label="Highest Qualification" options={QUALIFICATIONS} value={profile.qualification} onChange={(v: string) => setProfile(p => ({...p, qualification: v}))} />
              </div>

              <p className="text-[10px] tracking-[0.2em] uppercase text-prism-muted font-body font-medium mb-4 mt-6">Organisation</p>
              <Inp label="Company / Organisation" value={profile.company} onChange={(v: string) => setProfile(p => ({...p, company: v}))} />
              <div className="grid grid-cols-2 gap-x-4">
                <Inp label="Location" value={profile.location} onChange={(v: string) => setProfile(p => ({...p, location: v}))} placeholder="Dublin, Ireland" />
                <Inp label="LinkedIn Profile" value={profile.linkedin} onChange={(v: string) => setProfile(p => ({...p, linkedin: v}))} placeholder="linkedin.com/in/..." />
              </div>

              <p className="text-[10px] tracking-[0.2em] uppercase text-prism-muted font-body font-medium mb-4 mt-6">Consent</p>
              <label className="flex gap-3 cursor-pointer text-xs text-prism-charcoal leading-relaxed mb-3 font-body">
                <input type="checkbox" checked={profile.gdprConsent} onChange={e => setProfile(p => ({...p, gdprConsent: e.target.checked}))} className="mt-0.5 accent-gold" />
                <span>I consent to Prism Executive processing my personal data to generate my behavioural report. My data will be handled in accordance with GDPR. I understand I can request deletion at any time. <span className="text-red-500">*</span></span>
              </label>
              <label className="flex gap-3 cursor-pointer text-xs text-prism-muted leading-relaxed mb-6 font-body">
                <input type="checkbox" checked={profile.marketingConsent} onChange={e => setProfile(p => ({...p, marketingConsent: e.target.checked}))} className="mt-0.5 accent-gold" />
                <span>I would like to receive industry insights, salary benchmarks, and executive opportunities from Prism Executive (optional)</span>
              </label>

              <button onClick={submitAssessment} disabled={!profile.firstName || !profile.email || !profile.gdprConsent || loading}
                className="w-full bg-gold hover:bg-gold-dark text-white py-3 rounded-lg text-sm font-body font-medium tracking-wide transition-colors disabled:opacity-40">
                {loading ? 'Generating your report...' : 'VIEW MY RESULTS'}
              </button>
              <p className="text-center text-[10px] text-prism-muted mt-3 font-body">Your data is encrypted and stored in compliance with GDPR</p>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {step === 'results' && scores && (
          <div>
            <div className="bg-prism-black rounded-xl p-8 text-center mb-6">
              <p className="text-gold/50 text-[9px] tracking-[0.3em] uppercase mb-2">Explorer Report</p>
              <h2 className="font-display text-2xl text-white mb-1">{profile.firstName}&apos;s Behavioural Profile</h2>
              <p className="text-white/30 text-xs font-body">{profile.role && `${profile.role} · `}{profile.industry && `${profile.industry} · `}{new Date().toLocaleDateString('en-IE')}</p>
            </div>

            <div className="bg-prism-card rounded-xl p-8 border border-prism-border mb-6">
              <h3 className="font-display text-lg text-prism-black mb-6">Dimension Scores</h3>
              {Object.entries(DIM).map(([k, d]) => (
                <div key={k} className="mb-5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-prism-charcoal font-body">{d.label}</span>
                    <span className="font-mono text-sm font-semibold" style={{ color: d.color }}>{(scores.scores?.[k] || 0).toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-prism-bg rounded-full overflow-hidden border border-prism-border">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((scores.scores?.[k] || 0) / 5) * 100}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>

            {scores.strengths && (
              <div className="bg-prism-card rounded-xl p-8 border border-prism-border mb-6">
                <h3 className="font-display text-lg text-prism-black mb-4">Top Strengths</h3>
                {scores.strengths.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-prism-border last:border-0">
                    <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-display" style={{ borderColor: DIM[s.dimension]?.color || '#888', color: DIM[s.dimension]?.color || '#888' }}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-prism-black font-body flex-1">{s.label}</span>
                    <span className="font-mono text-xs" style={{ color: DIM[s.dimension]?.color }}>{s.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Locked sections */}
            {['Gap Analysis — Natural vs Adapted','Communication Preferences','Decision-Making Profile','Leadership Style','Development Plan'].map(s => (
              <div key={s} className="bg-prism-card rounded-xl px-6 py-4 border border-dashed border-prism-border mb-2 flex items-center justify-between opacity-50">
                <span className="text-xs text-prism-muted font-body">{s}</span>
                <span className="text-[9px] text-prism-muted font-body tracking-wider uppercase">Professional</span>
              </div>
            ))}

            {/* Upgrade CTA — links to pricing, not back to assessment */}
            <div className="bg-prism-card rounded-xl p-8 border border-prism-border mt-6 text-center">
              <h3 className="font-display text-lg text-prism-black mb-2">Unlock Your Full 15-Page Report</h3>
              <p className="text-xs text-prism-muted font-body mb-6">Complete 80-item assessment with gap analysis, communication guide, leadership style, and personalised development plan.</p>
              <Link href="/pricing" className="inline-block bg-gold hover:bg-gold-dark text-white px-8 py-3 rounded-lg text-sm font-body font-medium tracking-wide transition-colors">
                VIEW PRICING — FROM €49
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
