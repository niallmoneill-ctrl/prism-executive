'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FUNCTIONS_URL } from '@/lib/supabase';

// ─── 80 QUESTIONS ────────────────────────────────────────────────────────────
const QS = [
  // NATURAL BEHAVIOUR (1–40)
  // Dopamine – Natural (1–10)
  { id:1,  text:"I actively seek out situations that challenge my existing thinking.", dim:"dopamine", sub:"A", ctx:"natural" },
  { id:2,  text:"I find routine tasks demotivating over extended periods.", dim:"dopamine", sub:"A", ctx:"natural" },
  { id:3,  text:"Exploring multiple possibilities energises me before committing to one.", dim:"dopamine", sub:"B", ctx:"natural" },
  { id:4,  text:"I am drawn to creative problem-solving and unconventional approaches.", dim:"dopamine", sub:"B", ctx:"natural" },
  { id:5,  text:"I thrive when given the freedom to experiment and try new things.", dim:"dopamine", sub:"A", ctx:"natural" },
  { id:6,  text:"I naturally gravitate toward novelty and variety over the familiar.", dim:"dopamine", sub:"A", ctx:"natural" },
  { id:7,  text:"I enjoy thinking across disciplines and connecting unrelated ideas.", dim:"dopamine", sub:"B", ctx:"natural" },
  { id:8,  text:"Uncertainty in new ventures excites rather than unsettles me.", dim:"dopamine", sub:"A", ctx:"natural" },
  { id:9,  text:"I am often the first to suggest a new approach or method.", dim:"dopamine", sub:"B", ctx:"natural" },
  { id:10, text:"I prefer to reimagine processes rather than follow established ones.", dim:"dopamine", sub:"B", ctx:"natural" },
  // Serotonin – Natural (11–20)
  { id:11, text:"I am naturally drawn to creating systems and structured processes.", dim:"serotonin", sub:"A", ctx:"natural" },
  { id:12, text:"I feel most at ease when I have a clear plan to follow.", dim:"serotonin", sub:"A", ctx:"natural" },
  { id:13, text:"I find genuine satisfaction in completing tasks against a structured list.", dim:"serotonin", sub:"A", ctx:"natural" },
  { id:14, text:"Precision and accuracy feel important to me in most situations.", dim:"serotonin", sub:"B", ctx:"natural" },
  { id:15, text:"I prefer to fully understand the rules and constraints before acting.", dim:"serotonin", sub:"A", ctx:"natural" },
  { id:16, text:"I naturally notice errors, inconsistencies, or overlooked details.", dim:"serotonin", sub:"B", ctx:"natural" },
  { id:17, text:"I find comfort in established procedures and clear expectations.", dim:"serotonin", sub:"A", ctx:"natural" },
  { id:18, text:"I like to prepare thoroughly before beginning any significant project.", dim:"serotonin", sub:"B", ctx:"natural" },
  { id:19, text:"I tend to be methodical and systematic in how I approach work.", dim:"serotonin", sub:"A", ctx:"natural" },
  { id:20, text:"I would rather take more time to do something correctly than rush it.", dim:"serotonin", sub:"B", ctx:"natural" },
  // Testosterone – Natural (21–30)
  { id:21, text:"I am comfortable taking a strong position and defending it under pressure.", dim:"testosterone", sub:"A", ctx:"natural" },
  { id:22, text:"Competitive environments tend to bring out my best performance.", dim:"testosterone", sub:"A", ctx:"natural" },
  { id:23, text:"I tend to make decisions quickly and confidently.", dim:"testosterone", sub:"A", ctx:"natural" },
  { id:24, text:"I prefer direct, clear communication over diplomatic or softened language.", dim:"testosterone", sub:"B", ctx:"natural" },
  { id:25, text:"I am motivated by achieving measurable, tangible goals and outcomes.", dim:"testosterone", sub:"A", ctx:"natural" },
  { id:26, text:"I have a strong sense of personal ambition and forward momentum.", dim:"testosterone", sub:"A", ctx:"natural" },
  { id:27, text:"I naturally take charge in ambiguous or leaderless situations.", dim:"testosterone", sub:"A", ctx:"natural" },
  { id:28, text:"I feel energised by high-pressure, fast-paced environments.", dim:"testosterone", sub:"B", ctx:"natural" },
  { id:29, text:"I am willing to challenge others' views when I believe I am right.", dim:"testosterone", sub:"B", ctx:"natural" },
  { id:30, text:"I prefer results-focused conversations over detailed process discussions.", dim:"testosterone", sub:"B", ctx:"natural" },
  // Estrogen – Natural (31–40)
  { id:31, text:"I am naturally attuned to the emotional state of those around me.", dim:"estrogen", sub:"A", ctx:"natural" },
  { id:32, text:"Building trust and genuine rapport is something I do intuitively.", dim:"estrogen", sub:"A", ctx:"natural" },
  { id:33, text:"I feel deeply affected when those close to me are struggling.", dim:"estrogen", sub:"A", ctx:"natural" },
  { id:34, text:"I prefer decisions that consider the impact on all people involved.", dim:"estrogen", sub:"B", ctx:"natural" },
  { id:35, text:"I naturally act as a confidant or sounding board for others.", dim:"estrogen", sub:"A", ctx:"natural" },
  { id:36, text:"I value harmony and cohesion in team and group environments.", dim:"estrogen", sub:"B", ctx:"natural" },
  { id:37, text:"I find it easy to adapt my style to suit different individuals.", dim:"estrogen", sub:"B", ctx:"natural" },
  { id:38, text:"I pay close attention to non-verbal cues and body language.", dim:"estrogen", sub:"A", ctx:"natural" },
  { id:39, text:"Fostering genuine, lasting relationships is one of my core motivations.", dim:"estrogen", sub:"A", ctx:"natural" },
  { id:40, text:"I consider the feelings of others carefully before sharing difficult feedback.", dim:"estrogen", sub:"B", ctx:"natural" },

  // ADAPTED BEHAVIOUR (41–80)
  // Dopamine – Adapted (41–50)
  { id:41, text:"In my current role, I regularly introduce new ideas or approaches.", dim:"dopamine", sub:"A", ctx:"adapted" },
  { id:42, text:"My job requires me to embrace change and adapt quickly.", dim:"dopamine", sub:"A", ctx:"adapted" },
  { id:43, text:"At work, I am expected to generate creative or innovative solutions.", dim:"dopamine", sub:"B", ctx:"adapted" },
  { id:44, text:"My current environment rewards experimentation and measured risk-taking.", dim:"dopamine", sub:"B", ctx:"adapted" },
  { id:45, text:"In my professional context, I often work with ambiguous or unclear briefs.", dim:"dopamine", sub:"A", ctx:"adapted" },
  { id:46, text:"My current role requires me to challenge the status quo regularly.", dim:"dopamine", sub:"A", ctx:"adapted" },
  { id:47, text:"I am expected to pioneer new methods or strategies in my position.", dim:"dopamine", sub:"B", ctx:"adapted" },
  { id:48, text:"My role pushes me to operate outside my comfort zone regularly.", dim:"dopamine", sub:"A", ctx:"adapted" },
  { id:49, text:"At work, I adapt my approach to appear more innovative than feels natural.", dim:"dopamine", sub:"B", ctx:"adapted" },
  { id:50, text:"My current organisation values creativity over process adherence.", dim:"dopamine", sub:"B", ctx:"adapted" },
  // Serotonin – Adapted (51–60)
  { id:51, text:"My current role demands a high level of accuracy and attention to detail.", dim:"serotonin", sub:"B", ctx:"adapted" },
  { id:52, text:"At work, I am expected to follow established procedures closely.", dim:"serotonin", sub:"A", ctx:"adapted" },
  { id:53, text:"My job requires careful documentation and systematic record-keeping.", dim:"serotonin", sub:"A", ctx:"adapted" },
  { id:54, text:"In my current position, I apply more structure than I naturally prefer.", dim:"serotonin", sub:"A", ctx:"adapted" },
  { id:55, text:"My role demands compliance with strict standards or regulatory frameworks.", dim:"serotonin", sub:"B", ctx:"adapted" },
  { id:56, text:"My current environment rewards precision and methodical execution.", dim:"serotonin", sub:"B", ctx:"adapted" },
  { id:57, text:"I am expected to deliver highly detailed work in my current role.", dim:"serotonin", sub:"B", ctx:"adapted" },
  { id:58, text:"My job requires me to manage complex processes and workflows.", dim:"serotonin", sub:"A", ctx:"adapted" },
  { id:59, text:"At work, I modify my pace to meet quality and accuracy expectations.", dim:"serotonin", sub:"B", ctx:"adapted" },
  { id:60, text:"My current role holds me to high compliance and governance standards.", dim:"serotonin", sub:"A", ctx:"adapted" },
  // Testosterone – Adapted (61–70)
  { id:61, text:"My current role requires me to lead and make decisions autonomously.", dim:"testosterone", sub:"A", ctx:"adapted" },
  { id:62, text:"At work, I am expected to communicate directly and assertively.", dim:"testosterone", sub:"B", ctx:"adapted" },
  { id:63, text:"My job demands that I drive results and hold others accountable.", dim:"testosterone", sub:"A", ctx:"adapted" },
  { id:64, text:"In my current role, I set the pace and direction for others.", dim:"testosterone", sub:"A", ctx:"adapted" },
  { id:65, text:"My current environment rewards competitive, high-output performance.", dim:"testosterone", sub:"A", ctx:"adapted" },
  { id:66, text:"I am expected to manage conflict and challenge others' thinking at work.", dim:"testosterone", sub:"B", ctx:"adapted" },
  { id:67, text:"My role requires me to negotiate, influence, and persuade regularly.", dim:"testosterone", sub:"B", ctx:"adapted" },
  { id:68, text:"At work, I push harder on outcomes than I would in a different context.", dim:"testosterone", sub:"A", ctx:"adapted" },
  { id:69, text:"My current position demands that I project confidence and authority.", dim:"testosterone", sub:"B", ctx:"adapted" },
  { id:70, text:"I adapt to be more forceful or decisive than I naturally am at work.", dim:"testosterone", sub:"A", ctx:"adapted" },
  // Estrogen – Adapted (71–80)
  { id:71, text:"In my current role, I am expected to build and manage key relationships.", dim:"estrogen", sub:"A", ctx:"adapted" },
  { id:72, text:"My job requires me to be empathetic and supportive of my team.", dim:"estrogen", sub:"A", ctx:"adapted" },
  { id:73, text:"At work, I adapt my communication carefully to suit different audiences.", dim:"estrogen", sub:"B", ctx:"adapted" },
  { id:74, text:"My current role involves coaching, mentoring, or developing others.", dim:"estrogen", sub:"A", ctx:"adapted" },
  { id:75, text:"I modify my natural style to be more collaborative in my current environment.", dim:"estrogen", sub:"B", ctx:"adapted" },
  { id:76, text:"My role requires me to manage team dynamics and interpersonal conflict.", dim:"estrogen", sub:"A", ctx:"adapted" },
  { id:77, text:"At work, I prioritise others' needs alongside my own goals.", dim:"estrogen", sub:"B", ctx:"adapted" },
  { id:78, text:"My current position demands high emotional intelligence and sensitivity.", dim:"estrogen", sub:"A", ctx:"adapted" },
  { id:79, text:"I adapt to be more patient and inclusive in decision-making at work.", dim:"estrogen", sub:"B", ctx:"adapted" },
  { id:80, text:"My role requires me to represent and advocate for others regularly.", dim:"estrogen", sub:"A", ctx:"adapted" },
];

