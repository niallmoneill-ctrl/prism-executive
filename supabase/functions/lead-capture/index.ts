import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    if (!body.email || !body.firstName) {
      return new Response(
        JSON.stringify({ error: "Email and first name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sourceMap: Record<string, string> = {
      "benchmark": "benchmark_tool",
      "mishire": "mishire_tool",
      "salary": "salary_tool",
      "talent": "talent_tool",
      "assessment": "free_assessment",
    };

    const source = sourceMap[body.toolUsed] || "website";

    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    const validIndustries = ['healthcare','pharma','finance','construction','solar','engineering','professional_services','fmcg','ict','not_for_profit','other'];
    let industry = body.industry ? body.industry.toLowerCase().replace(/[& ]+/g, '_').replace(/_+/g, '_') : null;
    if (industry && !validIndustries.includes(industry)) industry = 'other';

    const leadData = {
      first_name: body.firstName,
      last_name: body.lastName || null,
      email: body.email,
      phone: body.phone || null,
      company_name: body.company || null,
      company_size: body.companySize || null,
      job_title: body.title || null,
      website: body.website || null,
      industry,
      role_hiring: body.roleHiring || body.role || null,
      urgency: body.urgency || null,
      location: body.location || null,
      challenge: body.challenge || null,
      source,
      tool_used: body.toolUsed || null,
      status: "new",
    };

    let lead;
    const isNew = !existing;

    if (existing) {
      const { data, error } = await supabase.from("leads").update(leadData).eq("id", existing.id).select().single();
      if (error) throw new Error(`Update lead: ${error.message}`);
      lead = data;
    } else {
      const { data, error } = await supabase.from("leads").insert(leadData).select().single();
      if (error) throw new Error(`Insert lead: ${error.message}`);
      lead = data;
    }

    await supabase.from("activities").insert({
      type: "lead_created",
      description: `New lead: ${body.firstName} ${body.lastName || ""} from ${body.company || "Unknown"} via ${body.toolUsed || "website"}`,
      actor_name: `${body.firstName} ${body.lastName || ""}`.trim(),
      lead_id: lead.id,
      metadata: { source: body.toolUsed, lead_score: lead.lead_score, industry: body.industry },
    });

    // ── EMAIL TRIGGERS ──────────────────────────────────────────────────────
    if (isNew) {
      // Alert Orla about new lead
      await sendEmail("lead_alert", {
        ...lead,
        first_name: body.firstName,
        last_name: body.lastName || "",
        email: body.email,
        phone: body.phone || "",
        job_title: body.title || "",
        company_name: body.company || "",
        industry: body.industry || "",
        seniority: body.seniority || "",
        role_hiring: body.roleHiring || body.role || "",
        urgency: body.urgency || "",
        tool_used: body.toolUsed || "website",
        lead_score: lead.lead_score || 0,
      });
    }

    return new Response(
      JSON.stringify({ success: true, leadId: lead.id, leadScore: lead.lead_score }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Lead capture error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to capture lead", detail: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
