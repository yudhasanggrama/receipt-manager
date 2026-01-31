import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

function supabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )!;
}

export async function createClient() {
  // ✅ DI NEXT BARU: HARUS await
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey(),
    {
      cookies: {
        getAll() {
          // ✅ mapping eksplisit (INI KUNCI FIX-NYA)
          return cookieStore.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component read-only → aman diabaikan
          }
        },
      },
    }
  );
}
