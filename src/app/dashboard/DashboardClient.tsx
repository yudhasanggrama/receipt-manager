"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Search, Filter, Download, Plus, LayoutDashboard, Receipt, 
  PieChart as PieIcon, TrendingUp, ChevronRight, X, User, LogOut, Calendar 
} from "lucide-react";

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
  
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const displayUsername = username || email.split('@')[0];

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append("q", search);
        if (selectedCats.length > 0) params.append("category", selectedCats.join(","));
        
        const res = await fetch(`/api/receipts?${params.toString()}`);
        const data = await res.json();
        setReceipts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchFiltered, 400);
    return () => clearTimeout(debounce);
  }, [search, selectedCats]);

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

  const toggleCat = (cat: string) => {
    setSelectedCats(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const NavItem = ({ href, icon: Icon, label }: any) => (
    <Link href={href} className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
      pathname === href ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
    }`}>
      <Icon size={20} />
      <span className="font-bold text-sm tracking-tight">{label}</span>
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-[#f8fafc] relative overflow-hidden font-sans">
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] rounded-full bg-emerald-100/40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 blur-[100px] pointer-events-none" />

      <aside className="fixed left-0 top-0 hidden h-full w-64 border-r border-slate-200/60 bg-white/70 backdrop-blur-xl p-6 lg:block z-20">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200">
            <Receipt size={24} />
          </div>
          <span className="text-xl font-black text-slate-900 italic uppercase">MySpendly</span>
        </div>
        <nav className="space-y-2">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/receipts" icon={Receipt} label="My Receipts" />
          <NavItem href="/insights" icon={PieIcon} label="Insights" />
          <NavItem href="/export" icon={Download} label="Export" />
        </nav>
        <div className="absolute bottom-8 left-6 right-6">
          <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:text-red-600 transition-all hover:bg-red-50">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pb-28 lg:pb-10 relative z-10">
        <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/60 px-6 py-4 backdrop-blur-md flex items-center justify-between">
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search merchant..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 ring-emerald-500/10 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white/80 border border-slate-200 px-3 py-1.5 shadow-sm">
              <User size={14} className="text-emerald-600" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{displayUsername}</span>
            </div>
            <Link href="/receipts/new" className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2">
              <Plus size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Add Receipt</span>
            </Link>
          </div>
        </header>

        <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto">
          {/* --- HERO SECTION: SPENDING CARD --- */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* US-09: Monthly Spending Card (Kiri - Mengambil 2 kolom) */}
              <div className="lg:col-span-2 rounded-[3.5rem] bg-gradient-to-br from-emerald-700 to-emerald-500 p-12 text-white shadow-xl shadow-emerald-100 relative overflow-hidden group">
                {/* Efek gradasi halus seperti di gambar */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                
                <div className="relative z-10">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-50 mb-4 opacity-90">
                    Total Monthly Spending
                  </p>
                  <h2 className="text-7xl font-black italic tracking-tighter leading-none">
                    Rp {stats.total.toLocaleString('id-ID')}
                  </h2>
                  
                  {/* US-08: Filter Pills (Kecil, Putih Transparan seperti di gambar) */}
                  <div className="mt-12 flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button 
                        key={cat}
                        onClick={() => toggleCat(cat)}
                        className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${
                          selectedCats.includes(cat) 
                            ? "bg-white text-emerald-600 border-white shadow-lg" 
                            : "bg-white/20 text-white border-white/10 hover:bg-white/30 backdrop-blur-md"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                    {selectedCats.length > 0 && (
                      <button 
                        onClick={() => setSelectedCats([])} 
                        className="px-3 py-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all flex items-center justify-center"
                      >
                        <X size={14}/>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* US-09: Top Merchants (Kanan - Sesuai Gambar) */}
              <div className="rounded-[3.5rem] bg-white border border-slate-100/50 p-12 shadow-sm flex flex-col">
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 mb-10 italic">
                  Top Merchants
                </h3>
                
                <div className="flex-1 space-y-8">
                  {stats.topMerchants.length > 0 ? (
                    stats.topMerchants.map((item) => (
                      <div key={item.name} className="flex justify-between items-end border-b border-slate-50 pb-2 group">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-500 transition-colors">
                          {item.name}
                        </span>
                        <span className="text-[11px] font-black text-slate-900 italic">
                          Rp {item.total.toLocaleString('id-ID')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20 italic font-black text-slate-400 text-[10px] tracking-widest">
                      NO DATA
                    </div>
                  )}
                </div>
              </div>
            </div>

          <div className="grid gap-8 lg:grid-cols-5">
            <div className="lg:col-span-2 rounded-[3rem] bg-white/60 backdrop-blur-md border border-white p-10 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Category Breakdown</h3>
              <div className="space-y-6">
                {stats.byCat.map((c) => (
                  <div key={c.name} className="space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                      <div className="flex items-center gap-2">
                        {/* Tambahkan ikon di sini */}
                        <span>{CATEGORY_ICONS[c.name] || "📦"}</span>
                        <span className="text-slate-500">{c.name}</span>
                      </div>
                      <span className="text-emerald-600 font-black">Rp {c.amount.toLocaleString('id-ID')}</span>
                    </div>
                    {/* Progress bar tetap sama */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden p-[2px]">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.3)]" 
                        style={{ width: `${(c.amount / (stats.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 rounded-[3rem] bg-white/60 backdrop-blur-md border border-white p-10 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Recent Transactions</h3>
                <Link href="/receipts" className="text-[10px] font-black text-emerald-600 flex items-center gap-1 hover:underline">VIEW ALL <ChevronRight size={12}/></Link>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="py-10 text-center text-[10px] font-black text-slate-400 animate-pulse uppercase italic">Syncing with server...</div>
                ) : receipts.length > 0 ? (
                  receipts.slice(0, 5).map(r => (
                    <div key={r.id} className="flex items-center justify-between p-5 rounded-[2rem] border border-white bg-white/40 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 group">
                      <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-slate-50 group-hover:rotate-6 transition-transform">
                            {CATEGORY_ICONS[r.category] || "📦"}
                          </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase truncate max-w-[150px]">{r.merchant_name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">{r.date?.split('T')[0]} • {r.category}</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-slate-900 italic tracking-tighter">Rp {Number(r.total_amount).toLocaleString('id-ID')}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Transactions Found</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md h-20 bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl z-50 flex items-center justify-around px-8 lg:hidden">
          <Link href="/dashboard" className={`p-3 transition-colors ${pathname === '/dashboard' ? 'text-emerald-400' : 'text-slate-500'}`}><LayoutDashboard size={22} /></Link>
          <Link href="/receipts" className="p-3 text-slate-500"><Receipt size={22} /></Link>
          <Link href="/receipts/new" className="w-14 h-14 bg-emerald-500 rounded-[1.5rem] flex items-center justify-center text-white -translate-y-8 shadow-2xl shadow-emerald-500/50 hover:scale-110 transition-all active:scale-90"><Plus size={28} /></Link>
          <Link href="/insights" className="p-3 text-slate-500"><PieIcon size={22} /></Link>
          <button className="p-3 text-slate-500"><LogOut size={22} /></button>
      </nav>
    </div>
  );
}