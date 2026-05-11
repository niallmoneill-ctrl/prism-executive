import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Tier = "professional" | "enterprise_50" | "practitioner";

interface TierConfig {
  name: string;
  description: string;
  amountCents: number;
  currency: string;
  mode: "payment" | "subscription";
  type: "one_time" | "subscription";
}

const TIERS: Record<Tier, TierConfig> = {
  professional: {
    name: "Professional Assessment",
    description: "Full 80-item behavioural assessment with personalised 15-page report",
    amountCents: 4900,
    currency: "eur",
    mode: "payment",
    type: "one_time",
  },
  enterprise_50: {
    name: "Enterprise (50 seats)",
    description: "Annual enterprise licence — unlimited assessments, team diagnostics, 360° feedback",
    amountCents: 250000,
    currency: "eur",
    mode: "payment",
    type: "one_time",
  },
  practitioner: {
    name: "Practitioner Certification",
    description: "Certification training and practitioner licence",
    amountCents: 150000,
    currency: "eur",
    mode: "payment",
    type: "one_time",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const tier = body.tier as Tier;
    const successUrl: string | undefined = body.successUrl;
    const cancelUrl: string | undefined = body.cancelUrl;
    const origin = req.headers.get("origin") || "";

    const config = TIERS[tier];
    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown tier: ${tier}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    // Resolve userId + email from the caller's auth token (if present).
    let userId: string | null = null;
    let email: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    // Treat the anon key as "no user" — only a real user JWT identifies someone.
    if (accessToken && accessToken !== anonKey) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        anonKey,
        { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
      );
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        userId = data.user.id;
        email = data.user.email ?? null;
      }
    }

    const finalSuccessUrl =
      successUrl ||
      `${origin}/assess/professional?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl =
      cancelUrl || `${origin}/pricing?cancelled=true`;

    const session = await stripe.checkout.sessions.create({
      mode: config.mode,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: config.currency,
            product_data: {
              name: config.name,
              description: config.description,
            },
            unit_amount: config.amountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      metadata: {
        tier,
        type: config.type,
        platform: "prism_executive",
        ...(userId ? { userId } : {}),
      },
      // For subscriptions, mirror metadata onto the subscription itself so
      // subscription.updated / .deleted events can resolve the tier.
      ...(config.mode === "subscription"
        ? {
            subscription_data: {
              metadata: {
                tier,
                platform: "prism_executive",
                ...(userId ? { userId } : {}),
              },
            },
          }
        : {}),
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
