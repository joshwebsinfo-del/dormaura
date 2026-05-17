import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
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
  const url = request.nextUrl.clone();

  // Public routes that don't require auth
  const publicPaths = ["/auth", "/auth/callback", "/polls", "/who-has", "/manifest.json", "/sw.js", "/icons"];
  const isPublic = publicPaths.some((p) => url.pathname.startsWith(p));

  if (!user && !isPublic) {
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  if (user && (url.pathname === "/auth" || url.pathname === "/")) {
    url.pathname = "/home";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
