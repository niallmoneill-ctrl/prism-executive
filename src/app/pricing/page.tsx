'use client';
import Link from 'next/link';

const TIERS = [
  { name:'EXPLORER', price:'Free', sub:'', features:['12-item assessment','Summary behaviour map','Top 3 strengths','2-page report'], pop:false, cta:'Start Free', href:'/assess' },
  { name:'PROFESSIONAL', price:'€49', sub:'/assessment', features:['Full 80-item assessment','Natural + Adapted maps','8 sub-dimension scores','Gap analysis','Communication guide','Decision-making profile','Leadership style','15-page report','Development plan'], pop:true, cta:'Get Started', href:'https://calendly.com/prismexecutive/consultation' },
  { name:'ENTERPRISE', price:'From €2,500', sub:'/year', features:['Unlimited assessments','Team diagnostics','360° feedback','Job benchmarking','Candidate match scoring','API & HR integration','Dedicated account manager'], pop:false, cta:'Contact Us', href:'mailto:orla.brennan@prismexecutive.ie' },
  { name:'PRACTITIONER', price:'€1,500', sub:'/certification', features:['Certification training','Practitioner licence','All instruments','Debrief training','CPD credits','Co-branding rights','10 assessment credits'], pop:false, cta:'Apply', href:'mailto:orla.brennan@prismexecutive.ie' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-prism-bg">
      <nav className="sticky top-0 z-50 bg-prism-black px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-gold/40 rounded flex items-center justify-center font-display text-xl font-semibold text-gold">P</div>
          <span className="text-gold text-xs tracking-[0.25em] font-body">PRISM EXECUTIVE</span>
        </Link>
      </nav>
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <p className="text-prism-muted text-[10px] tracking-[0.3em] uppercase mb-3 font-body">Subscription Tiers</p>
          <h1 className="font-display text-3xl text-prism-black mb-3">Choose Your Plan</h1>
          <p className="text-prism-muted text-sm font-body max-w-md mx-auto">From individual assessments to enterprise-wide behavioural intelligence.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {TIERS.map(t => (
            <div key={t.name} className={`rounded-xl p-7 relative ${t.pop ? 'bg-prism-black text-white border-2 border-gold' : 'bg-white text-prism-charcoal border border-prism-border'}`}>
              {t.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gold text-white px-4 py-0.5 rounded-full text-[9px] font-body font-semibold tracking-wider">RECOMMENDED</div>}
              <p className={`text-[10px] tracking-[0.2em] font-body font-semibold mb-4 ${t.pop ? 'text-gold' : 'text-prism-muted'}`}>{t.name}</p>
              <p className="mb-1"><span className="font-display text-3xl font-semibold">{t.price}</span>{t.sub && <span className="text-sm opacity-50 font-body">{t.sub}</span>}</p>
              <div className="h-px bg-current opacity-10 my-5" />
              {t.features.map(f => <p key={f} className="flex gap-2 mb-2 text-xs font-body"><span className="text-gold">—</span><span className={t.pop ? 'opacity-80' : ''}>{f}</span></p>)}
              <Link href={t.href} className={`block text-center py-2.5 rounded-lg text-xs font-body font-medium tracking-wider uppercase mt-5 transition-colors ${t.pop ? 'bg-gold text-white hover:bg-gold-dark' : 'border border-gold text-gold hover:bg-gold hover:text-white'}`}>
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
      <footer className="bg-prism-black py-8 text-center">
        <p className="text-gold text-xs tracking-[0.25em] mb-2">PRISM EXECUTIVE</p>
        <p className="text-white/20 text-xs font-body">© {new Date().getFullYear()} Prism Executive Ltd</p>
      </footer>
    </div>
  );
}
