import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // IMPORTANT: gunakan getClaims (bukan getSession) untuk validasi di server/proxy :contentReference[oaicite:5]{index=5}
  const { data } = await supabase.auth.getClaims();
  const isAuthed = !!data?.claims;

  const path = request.nextUrl.pathname;

  const isAuthPage = path.startsWith("/login") || path.startsWith("/register");
  const isProtected = path.startsWith("/dashboard");

  // Kalau belum login dan akses dashboard → lempar ke login
  if (!isAuthed && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(url);
  }

  // Kalau sudah login tapi buka login/register → lempar ke dashboard
  if (isAuthed && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
