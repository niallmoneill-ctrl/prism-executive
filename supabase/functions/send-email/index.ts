import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_NAME = "Prism Executive";
const FROM_EMAIL = "hello@prismexecutive.com";
const ORLA_EMAIL = "orla.brennan@prismexecutive.ie";
const FALLBACK_FROM = "onboarding@resend.dev"; // used until domain verified

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── BRAND CONSTANTS ─────────────────────────────────────────────────────────
const C = {
  dark:    "#1A1A1A",
  gold:    "#B8975A",
  goldLight: "#D4B483",
  warm:    "#F5F3EF",
  border:  "#E8E5DF",
  text:    "#333333",
  muted:   "#888888",
  white:   "#FFFFFF",
};

// ─── BASE LAYOUT ─────────────────────────────────────────────────────────────
const base = (content: string, preheader = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Prism Executive</title>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ""}
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
    body { margin:0; padding:0; background:${C.warm}; font-family:'DM Sans',Arial,sans-serif; }
    * { box-sizing:border-box; }
  </style>
</head>
<body style="margin:0;padding:0;background:${C.warm};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.warm};padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- HEADER -->
        <tr>
          <td style="background:${C.dark};padding:28px 40px;border-radius:12px 12px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:36px;height:36px;border:1px solid rgba(184,151,90,0.4);border-radius:6px;text-align:center;vertical-align:middle;">
                        <span style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;font-weight:600;color:${C.gold};line-height:36px;">P</span>
                      </td>
                      <td style="padding-left:12px;">
                        <span style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.25em;color:${C.gold};text-transform:uppercase;">PRISM EXECUTIVE</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="background:${C.white};padding:0;border-left:1px solid ${C.border};border-right:1px solid ${C.border};">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:${C.dark};padding:32px 40px;border-radius:0 0 12px 12px;">
            <p style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.3);margin:0 0 8px;text-align:center;letter-spacing:0.2em;text-transform:uppercase;">Prism Executive</p>
            <p style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.2);margin:0;text-align:center;">Ireland's Award-Winning Executive Search Partner</p>
            <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.15);margin:16px 0 0;text-align:center;">
              © ${new Date().getFullYear()} Prism Executive Ltd · 
              <a href="https://prismexecutive.com/privacy" style="color:rgba(255,255,255,0.2);text-decoration:none;">Privacy Policy</a> · 
              <a href="https://prismexecutive.com" style="color:rgba(255,255,255,0.2);text-decoration:none;">prismexecutive.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

// ─── DIVIDER ─────────────────────────────────────────────────────────────────
const divider = `<tr><td style="padding:0 40px;"><div style="height:1px;background:${C.border};"></div></td></tr>`;

// ─── BUTTON ──────────────────────────────────────────────────────────────────
const btn = (text: string, url: string) => `
  <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="background:${C.gold};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:500;color:${C.white};text-decoration:none;letter-spacing:0.1em;text-transform:uppercase;">${text}</a>
      </td>
    </tr>
  </table>`;

// ─── SCORE BAR ───────────────────────────────────────────────────────────────
const scoreBar = (label: string, score: number, color: string) => `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.text};width:160px;">${label}</td>
      <td style="padding:0 12px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.border};border-radius:4px;overflow:hidden;">
          <tr><td style="height:6px;background:${color};width:${Math.round((score/5)*100)}%;border-radius:4px;"></td></tr>
        </table>
      </td>
      <td style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;font-weight:600;color:${color};text-align:right;width:40px;">${score.toFixed(1)}</td>
    </tr>
  </table>`;

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// 1. WELCOME / REGISTRATION
const welcomeEmail = (firstName: string) => base(`
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:48px 40px 32px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;font-weight:500;letter-spacing:0.3em;text-transform:uppercase;color:${C.gold};margin:0 0 16px;">Welcome to Prism Executive</p>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;font-weight:600;color:${C.dark};margin:0 0 16px;line-height:1.2;">Welcome, ${firstName}.</h1>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:15px;color:${C.text};line-height:1.7;margin:0;">Your account has been created. You now have access to Ireland's most advanced executive behavioural assessment platform.</p>
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:500;color:${C.dark};margin:0 0 20px;letter-spacing:0.05em;text-transform:uppercase;">What you can do now</p>
      ${[
        ["Free Explorer Assessment", "Complete the 12-question behavioural assessment and discover your neurochemical profile."],
        ["Professional Report", "Upgrade to the 80-question Professional assessment for a comprehensive 15-page report."],
        ["Executive Debrief", "Book a 1:1 session with Orla Brennan to explore your results in depth."],
      ].map(([title, desc]) => `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr>
            <td style="width:4px;background:${C.gold};border-radius:2px;"></td>
            <td style="padding-left:16px;">
              <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:600;color:${C.dark};margin:0 0 4px;">${title}</p>
              <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.muted};margin:0;line-height:1.5;">${desc}</p>
            </td>
          </tr>
        </table>`).join("")}
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px 48px;text-align:center;">
      ${btn("Begin Your Assessment", "https://prismexecutive.com/assess")}
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.muted};margin:20px 0 0;">Questions? Reply to this email or contact <a href="mailto:orla.brennan@prismexecutive.ie" style="color:${C.gold};text-decoration:none;">orla.brennan@prismexecutive.ie</a></p>
    </td></tr>
  </table>`,
  `Welcome to Prism Executive, ${firstName} — begin your behavioural assessment today.`
);

