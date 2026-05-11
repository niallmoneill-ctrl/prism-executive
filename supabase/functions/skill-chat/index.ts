// skill-chat
// -----------------------------------------------------------------------------
// Server-side Anthropic relay for the /admin/skills page. Keeps the
// ANTHROPIC_API_KEY off the browser. Requires a signed-in staff user.
//
// Request shape:
//   {
//     skillId: uuid,               // ai_skills.id (resolves the system prompt)
//     messages: [{ role, content }], // user/assistant turns
//     mode?: "chat" | "weekly_report",
//     max_tokens?: number,
//   }
//
// Response:
//   { text: string, usage: { ... } }
// -----------------------------------------------------------------------------

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const DEFAULT_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-5";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, 500);
  }

  // Caller must present a Supabase access token (a real user, not the anon key)
  // — and the user must be staff. We use the user-scoped client to verify
  // identity, then service-role to read the system prompt and write logs.
  const authHeader = req.headers.get("Authorization") || "";
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!accessToken || accessToken === ANON_KEY) {
    return json({ error: "Not signed in." }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return json({ error: "Not signed in." }, 401);
  }
  const user = userRes.user;

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: isStaff } = await admin.rpc("is_staff", { user_id: user.id });
  if (isStaff !== true) {
    return json({ error: "Not a staff user." }, 403);
  }

  // Optional permission gate. If the role has use_ai_skills=false, refuse.
  const { data: perms } = await admin
    .from("staff")
    .select("role_permissions:staff_role(use_ai_skills)")
    .eq("profile_id", user.id)
    .maybeSingle();
  const allowed = (perms as any)?.role_permissions?.use_ai_skills;
  if (allowed === false) {
    return json({ error: "Your role does not have AI skill access." }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

  const { skillId, messages, mode = "chat", max_tokens = 1024 } = body || {};
  if (!skillId || !Array.isArray(messages) || messages.length === 0) {
    return json({ error: "skillId and messages are required." }, 400);
  }

  const { data: skill, error: skillErr } = await admin
    .from("ai_skills")
    .select("id, skill_key, system_prompt, persona_name, role_title")
    .eq("id", skillId)
    .maybeSingle();

  if (skillErr || !skill) {
    return json({ error: "Skill not found." }, 404);
  }

  const start = Date.now();

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens,
      system: skill.system_prompt,
      messages,
    }),
  });

  const data = await anthropicRes.json().catch(() => ({}));
  const durationMs = Date.now() - start;

  if (!anthropicRes.ok) {
    console.error("skill-chat: anthropic error", data);
    await admin.from("skill_logs").insert({
      skill_id: skill.id,
      action: mode,
      input: { messages },
      output: data,
      duration_ms: durationMs,
      success: false,
      error: typeof data?.error?.message === "string" ? data.error.message : `HTTP ${anthropicRes.status}`,
    });
    return json({ error: data?.error?.message || `Anthropic returned ${anthropicRes.status}` }, 502);
  }

  const text = (data?.content?.[0]?.text as string) || "";
  const tokensUsed = (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0);

  await admin.from("skill_logs").insert({
    skill_id: skill.id,
    action: mode,
    input: { messages },
    output: { text },
    tokens_used: tokensUsed,
    duration_ms: durationMs,
    success: true,
  });

  return json({ text, usage: data?.usage || null });
});