const DIM = {
  dopamine:    { label: 'Exploration & Innovation', color: '#B8975A', bg: '#FBF6ED' },
  serotonin:   { label: 'Structure & Planning',     color: '#4A7C9E', bg: '#EDF4F9' },
  testosterone:{ label: 'Drive & Assertiveness',    color: '#8B4A4A', bg: '#F9EDEC' },
  estrogen:    { label: 'Connection & Empathy',     color: '#4A8B6F', bg: '#EDF5F1' },
};

const INDUSTRIES = ['Healthcare','Pharmaceuticals & Biotech','Financial Services','Construction & Infrastructure','Solar & Renewable Energy','Engineering & Manufacturing','Professional Services','FMCG & Retail','ICT & Technology','Not-For-Profit','Other'];
const SENIORITY  = ['C-Suite (CEO, CFO, COO, CTO)','Director / VP','Senior Manager','Manager','Team Lead','Individual Contributor','Student / Graduate'];
const EXPERIENCE = ['0–2 years','3–5 years','6–10 years','11–15 years','16–20 years','20+ years','30+ years'];
const QUALIFICATIONS = ["Doctorate (PhD, DBA, MD)","Master's (MSc, MBA, MA)","Postgraduate Diploma","Bachelor's Degree","Professional (ACA, ACCA, CIPD)","Higher Diploma / HND","Trade / Apprenticeship","Leaving Certificate","Other"];

