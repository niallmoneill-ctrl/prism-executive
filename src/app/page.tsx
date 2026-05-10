'use client';
import Link from 'next/link';

const DIMS = [
  { key: 'exploration', label: 'Exploration & Innovation', color: 'var(--dim-exploration)', desc: 'How you approach novelty, risk, and creative thinking' },
  { key: 'structure', label: 'Structure & Planning', color: 'var(--dim-structure)', desc: 'Your preference for order, process, and precision' },
  { key: 'drive', label: 'Drive & Assertiveness', color: 'var(--dim-drive)', desc: 'Your decisiveness, confidence, and directness' },
  { key: 'connection', label: 'Connection & Empathy', color: 'var(--dim-connection)', desc: 'Your relationship-building and collaborative instinct' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-prism-bg">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-prism-black px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-gold/40 rounded flex items-center justify-center font-display text-xl font-semibold text-gold">P</div>
          <div>
            <div className="text-gold text-xs tracking-[0.25em] font-body font-medium">PRISM EXECUTIVE</div>
          </div>
        </Link>
        <div className="flex gap-6">
          {[{l:'Assessment',h:'/assess'},{l:'Hiring Tools',h:'/tools'},{l:'Pricing',h:'/pricing'},{l:'Admin',h:'/admin'}].map(n => (
            <Link key={n.l} href={n.h} className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-gold transition-colors font-body">{n.l}</Link>
          ))}
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-prism-black relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-prism-black via-prism-black to-navy-light opacity-80" />
        <div className="relative max-w-4xl mx-auto px-8 py-24 text-center">
          <p className="text-gold/70 text-[10px] tracking-[0.4em] uppercase font-body mb-6">Executive Search & Behavioural Assessment</p>
          <h1 className="font-display text-5xl font-semibold text-white leading-tight mb-6">
            Understand People.<br /><span className="text-gold">Transform Decisions.</span>
          </h1>
          <p className="text-white/40 text-base max-w-lg mx-auto leading-relaxed mb-10 font-body">
            Ireland&apos;s award-winning executive search partner. Combining 30 years of recruitment expertise with neuroscience-backed behavioural assessment.
          </p>
          <div className="flex gap-5 justify-center max-w-xl mx-auto flex-wrap">
            <Link href="/assess" className="flex-1 min-w-[220px] border border-white/10 rounded-lg p-8 text-center hover:border-gold/30 transition-all group bg-white/[0.02]">
              <h3 className="font-display text-xl text-white mb-2">For Individuals</h3>
              <p className="text-white/40 text-xs mb-4 font-body">Discover your behavioural profile, strengths, and development areas</p>
              <span className="text-xs text-gold font-body tracking-wide uppercase">Free Assessment →</span>
            </Link>
            <Link href="/tools" className="flex-1 min-w-[220px] border border-white/10 rounded-lg p-8 text-center hover:border-gold/30 transition-all group bg-white/[0.02]">
              <h3 className="font-display text-xl text-white mb-2">For Employers</h3>
              <p className="text-white/40 text-xs mb-4 font-body">Build role benchmarks, calculate mis-hire costs, access salary data</p>
              <span className="text-xs text-gold font-body tracking-wide uppercase">Hiring Tools →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Four Dimensions */}
      <section className="max-w-4xl mx-auto px-8 py-20">
        <p className="text-center text-prism-muted text-[10px] tracking-[0.3em] uppercase mb-3 font-body">The Science</p>
        <h2 className="text-center font-display text-3xl text-prism-black mb-12">Four Neurochemical Dimensions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {DIMS.map(d => (
            <div key={d.key} className="bg-prism-card rounded-lg p-6 border border-prism-border">
              <div className="w-8 h-8 rounded-full mb-4" style={{ background: d.color, opacity: 0.15 }}>
                <div className="w-full h-full rounded-full border-2 flex items-center justify-center" style={{ borderColor: d.color }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                </div>
              </div>
              <h3 className="font-display text-sm text-prism-black mb-1">{d.label}</h3>
              <p className="text-[11px] text-prism-muted leading-relaxed font-body">{d.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Credentials */}
      <section className="max-w-4xl mx-auto px-8 pb-20">
        <div className="bg-prism-card rounded-lg p-6 border border-prism-border text-center">
          <p className="text-[11px] text-prism-muted font-body">ERF Best New Agency 2022 · ERF Scale-Up Recruitment Company of the Year · ERF Fellow</p>
          <p className="text-[11px] text-gold mt-2 font-body">Founded by Orla Brennan · Ireland · UK · EMEA · MENA · USA</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-prism-black py-10 text-center">
        <p className="text-gold text-xs tracking-[0.25em] mb-3">PRISM EXECUTIVE</p>
        <p className="text-white/25 text-xs font-body">info@prismexecutive.ie · +353 86 172 0090</p>
        <p className="text-white/15 text-xs font-body mt-2">© {new Date().getFullYear()} Prism Executive Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}
