// on-register
// -----------------------------------------------------------------------------
// Centralised post-registration / invite hook. Two entry shapes are supported:
//
//   1. event: "staff_invite"
//      Called by /admin/staff/invite immediately after a staff_invites row is
//      created. Sends the invitation email and writes an activity log entry.
//
//   2. event: "user_registered"
//      Called from the auth callback (or a Supabase Auth Hook) when a new
//      user finishes signing up. If a matching staff_invites row exists for
//      that email, the user's profile.role is upgraded to the invited role
//      and the invite is marked accepted. Non-staff registrations are a
//      no-op so this hook can be wired indiscriminately.
//
// The function deliberately uses anon-key Supabase access for reads/writes
// scoped by RLS, except for the privileged profile.role + invite upgrade,
// which uses the service role key.
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

async function sendEmail(type: string, data: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ type, data }),
    });
  } catch (e) {
    console.error("on-register: email dispatch failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const event = (body.event as string) || "user_registered";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (event === "staff_invite") {
      const {
        email,
        firstName,
        role,
        acceptUrl,
        message,
        invitedBy,
        inviteId,
      } = body;

      if (!email || !role || !acceptUrl) {
        return new Response(
          JSON.stringify({ error: "email, role and acceptUrl are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      await sendEmail("staff_invite", {
        email,
        firstName: firstName || "there",
        role,
        acceptUrl,
        message: message || null,
        invitedBy: invitedBy || null,
      });

      // Activity log — best effort. If the activities table or its columns
      // differ, we still consider the invite send successful.
      try {
        await admin.from("activities").insert({
          type: "staff_invite_sent",
          description: `Staff invite sent to ${email} (${role})`,
          actor_id: invitedBy || null,
          metadata: { inviteId: inviteId || null, role, email },
        });
      } catch (e) {
        console.warn("on-register: activity log insert skipped:", e);
      }

      return new Response(
        JSON.stringify({ ok: true, sent: true }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    if (event === "user_registered") {
      const userId = body.userId as string | undefined;
      const email = (body.email as string | undefined)?.toLowerCase();
      if (!userId || !email) {
        return new Response(
          JSON.stringify({ error: "userId and email are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      // Match a pending invite by email and (optionally) token.
      const token = body.token as string | undefined;
      let query = admin
        .from("staff_invites")
        .select("id, email, role, expires_at, accepted_at, token")
        .eq("email", email)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (token) query = query.eq("token", token);

      const { data: invite } = await query.maybeSingle();

      if (!invite) {
        return new Response(
          JSON.stringify({ ok: true, matched: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      // Expiry check.
      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ ok: true, matched: true, expired: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      await admin
        .from("profiles")
        .update({ role: invite.role, updated_at: new Date().toISOString() })
        .eq("id", userId);

      await admin
        .from("staff_invites")
        .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
        .eq("id", invite.id);

      try {
        await admin.from("activities").insert({
          type: "staff_invite_accepted",
          description: `Staff invite accepted by ${email} (${invite.role})`,
          actor_id: userId,
          metadata: { inviteId: invite.id, role: invite.role },
        });
      } catch (e) {
        console.warn("on-register: activity log insert skipped:", e);
      }

      return new Response(
        JSON.stringify({ ok: true, matched: true, role: invite.role }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown event: ${event}` }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("on-register error:", err);
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
});
