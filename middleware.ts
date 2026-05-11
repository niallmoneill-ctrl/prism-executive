import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // /account — any authenticated user.
  if (!user && path.startsWith('/account')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }

  // /admin — staff only. Primary gate: get_my_permissions() RPC. Secondary
  // gate: profile.role membership in the staff role set. Belt-and-braces
  // so a misconfigured RPC can't lock the team out of the dashboard.
  if (path.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }

    // Resolve permissions for the signed-in user. get_my_permissions()
    // returns a jsonb of boolean flags (view_admin, manage_staff, …) or
    // null if the user has no staff record.
    let allowed = false;
    try {
      const { data: perms } = await supabase.rpc('get_my_permissions');
      if (perms && typeof perms === 'object' && !Array.isArray(perms)) {
        // Primary gate: view_admin. Anyone with explicit admin visibility
        // is allowed. Fall back to "has any permission" so a future role
        // can't accidentally lose access to /admin.
        const p = perms as Record<string, unknown>;
        if (p.view_admin === true) {
          allowed = true;
        } else if (Object.values(p).some(v => v === true)) {
          allowed = true;
        }
      }
    } catch {
      // Swallow — fall through to the staff-row fallback.
    }

    // Belt-and-braces fallback: if get_my_permissions misfires for any
    // reason, allow anyone with a staff row so the team can't be locked
    // out of the dashboard by an RPC outage.
    if (!allowed) {
      try {
        const { data: isStaff } = await supabase.rpc('is_staff', { user_id: user.id });
        if (isStaff === true) allowed = true;
      } catch {
        // Ignore — handled by the redirect below.
      }
    }

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = '/account';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*'],
};
