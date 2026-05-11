import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/account';
  const invite = searchParams.get('invite') || undefined;

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {}
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Best-effort post-registration hook. If this user matches a pending
      // staff_invites row, on-register will provision their staff record
      // and mark the invite accepted. We swallow failures so a hook outage
      // never blocks the user from reaching the app.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on-register`;
          await fetch(fnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              event: 'user_registered',
              userId: user.id,
              email: user.email,
              token: invite,
            }),
          });
        }
      } catch (e) {
        console.error('auth/callback: on-register dispatch failed:', e);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
