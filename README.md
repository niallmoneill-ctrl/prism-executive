# Prism Executive

Neuroscience-based executive search & behavioural assessment platform.

## Quick Deploy

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/prism-executive.git
cd prism-executive
npm install
```

### 2. Set environment variables
Copy `.env.example` to `.env.local` and fill in your keys:
```bash
cp .env.example .env.local
```

Get your Supabase keys from:
https://supabase.com/dashboard/project/uujgdeplydevpvstvqll/settings/api

### 3. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel
1. Push to GitHub: `git add . && git commit -m "Initial deploy" && git push`
2. Go to vercel.com → Import → Select this repo
3. Add environment variables (same as .env.local)
4. Deploy

### Live URLs after deploy
- Homepage: `/`
- Assessment: `/assess`
- Employer Tools: `/tools`
- Pricing: `/pricing`
- Admin Dashboard: `/admin`

### Backend (already deployed)
- Supabase: `https://uujgdeplydevpvstvqll.supabase.co`
- Lead Capture API: `https://uujgdeplydevpvstvqll.supabase.co/functions/v1/lead-capture`
- Assessment Scoring: `https://uujgdeplydevpvstvqll.supabase.co/functions/v1/score-assessment`
- Stripe Webhook: `https://uujgdeplydevpvstvqll.supabase.co/functions/v1/stripe-webhook`
