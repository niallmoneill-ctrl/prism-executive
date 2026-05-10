import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { assessmentId, scores, profile } = body;

    const s = scores || {};
    const nat = {
      dopamine:     s.naturalDopamine     || s.dopamine     || 0,
      serotonin:    s.naturalSerotonin    || s.serotonin    || 0,
      testosterone: s.naturalTestosterone || s.testosterone || 0,
      estrogen:     s.naturalEstrogen     || s.estrogen     || 0,
    };
    const ada = {
      dopamine:     s.adaptedDopamine     || 0,
      serotonin:    s.adaptedSerotonin    || 0,
      testosterone: s.adaptedTestosterone || 0,
      estrogen:     s.adaptedEstrogen     || 0,
    };

    const prompt = `You are generating a professional executive behavioural assessment report for Prism Executive, an award-winning Irish executive search firm.

Candidate: ${profile.firstName} ${profile.lastName || ""}
Role: ${profile.role || "Executive"}
Industry: ${profile.industry || "Professional Services"}
Experience: ${profile.experience || "Not specified"}

NEUROCHEMICAL PROFILE (scale 1.0–5.0):

Natural Behaviour (how they instinctively prefer to operate):
- Exploration & Innovation (Dopamine): ${nat.dopamine.toFixed(1)}/5.0
- Structure & Planning (Serotonin):    ${nat.serotonin.toFixed(1)}/5.0
- Drive & Assertiveness (Testosterone): ${nat.testosterone.toFixed(1)}/5.0
- Connection & Empathy (Estrogen):     ${nat.estrogen.toFixed(1)}/5.0

Adapted Behaviour (how they modify at work):
- Exploration & Innovation: ${ada.dopamine.toFixed(1)}/5.0
- Structure & Planning:     ${ada.serotonin.toFixed(1)}/5.0
- Drive & Assertiveness:    ${ada.testosterone.toFixed(1)}/5.0
- Connection & Empathy:     ${ada.estrogen.toFixed(1)}/5.0

Sub-dimension scores:
- Novelty Seeking:        ${(s.subScores?.dopamine_A || 0).toFixed(1)}/5.0
- Creative Drive:         ${(s.subScores?.dopamine_B || 0).toFixed(1)}/5.0
- Order & Systems:        ${(s.subScores?.serotonin_A || 0).toFixed(1)}/5.0
- Detail Orientation:     ${(s.subScores?.serotonin_B || 0).toFixed(1)}/5.0
- Decisiveness:           ${(s.subScores?.testosterone_A || 0).toFixed(1)}/5.0
- Direct Communication:   ${(s.subScores?.testosterone_B || 0).toFixed(1)}/5.0
- Emotional Intelligence: ${(s.subScores?.estrogen_A || 0).toFixed(1)}/5.0
- Collaborative Spirit:   ${(s.subScores?.estrogen_B || 0).toFixed(1)}/5.0

Write a professional, insightful, and personalised executive behavioural report. Use the candidate's first name throughout. Be specific to their scores — do not be generic. High scores (4.0+) indicate strong preference, low scores (below 2.0) indicate low preference, mid-range (2.5–3.5) indicate flexibility.

Return ONLY a valid JSON object with no markdown, no backticks, no preamble. Use this exact structure:

{
  "executiveSummary": "3-4 sentences describing their unique behavioural signature and what makes them distinctive as an executive",
  "profileOverview": "2 substantial paragraphs about their overall behavioural profile, written directly to them using 'you'",
  "naturalBehaviour": {
    "description": "2 paragraphs about how they naturally prefer to operate, very specific to their scores",
    "dominantTheme": "One sentence naming their dominant natural theme",
    "keyTraits": ["5 specific traits derived from their scores"]
  },
  "adaptedBehaviour": {
    "description": "2 paragraphs on how they modify their behaviour at work, noting any significant shifts from natural",
    "adaptationPattern": "One sentence describing the overall adaptation pattern",
    "keyAdaptations": ["3 specific ways they adapt at work"]
  },
  "gapAnalysis": {
    "summary": "2 paragraphs on the gap between natural and adapted behaviour and what this means for energy, performance, and wellbeing",
    "highestGapDimension": "Name the dimension with the biggest natural-vs-adapted gap",
    "implication": "One sentence on the personal implication of this gap",
    "recommendations": ["3 concrete recommendations to manage or reduce adaptation cost"]
  },
  "explorationProfile": {
    "score": ${nat.dopamine.toFixed(1)},
    "description": "2 paragraphs specific to their exploration and innovation score",
    "strengths": ["3 specific strengths from this dimension"],
    "developmentAreas": ["2 specific development areas"]
  },
  "structureProfile": {
    "score": ${nat.serotonin.toFixed(1)},
    "description": "2 paragraphs specific to their structure and planning score",
    "strengths": ["3 specific strengths"],
    "developmentAreas": ["2 specific development areas"]
  },
  "driveProfile": {
    "score": ${nat.testosterone.toFixed(1)},
    "description": "2 paragraphs specific to their drive and assertiveness score",
    "strengths": ["3 specific strengths"],
    "developmentAreas": ["2 specific development areas"]
  },
  "connectionProfile": {
    "score": ${nat.estrogen.toFixed(1)},
    "description": "2 paragraphs specific to their connection and empathy score",
    "strengths": ["3 specific strengths"],
    "developmentAreas": ["2 specific development areas"]
  },
  "communicationStyle": {
    "summary": "2 sentences describing their overall communication preferences",
    "preferredStyle": "One sentence naming their communication style",
    "doList": ["4 specific things that work well when communicating with them"],
    "avoidList": ["3 things to avoid when communicating with them"],
    "inConflict": "One sentence on how they tend to respond in disagreement or conflict"
  },
  "decisionMaking": {
    "style": "Name their decision-making style (e.g. Analytical, Intuitive, Consensus-Driven, Decisive, Strategic)",
    "description": "2 paragraphs on how they characteristically make decisions based on their profile",
    "strengths": ["2 decision-making strengths"],
    "watchPoints": ["2 decision-making watch points or blind spots"]
  },
  "leadershipStyle": {
    "archetype": "Name their leadership archetype (e.g. Visionary, Architect, Commander, Connector, Coach, Strategist, Pioneer)",
    "description": "2 paragraphs on their natural leadership approach and what they bring to leadership roles",
    "idealEnvironment": "One sentence on what environment draws out their best leadership",
    "developmentPriority": "One sentence on their single most important leadership development priority"
  },
  "teamDynamics": {
    "roleInTeam": "Their natural team role in 3-5 words",
    "contribution": "One sentence on what they uniquely bring to team settings",
    "challenge": "One sentence on what can create friction or difficulty in team contexts",
    "bestCollaborators": "One sentence on the types of people they work best with"
  },
  "stressResponse": {
    "description": "2 sentences on how they characteristically respond under sustained pressure based on their profile",
    "earlyWarnings": ["3 early warning signs that they are becoming stressed"],
    "copingStrategies": ["3 strategies that help them manage pressure effectively"],
    "recovery": "One sentence on what helps them recharge and recover"
  },
  "developmentPlan": {
    "overview": "2 paragraphs on their growth trajectory and leadership potential",
    "shortTerm": ["3 specific, actionable steps for the next 0-3 months"],
    "mediumTerm": ["3 specific, actionable steps for 3-12 months"],
    "longTerm": "One sentence on their long-term leadership destination and potential"
  }
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    // Strip any accidental markdown fences
    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    const report = JSON.parse(cleaned);

    // Optionally store report in Supabase
    if (assessmentId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("assessments").update({
        report_data: report,
        report_generated_at: new Date().toISOString(),
      }).eq("id", assessmentId);
    }

    return new Response(
      JSON.stringify({ success: true, report }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Report generation error:", error);
    return new Response(
      JSON.stringify({ error: "Report generation failed", detail: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
