import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AssessmentResponse {
  questionId: number;
  dimension: string;
  subDimension: string;
  context?: string; // 'natural' | 'adapted' | undefined (explorer has no context)
  response: number;
  responseTimeMs?: number;
}

const SUB_DIM_LABELS: Record<string, Record<string, string>> = {
  dopamine:     { A: "Novelty Seeking",        B: "Creative Drive" },
  serotonin:    { A: "Order & Systems",         B: "Detail Orientation" },
  testosterone: { A: "Decisiveness",            B: "Direct Communication" },
  estrogen:     { A: "Emotional Intelligence",  B: "Collaborative Spirit" },
};

const avg = (arr: number[]) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const round1 = (n: number) => Math.round(n * 10) / 10;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const {
      responses, tier, durationSeconds,
      firstName, lastName, email, phone,
      industry, seniority, role, company, location, linkedin,
    } = body;

    if (!responses || !Array.isArray(responses) || responses.length === 0) {
      return new Response(
        JSON.stringify({ error: "Responses array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isProfessional = tier === "professional";
    const DIMS = ["dopamine", "serotonin", "testosterone", "estrogen"];

    // Buckets
    const naturalByDim:  Record<string, number[]> = { dopamine: [], serotonin: [], testosterone: [], estrogen: [] };
    const adaptedByDim:  Record<string, number[]> = { dopamine: [], serotonin: [], testosterone: [], estrogen: [] };
    const allByDim:      Record<string, number[]> = { dopamine: [], serotonin: [], testosterone: [], estrogen: [] };
    const subScores:     Record<string, number[]> = {};

    for (const r of (responses as AssessmentResponse[])) {
      if (r.dimension === "sd") continue;
      if (!DIMS.includes(r.dimension)) continue;

      const val = r.response;
      allByDim[r.dimension].push(val);

      if (isProfessional) {
        if (r.context === "adapted") {
          adaptedByDim[r.dimension].push(val);
        } else {
          // 'natural' or undefined → natural
          naturalByDim[r.dimension].push(val);
        }
      }

      // Sub-dimension
      const subKey = `${r.dimension}_${r.subDimension}`;
      if (!subScores[subKey]) subScores[subKey] = [];
      subScores[subKey].push(val);
    }

    // Overall scores (use natural for professional, all for explorer)
    const scoreSource = isProfessional ? naturalByDim : allByDim;
    const scores = {
      dopamine:     round1(avg(scoreSource.dopamine)),
      serotonin:    round1(avg(scoreSource.serotonin)),
      testosterone: round1(avg(scoreSource.testosterone)),
      estrogen:     round1(avg(scoreSource.estrogen)),
    };

    // Adapted scores (professional only)
    const adaptedScores = isProfessional ? {
      adaptedDopamine:     round1(avg(adaptedByDim.dopamine)),
      adaptedSerotonin:    round1(avg(adaptedByDim.serotonin)),
      adaptedTestosterone: round1(avg(adaptedByDim.testosterone)),
      adaptedEstrogen:     round1(avg(adaptedByDim.estrogen)),
    } : {};

    // Natural scores (professional only — alias for clarity in report generation)
    const naturalScores = isProfessional ? {
      naturalDopamine:     scores.dopamine,
      naturalSerotonin:    scores.serotonin,
      naturalTestosterone: scores.testosterone,
      naturalEstrogen:     scores.estrogen,
    } : {};

    // Sub-dimension results
    const subScoreResults: Record<string, number> = {};
    for (const [key, vals] of Object.entries(subScores)) {
      subScoreResults[key] = round1(avg(vals));
    }

    const overall = round1((scores.dopamine + scores.serotonin + scores.testosterone + scores.estrogen) / 4);

    // Top strengths
    const allSubs = Object.entries(subScoreResults).map(([key, score]) => {
      const [dim, sub] = key.split("_");
      return { dimension: dim, subDimension: sub, score, label: SUB_DIM_LABELS[dim]?.[sub] || key };
    });
    const strengths = allSubs.sort((a, b) => b.score - a.score).slice(0, 5);

    // Map industry string → enum
    const validIndustries = ["healthcare","pharma","finance","construction","solar","engineering","professional_services","fmcg","ict","not_for_profit","other"];
    let mappedIndustry = industry
      ? industry.toLowerCase().replace(/[&\s]+/g, "_").replace(/_+/g, "_")
      : null;
    if (mappedIndustry && !validIndustries.includes(mappedIndustry)) mappedIndustry = "other";

    // Insert assessment
    const { data: assessment, error: assessError } = await supabase
      .from("assessments")
      .insert({
        first_name:                  firstName || null,
        last_name:                   lastName || null,
        email:                       email || null,
        tier:                        tier || "explorer",
        status:                      "completed",
        started_at:                  new Date(Date.now() - (durationSeconds || 300) * 1000).toISOString(),
        completed_at:                new Date().toISOString(),
        score_overall:               overall,
        score_dopamine:              scores.dopamine,
        score_serotonin:             scores.serotonin,
        score_testosterone:          scores.testosterone,
        score_estrogen:              scores.estrogen,
        adapted_dopamine:            adaptedScores.adaptedDopamine ?? null,
        adapted_serotonin:           adaptedScores.adaptedSerotonin ?? null,
        adapted_testosterone:        adaptedScores.adaptedTestosterone ?? null,
        adapted_estrogen:            adaptedScores.adaptedEstrogen ?? null,
        score_novelty_seeking:       subScoreResults["dopamine_A"] ?? null,
        score_creative_drive:        subScoreResults["dopamine_B"] ?? null,
        score_order_systems:         subScoreResults["serotonin_A"] ?? null,
        score_detail_orientation:    subScoreResults["serotonin_B"] ?? null,
        score_decisiveness:          subScoreResults["testosterone_A"] ?? null,
        score_direct_communication:  subScoreResults["testosterone_B"] ?? null,
        score_emotional_intelligence:subScoreResults["estrogen_A"] ?? null,
        score_collaborative_spirit:  subScoreResults["estrogen_B"] ?? null,
        validity_flag:               true,
        questions_answered:          responses.length,
        total_questions:             isProfessional ? 80 : 12,
        duration_seconds:            durationSeconds || null,
      })
      .select()
      .single();

    if (assessError) throw new Error(`Assessment insert: ${assessError.message}`);

    // Store individual responses
    const responseRows = (responses as AssessmentResponse[]).map(r => ({
      assessment_id:   assessment.id,
      question_id:     r.questionId,
      dimension:       r.dimension,
      sub_dimension:   r.subDimension,
      response:        r.response,
      response_time_ms:r.responseTimeMs || null,
    }));
    await supabase.from("assessment_responses").insert(responseRows);

    // Upsert candidate
    if (firstName && email) {
      const { data: existing } = await supabase
        .from("candidates").select("id").eq("email", email).maybeSingle();

      if (existing) {
        await supabase.from("candidates").update({
          prism_score: overall,
          latest_assessment_id: assessment.id,
        }).eq("id", existing.id);
      } else {
        await supabase.from("candidates").insert({
          first_name:           firstName,
          last_name:            lastName || "",
          email,
          phone:                phone || null,
          current_title:        role || null,
          current_company:      company || null,
          industry:             mappedIndustry,
          linkedin_url:         linkedin || null,
          location:             location || null,
          source:               tier === "professional" ? "website" : "free_assessment",
          prism_score:          overall,
          latest_assessment_id: assessment.id,
          gdpr_consent:         true,
          gdpr_consent_date:    new Date().toISOString(),
          is_active:            true,
        });
      }
    }

    // Activity log
    await supabase.from("activities").insert({
      type:        "assessment_completed",
      description: `${tier === "professional" ? "Professional" : "Explorer"} assessment — ${firstName || "Anonymous"} ${lastName || ""} — ${overall}/5.0`,
      actor_name:  firstName ? `${firstName} ${lastName || ""}`.trim() : null,
      assessment_id: assessment.id,
      metadata: { score: overall, tier, email, strengths: strengths.slice(0, 3).map(s => s.label) },
    });

    return new Response(
      JSON.stringify({
        success: true,
        assessmentId: assessment.id,
        scores: {
          overall,
          ...scores,
          ...naturalScores,
          ...adaptedScores,
          subScores: subScoreResults,
        },
        strengths,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Assessment scoring error:", error);
    return new Response(
      JSON.stringify({ error: "Scoring failed", detail: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
