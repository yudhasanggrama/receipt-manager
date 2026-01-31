"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Props = { email: string };

const CATEGORIES = [
  { key: "Food & Drink", icon: "🍔" },
  { key: "Transport", icon: "🚗" },
  { key: "Shopping", icon: "🛍️" },
  { key: "Health", icon: "💊" },
  { key: "Entertainment", icon: "🎬" },
  { key: "Bills", icon: "📄" },
  { key: "Groceries", icon: "🛒" },
  { key: "Others", icon: "📦" },
] as const;

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardClient({ email }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // Dummy data dulu (Day 1) — nanti Day 3/5 tinggal diganti dari DB
  const summary = useMemo(() => {
    const total = 4250000;
    const byCategory = [
      { name: "Food & Drink", amount: 1700000 },
      { name: "Transport", amount: 1000000 },
      { name: "Shopping", amount: 850000 },
      { name: "Entertainment", amount: 400000 },
      { name: "Others", amount: 300000 },
    ];
    const recent = [
      { merchant: "Starbucks", date: "Nov 25", category: "Food & Drink", amount: 65000 },
      { merchant: "Grab", date: "Nov 24", category: "Transport", amount: 35000 },
      { merchant: "Indomaret", date: "Nov 22", category: "Groceries", amount: 120000 },
      { merchant: "Bakmi GM", date: "Nov 20", category: "Food & Drink", amount: 98000 },
      { merchant: "Cinema XXI", date: "Nov 18", category: "Entertainment", amount: 120000 },
    ];
    return { total, byCategory, recent };
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      
      const r = await fetch("/api/auth/logout", { method: "POST" });

      router.push("/login");
      router.refresh();

      if (!r.ok) {
        console.warn("Logout failed:", await r.text().catch(() => ""));
      }
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #16a34a 1px, transparent 1px), linear-gradient(to bottom, #16a34a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8">
        {/* Topbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Receipt Manager
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as <span className="font-medium text-slate-800">{email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/receipts/new"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-600/25"
            >
              + Add Receipt
            </Link>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>

        {/* Main */}
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {/* Total */}
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-xl backdrop-blur lg:col-span-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">This Month</p>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                November
              </span>
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
              {formatIDR(summary.total)}
            </div>
            <p className="mt-1 text-sm text-slate-600">Total spent</p>
          </div>

          {/* Category */}
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-xl backdrop-blur lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Spending by Category</h2>
              <Link
                href="/insights"
                className="text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                Insights →
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {summary.byCategory.map((c) => {
                const icon = CATEGORIES.find((x) => x.key === c.name)?.icon ?? "📦";
                const pct = Math.round((c.amount / summary.total) * 100);
                return (
                  <div
                    key={c.name}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icon}</span>
                        <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                      </div>
                      <p className="text-xs font-semibold text-slate-600">{pct}%</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{formatIDR(c.amount)}</p>
                    <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Receipts */}
          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-5 shadow-xl backdrop-blur lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Recent Receipts</h2>
              <Link
                href="/receipts"
                className="text-sm font-semibold text-emerald-700 underline underline-offset-4 hover:text-emerald-800"
              >
                View all →
              </Link>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {summary.recent.map((r, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{r.merchant}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {r.date} • {r.category}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatIDR(r.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/insights"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                📊 Insights
              </Link>
              <Link
                href="/export"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                📤 Export
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
