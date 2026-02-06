"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client"; // ✅ tambahkan (sesuaikan path kalau beda)

export default function RegisterClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(sp.get("error"));

  const supabase = createClient(); // ✅ tambahkan

  // ✅ Guard: kalau sudah login, jangan boleh lihat register (menang lawan back/forward cache)
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;

      if (data.session) {
        router.replace(next);
        router.refresh();
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        router.replace(next);
        router.refresh();
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [router, supabase, next]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await r.json().catch(() => ({}));
    setLoading(false);

    if (!r.ok) {
      setError(data?.error ?? "Register failed");
      return;
    }

    router.replace(next); // ✅ sebelumnya "/dashboard" juga OK, ini hanya pakai next yang sudah ada
    router.refresh();
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-emerald-50 via-green-50 to-lime-50">
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-lime-300/40 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #16a34a 1px, transparent 1px), linear-gradient(to bottom, #16a34a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-14 sm:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-6 shadow-xl backdrop-blur sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Sign Up
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Create your account to start the application
            </p>

            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Email
                <input
                  name="email"
                  type="email"
                  required
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
                  placeholder="name@example.com"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Password
                <span className="text-xs text-slate-500">
                  Minimum 8 characters
                </span>
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/15"
                  placeholder="********"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Creating...
                  </span>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            <p className="mt-5 text-sm text-slate-600">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
