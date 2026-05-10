'use client';
import { useState } from 'react';
import Link from 'next/link';
import { FUNCTIONS_URL } from '@/lib/supabase';

const TIERS = [
  { name:'EXPLORER', price:'Free', sub:'', tier:'', features:['12-item assessment','Summary behaviour map','Top 3 strengths','2-page report'], pop:false, cta:'Start Free', href:'/assess', checkout:false },
  { name:'PROFESSIONAL', price:'€49', sub:'/assessment', tier:'professional', features:['Full 80-item assessment','Natural + Adapted maps','8 sub-dimension scores','Gap analysis','Communication guide','Decision-making profile','Leadership style','15-page report','Development plan'], pop:true, cta:'Get Started', href:'', checkout:true },
  { name:'ENTERPRISE', price:'From €2,500', sub:'/year', tier:'enterprise_50', features:['Unlimited assessments','Team diagnostics','360° feedback','Job benchmarking','Candidate match scoring','API & HR integration','Dedicated account manager'], pop:false, cta:'Contact Us', href:'mailto:orla.brennan@prismexecutive.ie?subject=Enterprise%20Enquiry', checkout:false },
  { name:'PRACTITIONER', price:'€1,500', sub:'/certification', tier:'practitioner', features:['Certification training','Practitioner licence','All instruments','Debrief training','CPD credits','Co-branding rights','10 assessment credits'], pop:false, cta:'Apply', href:'mailto:orla.brennan@prismexecutive.ie?subject=Practitioner%20Certification', checkout:false },
];

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string|null>(null);
  const [success, setSuccess] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  // Check URL params on mount
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && !success) setSuccess(true);
    if (params.get('cancelled') === 'true' && !cancelled) setCancelled(true);
  }

  const handleCheckout = async (tier: string) => {
    setLoadingTier(tier);
    try {
      const res = await fetch(`${FUNCTIONS_URL}/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/pricing?success=true`,
          cancelUrl: `${window.location.origin}/pricing?cancelled=true`,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error creating checkout. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    }
    setLoadingTier(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      <nav className="sticky top-0 z-50 bg-[#1A1A1A] px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 border border-[#B8975A]/40 rounded flex items-center justify-center font-display text-xl font-semibold text-[#B8975A]">P</div>
          <span className="text-[#B8975A] text-xs tracking-[0.25em]">PRISM EXECUTIVE</span>
        </Link>
        <Link href="/assess" className="text-[11px] tracking-[0.15em] uppercase text-white/50 hover:text-[#B8975A] transition-colors">Free Assessment</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8 text-center">
            <h3 className="font-display text-xl text-green-800 mb-2">Payment Successful</h3>
            <p className="text-sm text-green-700">Thank you. Your account has been upgraded. You can now access your full assessment.</p>
            <Link href="/assess" className="inline-block mt-4 px-6 py-2 bg-green-700 text-white rounded-lg text-sm font-medium">Start Full Assessment</Link>
          </div>
        )}

        {cancelled && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-center">
            <p className="text-sm text-amber-800">Payment was cancelled. You can try again below or contact us if you have questions.</p>
          </div>
        )}

        <div className="text-center mb-14">
          <p className="text-[#888] text-[10px] tracking-[0.3em] uppercase mb-3">Subscription Tiers</p>
          <h1 className="font-display text-3xl text-[#1A1A1A] mb-3">Choose Your Plan</h1>
          <p className="text-[#888] text-sm max-w-md mx-auto">From individual assessments to enterprise-wide behavioural intelligence.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {TIERS.map(t => (
            <div key={t.name} className={`rounded-xl p-7 relative ${t.pop ? 'bg-[#1A1A1A] text-white border-2 border-[#B8975A]' : 'bg-white text-[#333] border border-[#E8E5DF]'}`}>
              {t.pop && <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#B8975A] text-white px-4 py-0.5 rounded-full text-[9px] font-semibold tracking-wider">RECOMMENDED</div>}
              <p className={`text-[10px] tracking-[0.2em] font-semibold mb-4 ${t.pop ? 'text-[#B8975A]' : 'text-[#888]'}`}>{t.name}</p>
              <p className="mb-1"><span className="font-display text-3xl font-semibold">{t.price}</span>{t.sub && <span className="text-sm opacity-50">{t.sub}</span>}</p>
              <div className="h-px bg-current opacity-10 my-5" />
              {t.features.map(f => <p key={f} className="flex gap-2 mb-2 text-xs"><span className="text-[#B8975A]">—</span><span className={t.pop ? 'opacity-80' : ''}>{f}</span></p>)}

              {t.checkout ? (
                <button onClick={() => handleCheckout(t.tier)} disabled={loadingTier === t.tier}
                  className={`block w-full text-center py-2.5 rounded-lg text-xs font-medium tracking-wider uppercase mt-5 transition-colors ${
                    t.pop ? 'bg-[#B8975A] text-white hover:bg-[#96793F]' : 'border border-[#B8975A] text-[#B8975A] hover:bg-[#B8975A] hover:text-white'
                  } disabled:opacity-50`}>
                  {loadingTier === t.tier ? 'Loading...' : t.cta}
                </button>
              ) : (
                <Link href={t.href} className={`block text-center py-2.5 rounded-lg text-xs font-medium tracking-wider uppercase mt-5 transition-colors ${
                  t.pop ? 'bg-[#B8975A] text-white hover:bg-[#96793F]' : 'border border-[#B8975A] text-[#B8975A] hover:bg-[#B8975A] hover:text-white'
                }`}>
                  {t.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-xs text-[#888]">All prices exclude VAT (23%). Secure payment via Stripe. Cancel anytime.</p>
          <p className="text-xs text-[#888] mt-1">Questions? Contact <a href="mailto:orla.brennan@prismexecutive.ie" className="text-[#B8975A] hover:underline">orla.brennan@prismexecutive.ie</a></p>
        </div>
      </div>

      <footer className="bg-[#1A1A1A] py-8 text-center">
        <p className="text-[#B8975A] text-xs tracking-[0.25em] mb-2">PRISM EXECUTIVE</p>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Prism Executive Ltd</p>
      </footer>
    </div>
  );
}
