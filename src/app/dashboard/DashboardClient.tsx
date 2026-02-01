"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Plus, LayoutDashboard, Receipt, 
  PieChart as PieIcon, Download, LogOut, User, Loader2, X, ChevronRight 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = { 
  email: string; 
  username?: string 
};

const CATEGORIES = [
  "Food & Drink", "Transport", "Shopping", "Health", 
  "Entertainment", "Bills", "Groceries", "Others"
];

const CATEGORY_ICONS: Record<string, string> = {
  "Food & Drink": "🍔",
  "Transport": "🚗",
  "Shopping": "🛍️",
  "Health": "💊",
  "Entertainment": "🎬",
  "Bills": "📄",
  "Groceries": "🛒",
  "Others": "📦",
};

export default function DashboardClient({ email, username }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 

  const displayUsername = username || email.split('@')[0];

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCats.length > 0) params.append("category", selectedCats.join(","));
        if (selectedMonth) params.append("month", selectedMonth);
        
        const res = await fetch(`/api/receipts?${params.toString()}`);
        const result = await res.json();
        // Menggunakan result.data karena API Route kita sekarang me-return object
        setReceipts(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchFiltered, 400);
    return () => clearTimeout(debounce);
  }, [selectedCats, selectedMonth]);

  const stats = useMemo(() => {
    const total = receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    
    const byCat = CATEGORIES.map(cat => ({
      name: cat,
      amount: receipts
        .filter(r => r.category === cat)
        .reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const map = new Map<string, number>();
    receipts.forEach(r => {
      const name = r.merchant_name || "Unknown";
      const amt = Number(r.total_amount) || 0;
      map.set(name, (map.get(name) || 0) + amt);
    });

    const topMerchants = Array.from(map.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return { total, byCat, topMerchants };
  }, [receipts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      {/* SIDEBAR DESKTOP */}
      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-slate-200/60 bg-white/70 backdrop-blur-xl p-6 lg:block z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Receipt size={24} />
          </div>
          <span className="text-xl font-black text-slate-900 italic uppercase">MySpendly</span>
        </div>
        <nav className="space-y-2">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${pathname === '/dashboard' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 font-bold"}`}>
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link href="/receipts" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 font-bold transition-all">
            <Receipt size={20} /> My Receipts
          </Link>
          <Link href="/insights" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 font-bold transition-all">
            <PieIcon size={20} /> Insights
          </Link>
        </nav>
        <div className="absolute bottom-8 left-6 right-6">
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:text-red-600 transition-all hover:bg-red-50">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pb-28 lg:pb-10 relative z-10">
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/60 px-6 py-4 backdrop-blur-md flex items-center justify-between">
          <div className="relative flex-1 max-w-md hidden md:block"></div>
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase text-slate-600 outline-none focus:ring-2 ring-emerald-500/20"
            />
            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block" />
            <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 shadow-sm">
              <User size={14} className="text-emerald-600" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{displayUsername}</span>
            </div>
            <Link href="/receipts/new" className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95">
              <Plus size={20} />
            </Link>
          </div>
        </header>

        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
          {/* TOP SECTION: SPENDING CARD */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-[3.5rem] bg-gradient-to-br from-emerald-700 to-emerald-500 p-12 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-4 opacity-80">Total Spending • {selectedMonth}</p>
                <h2 className="text-6xl md:text-7xl font-black italic tracking-tighter leading-none">
                  Rp {stats.total.toLocaleString('id-ID')}
                </h2>
                <div className="mt-12 flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])}
                      className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                        selectedCats.includes(cat) ? "bg-white text-emerald-600 shadow-lg scale-105" : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-md"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  {selectedCats.length > 0 && (
                    <button onClick={() => setSelectedCats([])} className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors flex items-center justify-center">
                      <X size={12}/>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-[3.5rem] bg-white border border-slate-100 p-10 shadow-sm flex flex-col">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 mb-8 italic text-center">Top Merchants</h3>
              <div className="flex-1 space-y-6">
                {stats.topMerchants.length > 0 ? stats.topMerchants.map((item) => (
                  <div key={item.name} className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <span className="text-[10px] font-black text-slate-800 uppercase truncate pr-4">{item.name}</span>
                    <span className="text-[10px] font-black text-emerald-600 italic">Rp {item.total.toLocaleString('id-ID')}</span>
                  </div>
                )) : (
                  <div className="h-full flex items-center justify-center text-[10px] font-black text-slate-300 uppercase italic">No Data</div>
                )}
              </div>
            </div>
          </div>

          {/* LOWER SECTION: BREAKDOWN & ACTIVITY */}
          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2 rounded-[3rem] bg-white border border-slate-100 p-10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Category Breakdown</h3>
              <div className="space-y-6">
                {stats.byCat.map((c) => (
                  <div key={c.name} className="space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">{CATEGORY_ICONS[c.name]} {c.name}</span>
                      <span className="text-slate-900">Rp {c.amount.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(c.amount / (stats.total || 1)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-[3rem] bg-white border border-slate-100 p-10 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Activity</h3>
                <Link href="/receipts" className="text-[10px] font-black text-emerald-600 flex items-center gap-1 hover:underline tracking-widest">VIEW ALL <ChevronRight size={12}/></Link>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div>
                ) : receipts.length > 0 ? (
                  receipts.slice(0, 5).map(r => (
                    <Link href={`/receipts/edit/${r.id}`} key={r.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-emerald-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">{CATEGORY_ICONS[r.category] || "📦"}</div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase italic leading-none">{r.merchant_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{r.date?.split('T')[0]}</p>
                        </div>
                      </div>
                      <p className="font-black italic text-slate-900 text-sm">Rp {Number(r.total_amount).toLocaleString('id-ID')}</p>
                    </Link>
                  ))
                ) : (
                  <div className="py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest italic">No Records Found</div>
                )}
              </div>
            </div>
          </div>

          {/* DUMMY ACTION HUB - INSIGHTS & EXPORT (PRD POSITION) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pb-10">
            <Link href="/insights" className="group cursor-pointer bg-white border-2 border-slate-100 p-6 rounded-[2.5rem] flex items-center justify-between hover:border-emerald-500 transition-all shadow-sm">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <PieIcon size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">📊 Insights</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Analytics Spending Analysis</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
            </Link>

            <div className="group cursor-pointer bg-emerald-600 p-6 rounded-[2.5rem] flex items-center justify-between hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center">
                  <Download size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-white">📤 Export</h4>
                  <p className="text-[10px] font-bold text-emerald-100/60 uppercase tracking-tighter mt-1">Download CSV Report</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-full text-[9px] font-black text-white/80 uppercase">
                Ready
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-16 bg-slate-900/95 backdrop-blur-md rounded-full border border-white/10 shadow-2xl z-50 flex items-center justify-around px-8 lg:hidden">
          <Link href="/dashboard" className={`p-2 ${pathname === '/dashboard' ? 'text-emerald-400' : 'text-slate-500'}`}><LayoutDashboard size={22} /></Link>
          <Link href="/receipts" className="text-slate-500 p-2"><Receipt size={22} /></Link>
          <Link href="/receipts/new" className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white -translate-y-6 shadow-xl shadow-emerald-500/40"><Plus size={28} /></Link>
          <Link href="/insights" className="text-slate-500 p-2"><PieIcon size={22} /></Link>
          <button onClick={handleLogout} className="text-slate-500 p-2"><LogOut size={22} /></button>
      </nav>
    </div>
  );
}