// 2. EXPLORER ASSESSMENT COMPLETE
const explorerCompleteEmail = (firstName: string, scores: Record<string, number>) => base(`
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:${C.dark};padding:40px;text-align:center;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(184,151,90,0.6);margin:0 0 12px;">Explorer Report</p>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;font-weight:600;color:${C.white};margin:0 0 8px;">${firstName}'s Behavioural Profile</h1>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:rgba(255,255,255,0.4);margin:0;">Assessment completed · ${new Date().toLocaleDateString("en-IE", { day:"numeric", month:"long", year:"numeric" })}</p>
    </td></tr>
    <tr><td style="padding:40px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:500;color:${C.dark};margin:0 0 20px;letter-spacing:0.05em;text-transform:uppercase;">Your Dimension Scores</p>
      ${scoreBar("Exploration", scores.dopamine || 0, "#B8975A")}
      ${scoreBar("Structure", scores.serotonin || 0, "#4A7C9E")}
      ${scoreBar("Drive", scores.testosterone || 0, "#8B4A4A")}
      ${scoreBar("Connection", scores.estrogen || 0, "#4A8B6F")}
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.muted};margin:16px 0 0;">Scores out of 5.0 — higher scores indicate stronger preference for that dimension.</p>
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px;background:#FDFCFA;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${C.gold};margin:0 0 12px;">Unlock Your Full Report</p>
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;font-weight:600;color:${C.dark};margin:0 0 12px;">Get the Complete 15-Page Analysis</h2>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};line-height:1.7;margin:0 0 24px;">Your Explorer results reveal the outline of your profile. The Professional assessment goes deeper — natural vs adapted behaviour, gap analysis, communication guide, leadership style, and a personalised development plan.</p>
      ${["Natural + Adapted behavioural maps", "8 sub-dimension scores", "Gap analysis & energy cost", "Communication style guide", "Decision-making profile", "Leadership archetype", "Personalised development plan"].map(f =>
        `<p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};margin:0 0 8px;"><span style="color:${C.gold};margin-right:8px;">—</span>${f}</p>`
      ).join("")}
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px 48px;text-align:center;">
      ${btn("Upgrade to Professional — €49", "https://prismexecutive.com/pricing")}
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.muted};margin:20px 0 0;">One-time payment · Instant access · Download your report as PDF</p>
    </td></tr>
  </table>`,
  `${firstName}, your Explorer results are ready — see your behavioural profile.`
);

// 3. PROFESSIONAL REPORT READY
const professionalReportEmail = (firstName: string, scores: Record<string, number>) => base(`
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="background:${C.dark};padding:48px 40px;text-align:center;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:rgba(184,151,90,0.5);margin:0 0 16px;">Professional Report · Prism Executive</p>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:38px;font-weight:600;color:${C.white};margin:0 0 12px;line-height:1.2;">Your Report is Ready</h1>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:rgba(255,255,255,0.5);margin:0;">${firstName} · ${new Date().toLocaleDateString("en-IE", { day:"numeric", month:"long", year:"numeric" })}</p>
      <div style="margin:32px auto 0;display:inline-block;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            ${["Exploration","Structure","Drive","Connection"].map((d, i) => {
              const vals = [scores.dopamine||0, scores.serotonin||0, scores.testosterone||0, scores.estrogen||0];
              const colors = ["#B8975A","#4A7C9E","#8B4A4A","#4A8B6F"];
              return `<td style="text-align:center;padding:0 12px;">
                <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:600;color:${colors[i]};">${vals[i].toFixed(1)}</div>
                <div style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;color:rgba(255,255,255,0.4);letter-spacing:0.1em;text-transform:uppercase;margin-top:4px;">${d}</div>
              </td>`;
            }).join("")}
          </tr>
        </table>
      </div>
    </td></tr>
    <tr><td style="padding:40px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${C.text};line-height:1.8;margin:0 0 24px;">${firstName}, your full 15-page Professional Behavioural Report is now ready. It contains a comprehensive analysis of your natural and adapted behavioural profile, including your leadership archetype, communication preferences, decision-making style, and a personalised development plan.</p>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:500;color:${C.dark};margin:0 0 16px;letter-spacing:0.05em;text-transform:uppercase;">Your report includes</p>
      ${[
        "Natural and adapted behavioural maps",
        "Gap analysis — where you adapt and the energy cost",
        "Communication style guide — how others can work best with you",
        "Decision-making profile and blind spots",
        "Leadership archetype and ideal environment",
        "Team dynamics and collaboration style",
        "Stress response and resilience strategies",
        "Personalised 12-month development plan",
      ].map(f => `<p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};margin:0 0 10px;"><span style="color:${C.gold};margin-right:10px;">—</span>${f}</p>`).join("")}
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px;background:#FDFCFA;">
      <h2 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;font-weight:600;color:${C.dark};margin:0 0 12px;">Book a Report Debrief</h2>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};line-height:1.7;margin:0 0 20px;">A 45-minute confidential session with Orla Brennan to explore your results in depth and discuss your executive career trajectory.</p>
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:12px;">${btn("View Your Report", "https://prismexecutive.com/account")}</td>
          <td>
            <a href="mailto:orla.brennan@prismexecutive.ie?subject=Report Debrief Request" style="display:inline-block;padding:14px 24px;font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:500;color:${C.dark};text-decoration:none;letter-spacing:0.05em;border:1px solid ${C.border};border-radius:8px;">Book a Debrief</a>
          </td>
        </tr>
      </table>
    </td></tr>
    ${divider}
    <tr><td style="padding:24px 40px 40px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.muted};line-height:1.6;margin:0;">This report is confidential and intended solely for ${firstName}. Your data is stored securely in compliance with GDPR. You may request deletion at any time by contacting <a href="mailto:privacy@prismexecutive.com" style="color:${C.gold};text-decoration:none;">privacy@prismexecutive.com</a>.</p>
    </td></tr>
  </table>`,
  `${firstName}, your Professional Behavioural Report is ready to view.`
);

// 4. PAYMENT CONFIRMATION
const paymentConfirmationEmail = (firstName: string, tier: string, amount: string) => base(`
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:48px 40px 32px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${C.gold};margin:0 0 16px;">Payment Confirmed</p>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;font-weight:600;color:${C.dark};margin:0 0 16px;line-height:1.2;">Thank you, ${firstName}.</h1>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${C.text};line-height:1.7;margin:0;">Your payment has been received and your ${tier} assessment is now active.</p>
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:${C.muted};margin:0 0 16px;">Payment Summary</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${C.warm};border-radius:8px;padding:20px;">
        <tr>
          <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};">Product</td>
          <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.dark};font-weight:500;text-align:right;">Prism ${tier} Assessment</td>
        </tr>
        <tr><td colspan="2" style="padding:8px 0;"><div style="height:1px;background:${C.border};"></div></td></tr>
        <tr>
          <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};">Amount</td>
          <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.dark};font-weight:500;text-align:right;">${amount} + VAT</td>
        </tr>
        <tr><td colspan="2" style="padding:8px 0;"><div style="height:1px;background:${C.border};"></div></td></tr>
        <tr>
          <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.text};">Date</td>
          <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.dark};font-weight:500;text-align:right;">${new Date().toLocaleDateString("en-IE", { day:"numeric", month:"long", year:"numeric" })}</td>
        </tr>
      </table>
    </td></tr>
    ${divider}
    <tr><td style="padding:32px 40px 48px;text-align:center;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${C.text};margin:0 0 24px;">Your assessment is ready to begin. Complete it at your own pace — your progress is saved automatically.</p>
      ${btn("Begin Your Assessment", "https://prismexecutive.com/account")}
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.muted};margin:20px 0 0;">Questions? Contact <a href="mailto:orla.brennan@prismexecutive.ie" style="color:${C.gold};text-decoration:none;">orla.brennan@prismexecutive.ie</a></p>
    </td></tr>
  </table>`,
  `Payment confirmed — your Prism ${tier} assessment is now active.`
);

// 5. INTERNAL LEAD ALERT TO ORLA
const leadAlertEmail = (lead: Record<string, any>) => base(`
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 40px 24px;">
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${C.gold};margin:0 0 12px;">New Lead · Prism Executive</p>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:30px;font-weight:600;color:${C.dark};margin:0 0 8px;">${lead.first_name} ${lead.last_name || ""}</h1>
      <p style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;color:${C.muted};margin:0;">${lead.job_title || ""} ${lead.company_name ? `at ${lead.company_name}` : ""}</p>
    </td></tr>
    ${divider}
    <tr><td style="padding:24px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[
          ["Lead Score", `${lead.lead_score || "—"}/10`],
          ["Email", lead.email || "—"],
          ["Phone", lead.phone || "—"],
          ["Industry", lead.industry || "—"],
          ["Seniority", lead.seniority || "—"],
          ["Source", lead.tool_used || lead.source || "website"],
          ["Urgency", lead.urgency || "—"],
          ["Role Hiring", lead.role_hiring || "—"],
        ].map(([label, value]) => `
          <tr>
            <td style="font-family:'DM Sans',Arial,sans-serif;font-size:12px;color:${C.muted};padding:8px 0;width:140px;border-bottom:1px solid ${C.border};">${label}</td>
            <td style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;color:${C.dark};font-weight:500;padding:8px 0;border-bottom:1px solid ${C.border};">${value}</td>
          </tr>`).join("")}
      </table>
    </td></tr>
    ${divider}
    <tr><td style="padding:24px 40px 40px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:12px;">
            <a href="mailto:${lead.email}" style="display:inline-block;padding:12px 24px;background:${C.gold};border-radius:8px;font-family:'DM Sans',Arial,sans-serif;font-size:12px;font-weight:500;color:${C.white};text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Email ${lead.first_name}</a>
          </td>
          <td>
            <a href="https://prismexecutive.com/admin" style="display:inline-block;padding:12px 24px;border:1px solid ${C.border};border-radius:8px;font-family:'DM Sans',Arial,sans-serif;font-size:12px;font-weight:500;color:${C.dark};text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">View in Admin</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>`,
  `New lead: ${lead.first_name} ${lead.last_name || ""} · Score ${lead.lead_score || "—"}/10`
);

// ═══════════════════════════════════════════════════════════════════════════════
// SEND FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════
async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const fromEmail = FALLBACK_FROM;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: [to],
      subject,
      html,
      reply_to: replyTo || ORLA_EMAIL,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(data)}`);
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE FUNCTION HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    let result;

    switch (type) {
      case "welcome":
        result = await sendEmail(
          data.email,
          "Welcome to Prism Executive",
          welcomeEmail(data.firstName)
        );
        break;

      case "explorer_complete":
        result = await sendEmail(
          data.email,
          `${data.firstName}, your Explorer results are ready`,
          explorerCompleteEmail(data.firstName, data.scores || {})
        );
        break;

      case "professional_report":
        result = await sendEmail(
          data.email,
          `${data.firstName}, your Professional Report is ready`,
          professionalReportEmail(data.firstName, data.scores || {})
        );
        break;

      case "payment_confirmation":
        result = await sendEmail(
          data.email,
          "Payment confirmed — Prism Executive",
          paymentConfirmationEmail(data.firstName, data.tier || "Professional", data.amount || "€49")
        );
        break;

      case "lead_alert":
        result = await sendEmail(
          ORLA_EMAIL,
          `New lead: ${data.first_name} ${data.last_name || ""} · Score ${data.lead_score || "—"}/10`,
          leadAlertEmail(data),
          data.email
        );
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown email type: ${type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Email send error:", error);
    return new Response(
      JSON.stringify({ error: "Email failed", detail: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
