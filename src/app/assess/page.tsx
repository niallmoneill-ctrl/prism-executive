'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FUNCTIONS_URL } from '@/lib/supabase';

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

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E8E5DF] text-sm font-body outline-none focus:border-[#B8975A] bg-white";

export default function AssessPage() {
  const [step, setStep] = useState<'intro'|'assess'|'profile'|'results'>('intro');
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [scores, setScores] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [industry, setIndustry] = useState('');
  const [seniority, setSeniority] = useState('');
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  const startTime = Date.now();

  const handleAnswer = (v: number) => {
    setAnswers(p => ({ ...p, [QS[qi].id]: v }));
    if (qi < QS.length - 1) setQi(qi + 1);
    else setStep('profile');
  };

  const submitAssessment = async () => {
    if (!firstName || !email || !gdprConsent) return;
    setLoading(true);
    try {
      const responses = QS.map(q => ({
        questionId: q.id, dimension: q.dim, subDimension: q.sub,
        response: answers[q.id] || 3,
      }));

      const res = await fetch(`${FUNCTIONS_URL}/score-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, industry, seniority, role, company, location, linkedin,
          responses, tier: 'explorer',
          durationSeconds: Math.round((Date.now() - startTime) / 1000),
        }),
      });
      const scoreData = await res.json();

      await fetch(`${FUNCTIONS_URL}/lead-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, industry, seniority, role, company, location, linkedin,
          firstName, lastName, email, phone,
          company, industry, title: role,
          toolUsed: 'assessment', intent: 'development',
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

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <nav className="sticky top-0 z-50 bg-[#1A1A1A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
        </Link>
        {step === 'assess' && <span className="text-white/30 text-xs">Question {qi + 1} of {QS.length}</span>}
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">

        {step === 'intro' && (
          <div className="text-center">
            <div className="bg-[#1A1A1A] rounded-xl p-14 text-white mb-8">
              <p className="text-[#B8975A]/60 text-[10px] tracking-[0.4em] uppercase mb-6">Free Behavioural Assessment</p>
              <h1 className="font-display text-3xl text-white mb-3">Discover Your Behavioural Profile</h1>
              <p className="text-white/40 text-sm mb-8">12 questions · 5 minutes · No right or wrong answers</p>
              <button onClick={() => setStep('assess')} className="bg-[#B8975A] hover:bg-[#96793F] text-white px-10 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors">
                BEGIN ASSESSMENT
              </button>
            </div>
          </div>
        )}

        {step === 'assess' && (
          <div>
            <div className="mb-8">
              <div className="flex justify-between text-xs text-[#888] mb-2">
                <span>Question {qi + 1} of {QS.length}</span>
                <span style={{ color: DIM[QS[qi].dim].color }} className="font-medium">{DIM[QS[qi].dim].label}</span>
              </div>
              <div className="h-1 bg-[#E8E5DF] rounded-full overflow-hidden">
                <div className="h-full bg-[#B8975A] rounded-full transition-all duration-500" style={{ width: `${(qi / QS.length) * 100}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-10 border border-[#E8E5DF] mb-8">
              <p className="font-display text-xl text-[#1A1A1A] leading-relaxed italic">&ldquo;{QS[qi].text}&rdquo;</p>
            </div>

            <div className="flex justify-between text-[10px] text-[#888] mb-3 px-2">
              <span>Strongly Disagree</span><span>Strongly Agree</span>
            </div>
            <div className="flex gap-3 justify-center">
              {[1,2,3,4,5].map(v => (
                <button key={v} onClick={() => handleAnswer(v)}
                  className="w-14 h-14 rounded-lg border border-[#E8E5DF] bg-white text-lg font-display text-[#333] hover:bg-[#B8975A] hover:text-white hover:border-[#B8975A] transition-all">
                  {v}
                </button>
              ))}
            </div>
            {qi > 0 && <button onClick={() => setQi(qi-1)} className="mt-6 text-xs text-[#888] hover:text-[#333]">← Previous</button>}
          </div>
        )}

        {step === 'profile' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="font-display text-2xl text-[#1A1A1A] mb-2">Assessment Complete</h2>
              <p className="text-[#888] text-sm">Enter your details to receive your personalised behavioural report.</p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-[#E8E5DF]">
              <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4">Your Details</p>
              <div className="grid grid-cols-2 gap-x-4">
                <div className="mb-4">
                  <label className="block text-[11px] font-medium text-[#333] mb-1">First Name <span className="text-red-500">*</span></label>
                  <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} />
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-medium text-[#333] mb-1">Last Name</label>
                  <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Email Address <span className="text-red-500">*</span></label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className={inputClass} />
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Phone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+353 86 172 0090" className={inputClass} />
              </div>

              <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4 mt-6">Professional Details</p>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Industry <span className="text-red-500">*</span></label>
                <select value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Seniority Level</label>
                <select value={seniority} onChange={e => setSeniority(e.target.value)} className={inputClass}>
                  <option value="">Select...</option>
                  {SENIORITY.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Current Role / Job Title</label>
                <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Operations Director" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <div className="mb-4">
                  <label className="block text-[11px] font-medium text-[#333] mb-1">Experience</label>
                  <select value={experience} onChange={e => setExperience(e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    {EXPERIENCE.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-medium text-[#333] mb-1">Highest Qualification</label>
                  <select value={qualification} onChange={e => setQualification(e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    {QUALIFICATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4 mt-6">Organisation</p>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Company / Organisation</label>
                <input value={company} onChange={e => setCompany(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-x-4">
                <div className="mb-4">
                  <label className="block text-[11px] font-medium text-[#333] mb-1">Location</label>
                  <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Dublin, Ireland" className={inputClass} />
                </div>
                <div className="mb-4">
                  <label className="block text-[11px] font-medium text-[#333] mb-1">LinkedIn Profile</label>
                  <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/..." className={inputClass} />
                </div>
              </div>

              <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4 mt-6">Consent</p>
              <label className="flex gap-3 cursor-pointer text-xs text-[#333] leading-relaxed mb-3">
                <input type="checkbox" checked={gdprConsent} onChange={e => setGdprConsent(e.target.checked)} className="mt-0.5 accent-[#B8975A]" />
                <span>I consent to Prism Executive processing my personal data to generate my behavioural report. My data will be handled in accordance with GDPR. I understand I can request deletion at any time. <span className="text-red-500">*</span></span>
              </label>
              <label className="flex gap-3 cursor-pointer text-xs text-[#888] leading-relaxed mb-6">
                <input type="checkbox" checked={marketingConsent} onChange={e => setMarketingConsent(e.target.checked)} className="mt-0.5 accent-[#B8975A]" />
                <span>I would like to receive industry insights, salary benchmarks, and executive opportunities from Prism Executive (optional)</span>
              </label>

              <button onClick={submitAssessment} disabled={!firstName || !email || !gdprConsent || loading}
                className="w-full bg-[#B8975A] hover:bg-[#96793F] text-white py-3 rounded-lg text-sm font-medium tracking-wide transition-colors disabled:opacity-40">
                {loading ? 'Generating your report...' : 'VIEW MY RESULTS'}
              </button>
              <p className="text-center text-[10px] text-[#888] mt-3">Your data is encrypted and stored in compliance with GDPR</p>
            </div>
          </div>
        )}

        {step === 'results' && scores && (
          <div>
            <div className="bg-[#1A1A1A] rounded-xl p-8 text-center mb-6">
              <p className="text-[#B8975A]/50 text-[9px] tracking-[0.3em] uppercase mb-2">Explorer Report</p>
              <h2 className="font-display text-2xl text-white mb-1">{firstName}&apos;s Behavioural Profile</h2>
              <p className="text-white/30 text-xs">{role && `${role} · `}{industry && `${industry} · `}{new Date().toLocaleDateString('en-IE')}</p>
            </div>

            <div className="bg-white rounded-xl p-8 border border-[#E8E5DF] mb-6">
              <h3 className="font-display text-lg text-[#1A1A1A] mb-6">Dimension Scores</h3>
              {Object.entries(DIM).map(([k, d]) => (
                <div key={k} className="mb-5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-[#333]">{d.label}</span>
                    <span className="font-mono text-sm font-semibold" style={{ color: d.color }}>{(scores.scores?.[k] || 0).toFixed(1)}</span>
                  </div>
                  <div className="h-2 bg-[#F5F3EF] rounded-full overflow-hidden border border-[#E8E5DF]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${((scores.scores?.[k] || 0) / 5) * 100}%`, background: d.color }} />
                  </div>
                </div>
              ))}
            </div>

            {scores.strengths && (
              <div className="bg-white rounded-xl p-8 border border-[#E8E5DF] mb-6">
                <h3 className="font-display text-lg text-[#1A1A1A] mb-4">Top Strengths</h3>
                {scores.strengths.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-[#E8E5DF] last:border-0">
                    <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-display" style={{ borderColor: DIM[s.dimension]?.color || '#888', color: DIM[s.dimension]?.color || '#888' }}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-[#1A1A1A] flex-1">{s.label}</span>
                    <span className="font-mono text-xs" style={{ color: DIM[s.dimension]?.color }}>{s.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            )}

            {['Gap Analysis — Natural vs Adapted','Communication Preferences','Decision-Making Profile','Leadership Style','Development Plan'].map(s => (
              <div key={s} className="bg-white rounded-xl px-6 py-4 border border-dashed border-[#E8E5DF] mb-2 flex items-center justify-between opacity-50">
                <span className="text-xs text-[#888]">{s}</span>
                <span className="text-[9px] text-[#888] tracking-wider uppercase">Professional</span>
              </div>
            ))}

            <div className="bg-white rounded-xl p-8 border border-[#E8E5DF] mt-6 text-center">
              <h3 className="font-display text-lg text-[#1A1A1A] mb-2">Unlock Your Full 15-Page Report</h3>
              <p className="text-xs text-[#888] mb-6">Complete 80-item assessment with gap analysis, communication guide, leadership style, and personalised development plan.</p>
              <Link href="/pricing" className="inline-block bg-[#B8975A] hover:bg-[#96793F] text-white px-8 py-3 rounded-lg text-sm font-medium tracking-wide transition-colors">
                VIEW PRICING — FROM €49
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
