// on-register
// -----------------------------------------------------------------------------
// Centralised post-registration / invite hook. Two entry shapes:
//
//   1. event: "staff_invite"
//      Called by /admin/staff/invite immediately after a staff_invites row is
//      created. Sends the invitation email and writes an activity log entry.
//
//   2. event: "user_registered"
//      Called from the auth callback (or a Supabase Auth Hook) when a new
//      user finishes signing up. If a matching staff_invites row exists for
//      that email:
//        - ensures a profiles row exists,
//        - creates a staff row (profile_id, staff_role, title, department),
//        - marks the invite accepted.
//      Non-staff registrations are a no-op so this hook can be wired
//      indiscriminately.
//
// Service role is used so RLS doesn't block the cross-table writes.
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
        staffRole,
        // Backwards-compat: older callers sent `role` before we aligned
        // with the staff_role column.
        role,
        acceptUrl,
        title,
        department,
        message,
        invitedBy,
        inviteId,
      } = body;
      const resolvedRole = staffRole || role;

      if (!email || !resolvedRole || !acceptUrl) {
        return new Response(
          JSON.stringify({ error: "email, staffRole and acceptUrl are required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      await sendEmail("staff_invite", {
        email,
        firstName: firstName || "there",
        role: resolvedRole,
        title:      title      || null,
        department: department || null,
        acceptUrl,
        message:   message   || null,
        invitedBy: invitedBy || null,
      });

      try {
        await admin.from("activities").insert({
          type: "staff_invite_sent",
          description: `Staff invite sent to ${email} (${resolvedRole})`,
          actor_id: invitedBy || null,
          metadata: { inviteId: inviteId || null, role: resolvedRole, email, title, department },
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

      // Find a pending invite for this email (and token if provided).
      const token = body.token as string | undefined;
      let q = admin
        .from("staff_invites")
        .select("id, email, staff_role, title, department, first_name, last_name, expires_at, accepted_at, token")
        .eq("email", email)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (token) q = q.eq("token", token);

      const { data: invite } = await q.maybeSingle();

      if (!invite) {
        return new Response(
          JSON.stringify({ ok: true, matched: false }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ ok: true, matched: true, expired: true }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }

      // Ensure a profile exists. Staff need profile_id to anchor the staff row.
      await admin.from("profiles").upsert({
        id: userId,
        email,
        first_name: invite.first_name || null,
        last_name:  invite.last_name  || null,
        role: "staff",
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });

      // Create the staff record (idempotent — skip if it already exists).
      const { data: existing } = await admin
        .from("staff")
        .select("id")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!existing) {
        await admin.from("staff").insert({
          profile_id: userId,
          staff_role: invite.staff_role,
          department: invite.department || "Operations",
          title:      invite.title      || null,
          status: "active",
        });
      } else {
        await admin
          .from("staff")
          .update({
            staff_role: invite.staff_role,
            department: invite.department || "Operations",
            title:      invite.title      || null,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }

      await admin
        .from("staff_invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invite.id);

      try {
        await admin.from("activities").insert({
          type: "staff_invite_accepted",
          description: `Staff invite accepted by ${email} (${invite.staff_role})`,
          actor_id: userId,
          metadata: { inviteId: invite.id, role: invite.staff_role },
        });
      } catch (e) {
        console.warn("on-register: activity log insert skipped:", e);
      }

      return new Response(
        JSON.stringify({ ok: true, matched: true, role: invite.staff_role }),
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
