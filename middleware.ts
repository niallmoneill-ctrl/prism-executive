import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const STAFF_ROLES = new Set([
  'ceo',
  'cfo',
  'cto',
  'operations_manager',
  'senior_consultant',
  'consultant',
  'customer_support',
  'marketing',
  'finance',
  'hr',
]);

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

    let allowed = false;
    try {
      const { data: perms } = await supabase.rpc('get_my_permissions');
      if (Array.isArray(perms)) {
        allowed = perms.length > 0;
      } else if (perms && typeof perms === 'object') {
        allowed = Object.keys(perms).length > 0;
      } else if (typeof perms === 'string' && perms.length > 0) {
        allowed = true;
      }
    } catch {
      // Swallow and fall through to the role check.
    }

    if (!allowed) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.role && STAFF_ROLES.has(profile.role)) {
        allowed = true;
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
