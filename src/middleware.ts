import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function supabaseKey() {
  // ✅ fallback supaya gak pecah kalau env kamu namanya beda
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )!;
}

function createSupabase(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey(),
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabase(req, res);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = req.nextUrl.pathname;
  const search = req.nextUrl.search;

  // ✅ Guest-only routes: kalau sudah login, jangan boleh lihat login/register
  const isGuestOnly = pathname === "/login" || pathname === "/register";
  if (user && isGuestOnly) {
    const next = req.nextUrl.searchParams.get("next") || "/dashboard";
    const url = req.nextUrl.clone();
    url.pathname = next;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ✅ Protected routes: butuh login
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/receipts");

  if (!user && isProtected) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  return res;
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*", "/receipts/:path*"],
};