const inputClass = "w-full px-3 py-2.5 rounded-lg border border-[#E8E5DF] text-sm outline-none focus:border-[#B8975A] bg-white";

type Step = 'verify' | 'intro' | 'assess' | 'profile' | 'generating' | 'report';

// ─── BRAIN MAP SVG ────────────────────────────────────────────────────────────
function BrainMap({ natural, adapted }: { natural: Record<string,number>; adapted: Record<string,number> }) {
  const cx = 160; const cy = 160; const R = 120;
  const dims = ['dopamine','serotonin','testosterone','estrogen'];
  const angles = [-90, 0, 90, 180]; // top, right, bottom, left

  const toXY = (dim: string, score: number, idx: number) => {
    const angle = (angles[idx] * Math.PI) / 180;
    const r = (score / 5) * R;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const natPoints = dims.map((d, i) => toXY(d, natural[d] || 0, i));
  const adapPoints = dims.map((d, i) => toXY(d, adapted[d] || 0, i));
  const toPath = (pts: {x:number;y:number}[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';

  // Axis lines
  const axisEnds = dims.map((_, i) => {
    const angle = (angles[i] * Math.PI) / 180;
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  return (
    <svg viewBox="0 0 320 320" className="w-full max-w-xs mx-auto">
      {/* Grid rings */}
      {[1,2,3,4,5].map(r => (
        <circle key={r} cx={cx} cy={cy} r={(r/5)*R} fill="none" stroke="#E8E5DF" strokeWidth="0.5"/>
      ))}
      {/* Axis lines */}
      {axisEnds.map((pt, i) => (
        <line key={i} x1={cx} y1={cy} x2={pt.x} y2={pt.y} stroke="#E8E5DF" strokeWidth="0.5"/>
      ))}
      {/* Adapted (dashed) */}
      <path d={toPath(adapPoints)} fill="#B8975A" fillOpacity="0.08" stroke="#B8975A" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* Natural (solid) */}
      <path d={toPath(natPoints)} fill="#B8975A" fillOpacity="0.15" stroke="#B8975A" strokeWidth="2"/>
      {/* Dimension labels */}
      {dims.map((d, i) => {
        const angle = (angles[i] * Math.PI) / 180;
        const lx = cx + (R + 20) * Math.cos(angle);
        const ly = cy + (R + 20) * Math.sin(angle);
        return (
          <text key={d} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill={DIM[d as keyof typeof DIM].color} fontWeight="600">
            {DIM[d as keyof typeof DIM].label.split(' ')[0]}
          </text>
        );
      })}
      {/* Natural dots */}
      {natPoints.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="4" fill={DIM[dims[i] as keyof typeof DIM].color}/>
      ))}
      {/* Legend */}
      <rect x="10" y="295" width="10" height="2" fill="#B8975A"/>
      <text x="24" y="299" fontSize="7" fill="#888">Natural</text>
      <rect x="70" y="292" width="10" height="2" fill="none" stroke="#B8975A" strokeDasharray="3 2"/>
      <text x="84" y="299" fontSize="7" fill="#888">Adapted</text>
    </svg>
  );
}

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
function ScoreBar({ label, natural, adapted, color }: { label:string; natural:number; adapted:number; color:string }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[#333]">{label}</span>
        <div className="flex gap-3 text-[11px] font-mono">
          <span style={{ color }}>N {natural.toFixed(1)}</span>
          <span className="text-[#888]">A {adapted.toFixed(1)}</span>
        </div>
      </div>
      <div className="relative h-2.5 bg-[#F5F3EF] rounded-full overflow-hidden border border-[#E8E5DF]">
        <div className="h-full rounded-full transition-all duration-700 opacity-30"
          style={{ width: `${(adapted/5)*100}%`, background: color }}/>
        <div className="absolute top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${(natural/5)*100}%`, background: color, opacity: 0.9 }}/>
      </div>
    </div>
  );
}

// ─── REPORT SECTION ───────────────────────────────────────────────────────────
function ReportSection({ title, children }: { title:string; children:React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-8 border border-[#E8E5DF] mb-5">
      <h3 className="font-display text-lg text-[#1A1A1A] mb-4 pb-3 border-b border-[#E8E5DF]">{title}</h3>
      {children}
    </div>
  );
}

function TagList({ items, color }: { items:string[]; color:string }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {items.map((item, i) => (
        <span key={i} className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: color, color }}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ProfessionalAssessPage() {
  const [step, setStep]     = useState<Step>('verify');
  const [sessionId, setSID] = useState('');
  const [qi, setQi]         = useState(0);
  const [answers, setAnswers] = useState<Record<number,number>>({});
  const [scores, setScores] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [genStatus, setGenStatus] = useState('Scoring your responses…');
  const startTime = useRef(Date.now());

  // Profile state
  const [firstName, setFirstName]     = useState('');
  const [lastName, setLastName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [industry, setIndustry]       = useState('');
  const [seniority, setSeniority]     = useState('');
  const [role, setRole]               = useState('');
  const [experience, setExperience]   = useState('');
  const [qualification, setQual]      = useState('');
  const [company, setCompany]         = useState('');
  const [location, setLocation]       = useState('');
  const [linkedin, setLinkedin]       = useState('');
  const [gdpr, setGdpr]               = useState(false);
  const [marketing, setMarketing]     = useState(false);

  // Verify session on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session_id');
    if (sid && sid.startsWith('cs_')) {
      setSID(sid);
      // Try to recover saved progress
      try {
        const saved = sessionStorage.getItem('prism_pro_progress');
        if (saved) {
          const { answers: savedAnswers, qi: savedQi } = JSON.parse(saved);
          setAnswers(savedAnswers || {});
          setQi(savedQi || 0);
        }
      } catch {}
      setStep('intro');
    } else {
      window.location.href = '/pricing';
    }
  }, []);

  // Save progress to sessionStorage
  useEffect(() => {
    if (step === 'assess' && Object.keys(answers).length > 0) {
      sessionStorage.setItem('prism_pro_progress', JSON.stringify({ answers, qi }));
    }
  }, [answers, qi, step]);

  const currentSection = qi < 40 ? 'Natural Behaviour' : 'Adapted Behaviour';
  const sectionQ = qi < 40 ? qi + 1 : qi - 39;
  const sectionTotal = 40;

  const handleAnswer = (v: number) => {
    const q = QS[qi];
    setAnswers(p => ({ ...p, [q.id]: v }));
    if (qi < QS.length - 1) {
      setQi(qi + 1);
    } else {
      setStep('profile');
    }
  };

  const handlePrev = () => { if (qi > 0) setQi(qi - 1); };

  const submitAssessment = async () => {
    if (!firstName || !email || !gdpr) return;
    setStep('generating');
    startTime.current = Date.now();

    try {
      setGenStatus('Scoring your 80 responses…');
      const responses = QS.map(q => ({
        questionId: q.id,
        dimension: q.dim,
        subDimension: q.sub,
        context: q.ctx,
        response: answers[q.id] || 3,
      }));

      const scoreRes = await fetch(`${FUNCTIONS_URL}/score-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses, tier: 'professional',
          firstName, lastName, email, phone,
          industry, seniority, role, company, location, linkedin,
          durationSeconds: Math.round((Date.now() - startTime.current) / 1000),
        }),
      });
      const scoreData = await scoreRes.json();
      setScores(scoreData);

      setGenStatus('Generating your personalised 15-page report…');
      const reportRes = await fetch(`${FUNCTIONS_URL}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId: scoreData.assessmentId,
          scores: scoreData.scores,
          profile: { firstName, lastName, email, industry, seniority, role, company, experience },
        }),
      });
      const reportData = await reportRes.json();
      setReport(reportData.report);

      // Lead capture
      await fetch(`${FUNCTIONS_URL}/lead-capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email, phone, industry, seniority, role, company, location, linkedin,
          toolUsed: 'professional_assessment', intent: 'professional',
        }),
      });

      sessionStorage.removeItem('prism_pro_progress');
      setStep('report');
    } catch (err) {
      console.error(err);
      alert('Something went wrong generating your report. Please try again or contact orla.brennan@prismexecutive.ie');
      setStep('profile');
    }
  };

  const handlePrint = () => window.print();

  // ── VERIFY ──────────────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex items-center justify-center">
        <p className="text-[#888] text-sm">Verifying your payment…</p>
      </div>
    );
  }

  // ── NAV ─────────────────────────────────────────────────────────────────────
  const nav = (
    <nav className="sticky top-0 z-50 bg-[#1A1A1A] px-6 h-14 flex items-center justify-between print:hidden">
      <Link href="/" className="flex items-center gap-3">
        <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
        <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
      </Link>
      {step === 'assess' && (
        <div className="text-center">
          <p className="text-white/40 text-[10px] tracking-widest uppercase">{currentSection}</p>
          <p className="text-white/30 text-[10px]">Question {sectionQ} of {sectionTotal}</p>
        </div>
      )}
      <span className="text-[#B8975A] text-[10px] tracking-widest uppercase">Professional</span>
    </nav>
  );

  // ── INTRO ───────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#F5F3EF]">
        {nav}
        <div className="max-w-xl mx-auto px-6 py-16 text-center">
          <div className="bg-[#1A1A1A] rounded-xl p-14 text-white mb-8">
            <p className="text-[#B8975A]/60 text-[10px] tracking-[0.4em] uppercase mb-6">Professional Assessment</p>
            <h1 className="font-display text-3xl text-white mb-4">Your Full Behavioural Profile</h1>
            <p className="text-white/50 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              80 questions · 20–25 minutes · Two sections: Natural Behaviour and Adapted Behaviour at work.
              There are no right or wrong answers.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-10 text-left">
              {[
                ['Section 1', 'Natural Behaviour — how you instinctively prefer to operate (40 questions)'],
                ['Section 2', 'Adapted Behaviour — how you modify your approach at work (40 questions)'],
              ].map(([label, desc]) => (
                <div key={label} className="bg-white/5 rounded-lg p-4">
                  <p className="text-[#B8975A] text-[10px] tracking-widest uppercase mb-1">{label}</p>
                  <p className="text-white/60 text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
            <button onClick={() => { setStep('assess'); startTime.current = Date.now(); }}
              className="bg-[#B8975A] hover:bg-[#96793F] text-white px-12 py-3.5 rounded-lg text-sm font-medium tracking-wide transition-colors">
              BEGIN ASSESSMENT
            </button>
          </div>
          <p className="text-[#888] text-xs">Payment confirmed · Session {sessionId.slice(0, 20)}…</p>
        </div>
      </div>
    );
  }

  // ── ASSESS ──────────────────────────────────────────────────────────────────
  if (step === 'assess') {
    const q = QS[qi];
    const isNewSection = qi === 40;
    const dimInfo = DIM[q.dim as keyof typeof DIM];
    const overallPct = (qi / QS.length) * 100;

    return (
      <div className="min-h-screen bg-[#F5F3EF]">
        {nav}

        {/* Section transition notice */}
        {isNewSection && answers[40] === undefined && (
          <div className="bg-[#B8975A]/10 border-b border-[#B8975A]/20 px-6 py-3 text-center">
            <p className="text-[#B8975A] text-xs font-medium">Section 1 complete — now beginning Section 2: Adapted Behaviour</p>
          </div>
        )}

        <div className="max-w-xl mx-auto px-6 py-12">
          {/* Section label */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#B8975A] font-medium">{currentSection}</span>
            <span className="text-[10px] text-[#888]">·</span>
            <span className="text-[10px] text-[#888]">{dimInfo.label}</span>
          </div>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-[10px] text-[#888] mb-2">
              <span>Q{sectionQ} of {sectionTotal}</span>
              <span>{Math.round(overallPct)}% complete</span>
            </div>
            <div className="h-1 bg-[#E8E5DF] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${overallPct}%`, background: dimInfo.color }}/>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-xl p-10 border border-[#E8E5DF] mb-8">
            <p className="text-[10px] tracking-[0.25em] uppercase mb-5 font-medium" style={{ color: dimInfo.color }}>
              {q.ctx === 'natural' ? 'About you naturally' : 'About you at work'}
            </p>
            <p className="font-display text-xl text-[#1A1A1A] leading-relaxed italic">
              &ldquo;{q.text}&rdquo;
            </p>
          </div>

          {/* Scale labels */}
          <div className="flex justify-between text-[10px] text-[#888] mb-3 px-2">
            <span>Strongly Disagree</span>
            <span>Strongly Agree</span>
          </div>

          {/* Answer buttons */}
          <div className="flex gap-3 justify-center mb-6">
            {[1,2,3,4,5].map(v => (
              <button key={v} onClick={() => handleAnswer(v)}
                className={`w-14 h-14 rounded-lg border text-lg font-display transition-all ${
                  answers[q.id] === v
                    ? 'text-white border-transparent'
                    : 'border-[#E8E5DF] bg-white text-[#333] hover:border-[#B8975A] hover:text-[#B8975A]'
                }`}
                style={answers[q.id] === v ? { background: dimInfo.color, borderColor: dimInfo.color } : {}}>
                {v}
              </button>
            ))}
          </div>

          {qi > 0 && (
            <button onClick={handlePrev} className="text-xs text-[#888] hover:text-[#333] transition-colors">
              ← Previous
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── PROFILE ─────────────────────────────────────────────────────────────────
  if (step === 'profile') {
    return (
      <div className="min-h-screen bg-[#F5F3EF]">
        {nav}
        <div className="max-w-xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl text-[#1A1A1A] mb-2">Assessment Complete</h2>
            <p className="text-[#888] text-sm">Enter your details to generate your personalised 15-page report.</p>
          </div>

          <div className="bg-white rounded-xl p-8 border border-[#E8E5DF]">
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4">Your Details</p>
            <div className="grid grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">First Name <span className="text-red-500">*</span></label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass}/>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Last Name</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass}/>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#333] mb-1">Email Address <span className="text-red-500">*</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className={inputClass}/>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#333] mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+353 86 172 0090" className={inputClass}/>
            </div>

            <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4 mt-6">Professional Details</p>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#333] mb-1">Industry <span className="text-red-500">*</span></label>
              <select value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>
                <option value="">Select…</option>
                {INDUSTRIES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#333] mb-1">Seniority Level</label>
              <select value={seniority} onChange={e => setSeniority(e.target.value)} className={inputClass}>
                <option value="">Select…</option>
                {SENIORITY.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#333] mb-1">Current Role / Job Title</label>
              <input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Chief Operating Officer" className={inputClass}/>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Experience</label>
                <select value={experience} onChange={e => setExperience(e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  {EXPERIENCE.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Highest Qualification</label>
                <select value={qualification} onChange={e => setQual(e.target.value)} className={inputClass}>
                  <option value="">Select…</option>
                  {QUALIFICATIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4 mt-6">Organisation</p>
            <div className="mb-4">
              <label className="block text-[11px] font-medium text-[#333] mb-1">Company / Organisation</label>
              <input value={company} onChange={e => setCompany(e.target.value)} className={inputClass}/>
            </div>
            <div className="grid grid-cols-2 gap-x-4">
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Dublin, Ireland" className={inputClass}/>
              </div>
              <div className="mb-4">
                <label className="block text-[11px] font-medium text-[#333] mb-1">LinkedIn Profile</label>
                <input value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" className={inputClass}/>
              </div>
            </div>

            <p className="text-[10px] tracking-[0.2em] uppercase text-[#888] font-medium mb-4 mt-6">Consent</p>
            <label className="flex gap-3 cursor-pointer text-xs text-[#333] leading-relaxed mb-3">
              <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} className="mt-0.5 accent-[#B8975A]"/>
              <span>I consent to Prism Executive processing my personal data to generate my behavioural report in accordance with GDPR. <span className="text-red-500">*</span></span>
            </label>
            <label className="flex gap-3 cursor-pointer text-xs text-[#888] leading-relaxed mb-6">
              <input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} className="mt-0.5 accent-[#B8975A]"/>
              <span>I would like to receive industry insights, salary benchmarks, and executive opportunities from Prism Executive (optional)</span>
            </label>

            <button onClick={submitAssessment} disabled={!firstName || !email || !industry || !gdpr || loading}
              className="w-full bg-[#B8975A] hover:bg-[#96793F] text-white py-3.5 rounded-lg text-sm font-medium tracking-wide transition-colors disabled:opacity-40">
              GENERATE MY REPORT
            </button>
            <p className="text-center text-[10px] text-[#888] mt-3">Your data is encrypted and stored in compliance with GDPR</p>
          </div>
        </div>
      </div>
    );
  }

  // ── GENERATING ───────────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="min-h-screen bg-[#F5F3EF] flex flex-col items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 border-2 border-[#B8975A]/20 border-t-[#B8975A] rounded-full animate-spin mx-auto mb-8"/>
          <h2 className="font-display text-2xl text-[#1A1A1A] mb-3">Generating Your Report</h2>
          <p className="text-[#888] text-sm leading-relaxed">{genStatus}</p>
          <p className="text-[#888] text-xs mt-4 opacity-60">This takes 20–30 seconds. Please do not close this window.</p>
        </div>
      </div>
    );
  }

  // ── REPORT ───────────────────────────────────────────────────────────────────
  if (step === 'report' && scores && report) {
    const s = scores.scores || {};
    const nat = { dopamine: s.naturalDopamine || s.dopamine || 0, serotonin: s.naturalSerotonin || s.serotonin || 0, testosterone: s.naturalTestosterone || s.testosterone || 0, estrogen: s.naturalEstrogen || s.estrogen || 0 };
    const ada = { dopamine: s.adaptedDopamine || 0, serotonin: s.adaptedSerotonin || 0, testosterone: s.adaptedTestosterone || 0, estrogen: s.adaptedEstrogen || 0 };

    return (
      <div className="min-h-screen bg-[#F5F3EF]">
        {nav}

        {/* Print header */}
        <div className="hidden print:block p-8 border-b border-[#E8E5DF]">
          <p className="text-[#B8975A] text-xs tracking-[0.3em] uppercase">Prism Executive · Professional Behavioural Report</p>
          <h1 className="font-display text-2xl text-[#1A1A1A] mt-1">{firstName} {lastName}</h1>
          <p className="text-[#888] text-xs mt-1">{role}{industry ? ` · ${industry}` : ''} · {new Date().toLocaleDateString('en-IE', { day:'numeric', month:'long', year:'numeric' })}</p>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12">

          {/* Report header */}
          <div className="bg-[#1A1A1A] rounded-xl p-10 text-white mb-8 print:hidden">
            <p className="text-[#B8975A]/50 text-[9px] tracking-[0.4em] uppercase mb-3">Professional Report · Prism Executive</p>
            <h2 className="font-display text-3xl text-white mb-2">{firstName} {lastName}</h2>
            <p className="text-white/40 text-sm">{role}{industry ? ` · ${industry}` : ''} · {new Date().toLocaleDateString('en-IE', { day:'numeric', month:'long', year:'numeric' })}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={handlePrint}
                className="bg-[#B8975A] hover:bg-[#96793F] text-white px-6 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors">
                Download PDF
              </button>
              <a href="mailto:orla.brennan@prismexecutive.ie?subject=Professional Report Debrief"
                className="border border-white/20 text-white/70 hover:text-white hover:border-white/40 px-6 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors">
                Book a Debrief
              </a>
            </div>
          </div>

          {/* Brain Map */}
          <ReportSection title="Your Behavioural Map">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <BrainMap natural={nat} adapted={ada}/>
              <div>
                {(Object.entries(DIM) as [string, {label:string;color:string;bg:string}][]).map(([k, d]) => (
                  <ScoreBar key={k} label={d.label} natural={nat[k as keyof typeof nat]} adapted={ada[k as keyof typeof ada]} color={d.color}/>
                ))}
                <p className="text-[10px] text-[#888] mt-2">N = Natural · A = Adapted at work</p>
              </div>
            </div>
          </ReportSection>

          {/* Executive Summary */}
          <ReportSection title="Executive Summary">
            <p className="text-sm text-[#333] leading-relaxed">{report.executiveSummary}</p>
          </ReportSection>

          {/* Profile Overview */}
          <ReportSection title="Profile Overview">
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-line">{report.profileOverview}</p>
          </ReportSection>

          {/* Natural Behaviour */}
          <ReportSection title="Natural Behaviour">
            <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-line">{report.naturalBehaviour?.description}</p>
            <p className="text-xs font-medium text-[#B8975A] mb-2">Dominant Theme</p>
            <p className="text-sm text-[#333] italic mb-4">{report.naturalBehaviour?.dominantTheme}</p>
            <p className="text-xs font-medium text-[#888] mb-1">Key Traits</p>
            <TagList items={report.naturalBehaviour?.keyTraits || []} color="#B8975A"/>
          </ReportSection>

          {/* Adapted Behaviour */}
          <ReportSection title="Adapted Behaviour at Work">
            <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-line">{report.adaptedBehaviour?.description}</p>
            <p className="text-xs font-medium text-[#888] mb-1">Adaptation Pattern</p>
            <p className="text-sm text-[#333] italic mb-4">{report.adaptedBehaviour?.adaptationPattern}</p>
            <TagList items={report.adaptedBehaviour?.keyAdaptations || []} color="#4A7C9E"/>
          </ReportSection>

          {/* Gap Analysis */}
          <ReportSection title="Gap Analysis — Natural vs Adapted">
            <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-line">{report.gapAnalysis?.summary}</p>
            <div className="bg-[#FBF6ED] rounded-lg p-4 mb-4">
              <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-1">Highest Adaptation Gap</p>
              <p className="text-sm font-medium text-[#1A1A1A]">{report.gapAnalysis?.highestGapDimension}</p>
              <p className="text-xs text-[#888] mt-1">{report.gapAnalysis?.implication}</p>
            </div>
            <p className="text-xs font-medium text-[#888] mb-2">Recommendations</p>
            <ul className="space-y-2">
              {(report.gapAnalysis?.recommendations || []).map((r: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-[#333]"><span className="text-[#B8975A] mt-0.5">—</span>{r}</li>
              ))}
            </ul>
          </ReportSection>

          {/* Dimension deep dives */}
          {(['explorationProfile','structureProfile','driveProfile','connectionProfile'] as const).map(key => {
            const d = report[key];
            if (!d) return null;
            const titles: Record<string,string> = {
              explorationProfile: 'Exploration & Innovation', structureProfile: 'Structure & Planning',
              driveProfile: 'Drive & Assertiveness', connectionProfile: 'Connection & Empathy',
            };
            const colors: Record<string,string> = {
              explorationProfile: '#B8975A', structureProfile: '#4A7C9E',
              driveProfile: '#8B4A4A', connectionProfile: '#4A8B6F',
            };
            return (
              <ReportSection key={key} title={titles[key]}>
                <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-line">{d.description}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] tracking-widest uppercase mb-2" style={{ color: colors[key] }}>Strengths</p>
                    {(d.strengths || []).map((s: string, i: number) => (
                      <p key={i} className="flex gap-2 text-xs text-[#333] mb-1"><span style={{ color: colors[key] }}>—</span>{s}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-[10px] tracking-widest uppercase text-[#888] mb-2">Development Areas</p>
                    {(d.developmentAreas || []).map((s: string, i: number) => (
                      <p key={i} className="flex gap-2 text-xs text-[#333] mb-1"><span className="text-[#888]">—</span>{s}</p>
                    ))}
                  </div>
                </div>
              </ReportSection>
            );
          })}

          {/* Communication Style */}
          <ReportSection title="Communication Style Guide">
            <p className="text-sm text-[#333] leading-relaxed mb-4">{report.communicationStyle?.summary}</p>
            <p className="text-xs font-medium text-[#B8975A] mb-1">Preferred Style</p>
            <p className="text-sm text-[#333] italic mb-4">{report.communicationStyle?.preferredStyle}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#4A8B6F] mb-2">Do</p>
                {(report.communicationStyle?.doList || []).map((s: string, i: number) => (
                  <p key={i} className="flex gap-2 text-xs text-[#333] mb-1"><span className="text-[#4A8B6F]">✓</span>{s}</p>
                ))}
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#8B4A4A] mb-2">Avoid</p>
                {(report.communicationStyle?.avoidList || []).map((s: string, i: number) => (
                  <p key={i} className="flex gap-2 text-xs text-[#333] mb-1"><span className="text-[#8B4A4A]">×</span>{s}</p>
                ))}
              </div>
            </div>
            {report.communicationStyle?.inConflict && (
              <div className="bg-[#F5F3EF] rounded-lg p-4 mt-4">
                <p className="text-[10px] tracking-widest uppercase text-[#888] mb-1">In Conflict or Under Pressure</p>
                <p className="text-xs text-[#333]">{report.communicationStyle.inConflict}</p>
              </div>
            )}
          </ReportSection>

          {/* Decision Making */}
          <ReportSection title="Decision-Making Profile">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-4 py-1.5 rounded-full text-xs font-medium text-white" style={{ background: '#B8975A' }}>
                {report.decisionMaking?.style}
              </span>
            </div>
            <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-line">{report.decisionMaking?.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-2">Strengths</p>
                {(report.decisionMaking?.strengths || []).map((s: string, i: number) => (
                  <p key={i} className="flex gap-2 text-xs text-[#333] mb-1"><span className="text-[#B8975A]">—</span>{s}</p>
                ))}
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#888] mb-2">Watch Points</p>
                {(report.decisionMaking?.watchPoints || []).map((s: string, i: number) => (
                  <p key={i} className="flex gap-2 text-xs text-[#333] mb-1"><span className="text-[#888]">—</span>{s}</p>
                ))}
              </div>
            </div>
          </ReportSection>

          {/* Leadership Style */}
          <ReportSection title="Leadership Style">
            <div className="bg-[#1A1A1A] text-white rounded-xl p-6 mb-5">
              <p className="text-[#B8975A] text-[10px] tracking-widest uppercase mb-1">Leadership Archetype</p>
              <p className="font-display text-2xl">{report.leadershipStyle?.archetype}</p>
            </div>
            <p className="text-sm text-[#333] leading-relaxed mb-4 whitespace-pre-line">{report.leadershipStyle?.description}</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#EDF5F1] rounded-lg p-4">
                <p className="text-[10px] tracking-widest uppercase text-[#4A8B6F] mb-1">Ideal Environment</p>
                <p className="text-xs text-[#333]">{report.leadershipStyle?.idealEnvironment}</p>
              </div>
              <div className="bg-[#FBF6ED] rounded-lg p-4">
                <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-1">Development Priority</p>
                <p className="text-xs text-[#333]">{report.leadershipStyle?.developmentPriority}</p>
              </div>
            </div>
          </ReportSection>

          {/* Team Dynamics */}
          <ReportSection title="Team Dynamics">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Natural Team Role', report.teamDynamics?.roleInTeam, '#B8975A'],
                ['Unique Contribution', report.teamDynamics?.contribution, '#4A7C9E'],
                ['Potential Friction', report.teamDynamics?.challenge, '#8B4A4A'],
                ['Best Collaborators', report.teamDynamics?.bestCollaborators, '#4A8B6F'],
              ].map(([label, value, color]) => (
                <div key={label as string} className="bg-[#F5F3EF] rounded-lg p-4">
                  <p className="text-[10px] tracking-widest uppercase mb-1" style={{ color: color as string }}>{label as string}</p>
                  <p className="text-xs text-[#333] leading-relaxed">{value as string}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* Stress Response */}
          <ReportSection title="Stress Response & Resilience">
            <p className="text-sm text-[#333] leading-relaxed mb-4">{report.stressResponse?.description}</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#8B4A4A] mb-2">Early Warnings</p>
                {(report.stressResponse?.earlyWarnings || []).map((s: string, i: number) => (
                  <p key={i} className="text-xs text-[#333] mb-1 flex gap-1"><span className="text-[#8B4A4A]">—</span>{s}</p>
                ))}
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#4A8B6F] mb-2">Coping Strategies</p>
                {(report.stressResponse?.copingStrategies || []).map((s: string, i: number) => (
                  <p key={i} className="text-xs text-[#333] mb-1 flex gap-1"><span className="text-[#4A8B6F]">—</span>{s}</p>
                ))}
              </div>
              <div className="bg-[#EDF5F1] rounded-lg p-3">
                <p className="text-[10px] tracking-widest uppercase text-[#4A8B6F] mb-1">Recovery</p>
                <p className="text-xs text-[#333]">{report.stressResponse?.recovery}</p>
              </div>
            </div>
          </ReportSection>

          {/* Development Plan */}
          <ReportSection title="Development Plan">
            <p className="text-sm text-[#333] leading-relaxed mb-6 whitespace-pre-line">{report.developmentPlan?.overview}</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#B8975A] mb-3">Immediate Actions (0–3 months)</p>
                <ul className="space-y-2">
                  {(report.developmentPlan?.shortTerm || []).map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-xs text-[#333]">
                      <span className="w-4 h-4 rounded-full border border-[#B8975A] text-[#B8975A] flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] tracking-widest uppercase text-[#4A7C9E] mb-3">Medium Term (3–12 months)</p>
                <ul className="space-y-2">
                  {(report.developmentPlan?.mediumTerm || []).map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-xs text-[#333]">
                      <span className="w-4 h-4 rounded-full border border-[#4A7C9E] text-[#4A7C9E] flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">{i+1}</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="bg-[#1A1A1A] text-white rounded-xl p-6 mt-6">
              <p className="text-[#B8975A] text-[10px] tracking-widest uppercase mb-2">Long-Term Leadership Trajectory</p>
              <p className="text-sm leading-relaxed opacity-80">{report.developmentPlan?.longTerm}</p>
            </div>
          </ReportSection>

          {/* Footer CTA */}
          <div className="bg-white rounded-xl p-8 border border-[#E8E5DF] text-center print:hidden">
            <p className="text-[10px] tracking-widest uppercase text-[#888] mb-2">Next Steps</p>
            <h3 className="font-display text-xl text-[#1A1A1A] mb-2">Book a Report Debrief with Orla</h3>
            <p className="text-xs text-[#888] mb-6 max-w-sm mx-auto">A 45-minute confidential conversation to explore your results in depth and discuss your executive career trajectory.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={handlePrint}
                className="border border-[#B8975A] text-[#B8975A] hover:bg-[#B8975A] hover:text-white px-6 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors">
                Download PDF
              </button>
              <a href="mailto:orla.brennan@prismexecutive.ie?subject=Professional Report Debrief Request"
                className="bg-[#B8975A] hover:bg-[#96793F] text-white px-6 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-colors">
                Book a Debrief
              </a>
            </div>
          </div>

          <div className="text-center mt-8 print:hidden">
            <p className="text-[#888] text-[10px]">© {new Date().getFullYear()} Prism Executive Ltd · Confidential</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
