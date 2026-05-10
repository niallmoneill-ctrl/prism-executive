import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@17";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function sendEmail(type: string, data: Record<string, any>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ type, data }),
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createClient(
    SUPABASE_URL,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (event.type) {

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier;
        const type = session.metadata?.type;
        if (!userId || !tier) break;

        await supabase.from("profiles").update({
          subscription_tier: tier,
          stripe_customer_id: session.customer as string,
        }).eq("id", userId);

        await supabase.from("subscriptions").insert({
          profile_id: userId,
          tier,
          status: "active",
          amount_cents: session.amount_total || 0,
          interval: type === "one_time" ? "one_time" : "year",
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string || null,
          current_period_start: new Date().toISOString(),
        });

        await supabase.from("activities").insert({
          type: "payment_received",
          description: `${tier} activated — €${((session.amount_total || 0) / 100).toFixed(2)}`,
          actor_id: userId,
          metadata: { tier, amount: session.amount_total },
        });

        // ── EMAIL: Payment confirmation ──────────────────────────────────
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, email")
          .eq("id", userId)
          .maybeSingle();

        if (profile?.email) {
          const tierLabels: Record<string, string> = {
            professional: "Professional",
            enterprise_50: "Enterprise",
            practitioner: "Practitioner",
          };
          const amounts: Record<string, string> = {
            professional: "€49",
            enterprise_50: "€2,500",
            practitioner: "€1,500",
          };
          await sendEmail("payment_confirmation", {
            email: profile.email,
            firstName: profile.first_name || "there",
            tier: tierLabels[tier] || tier,
            amount: amounts[tier] || `€${((session.amount_total || 0) / 100).toFixed(2)}`,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();
        if (!prof) break;

        await supabase.from("subscriptions").upsert({
          profile_id: prof.id,
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          stripe_price_id: sub.items.data[0]?.price?.id,
          tier: (sub.metadata?.tier || "professional") as any,
          status: sub.cancel_at_period_end ? "cancelled" : sub.status === "active" ? "active" : "past_due",
          amount_cents: sub.items.data[0]?.price?.unit_amount || 0,
          interval: sub.items.data[0]?.price?.recurring?.interval || "year",
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
          cancelled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
        }, { onConflict: "stripe_subscription_id" });

        await supabase.from("profiles").update({
          subscription_tier: sub.metadata?.tier || "professional",
        }).eq("id", prof.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from("subscriptions").update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);

        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("profile_id")
          .eq("stripe_subscription_id", sub.id)
          .single();
        if (subRecord?.profile_id) {
          await supabase.from("profiles").update({ subscription_tier: "explorer" }).eq("id", subRecord.profile_id);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await supabase.from("payments").insert({
          amount_cents: invoice.amount_paid,
          currency: invoice.currency,
          method: "stripe",
          stripe_payment_id: invoice.payment_intent as string,
          status: "succeeded",
        });
        await supabase.from("activities").insert({
          type: "payment_received",
          description: `Payment — €${(invoice.amount_paid / 100).toFixed(2)} (${invoice.lines.data[0]?.description || "Subscription"})`,
          metadata: { stripe_invoice: invoice.id, customer: invoice.customer },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await supabase.from("subscriptions").update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }

      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 });
  }
});
