"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Download, PieChart as PieIcon, 
  Store, ArrowRight, Loader2, Calendar,
  LayoutDashboard, Receipt, LogOut, Plus, Sparkles, ChevronDown,
  Box, Car, FileText, Film, HeartPulse, ShoppingBag, ShoppingCart, Utensils,
  Search
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "../components/sidebar/SidebarClient";
import Flatpickr from "react-flatpickr";
import "flatpickr";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "Food", label: "Food", icon: <Utensils size={14} />, color: "bg-orange-100 text-orange-600", hex: "#F59E0B" },
  { id: "Transport", label: "Transport", icon: <Car size={14} />, color: "bg-blue-100 text-blue-600", hex: "#3B82F6" },
  { id: "Shopping", label: "Shop", icon: <ShoppingBag size={14} />, color: "bg-purple-100 text-purple-600", hex: "#8B5CF6" },
  { id: "Health", label: "Health", icon: <HeartPulse size={14} />, color: "bg-red-100 text-red-600", hex: "#EF4444" },
  { id: "Entertainment", label: "Ent", icon: <Film size={14} />, color: "bg-pink-100 text-pink-600", hex: "#EC4899" },
  { id: "Bills", label: "Bills", icon: <FileText size={14} />, color: "bg-yellow-100 text-yellow-600", hex: "#6B7280" },
  { id: "Groceries", label: "Grocer", icon: <ShoppingCart size={14} />, color: "bg-emerald-100 text-emerald-600", hex: "#10B981" },
  { id: "Others", label: "Other", icon: <Box size={14} />, color: "bg-slate-100 text-slate-600", hex: "#64748B" },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Food": "bg-orange-500", "Transport": "bg-blue-500", "Shopping": "bg-purple-500",
  "Health": "bg-red-500", "Entertainment": "bg-pink-500", "Bills": "bg-yellow-500",
  "Groceries": "bg-emerald-500", "Others": "bg-slate-400",
};

export default function InsightsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false); 
  
  const [dateRange, setDateRange] = useState<Date[]>([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date() 
  ]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  
  const [searchMerchant, setSearchMerchant] = useState(""); 
  const [debouncedSearch, setDebouncedSearch] = useState(""); 
  const [isExporting, setIsExporting] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setIsFiltering(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchMerchant);
      setIsFiltering(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchMerchant]);

  useEffect(() => {
    const fetchInsights = async () => {
      if (dateRange.length < 2) return;
      setLoading(true);
      try {
        // Ambil tanggal mulai (Tetap jam 00:00)
        const start = dateRange[0].toISOString().slice(0, 10);
        
        // Buat salinan tanggal akhir dan set waktunya ke akhir hari
        const endDate = new Date(dateRange[1]);
        endDate.setHours(23, 59, 59, 999); 
        
        // Kirim start dan end yang sudah mencakup seluruh hari ke API
        const startParam = start;
        const endParam = endDate.toISOString(); // Mengirim string ISO lengkap

        const res = await fetch(`/api/receipts?start=${startParam}&end=${endParam}`);
        const result = await res.json();
        setReceipts(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [dateRange]);

  const stats = useMemo(() => {
    const filteredData = receipts.filter(r => {
      const matchCat = selectedCats.length === 0 || selectedCats.includes(r.category);
      const matchMerchant = r.merchant_name?.toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchCat && matchMerchant;
    });

    const total = filteredData.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    
    const merchantMap = new Map<string, { total: number; count: number }>();
    filteredData.forEach(r => {
      const name = r.merchant_name || "Unknown";
      const amt = Number(r.total_amount) || 0;
      const current = merchantMap.get(name) || { total: 0, count: 0 };
      merchantMap.set(name, { total: current.total + amt, count: current.count + 1 });
    });

    const topMerchants = Array.from(merchantMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total).slice(0, 5);

    const catMap = new Map<string, number>();
    filteredData.forEach(r => {
      const cat = r.category || "Others";
      catMap.set(cat, (catMap.get(cat) || 0) + (Number(r.total_amount) || 0));
    });

    const categoryData = Array.from(catMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { total, topMerchants, categoryData, filteredData };
  }, [receipts, selectedCats, debouncedSearch]);

  // --- FUNGSI EXPORT PDF ---
 const handleExportPDF = async () => {
    if (stats.filteredData.length === 0) return toast.error("No data to export");
    setIsExporting(true);
    const loadingToast = toast.loading("Preparing your PDF report...");
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const startStr = dateRange[0].toLocaleDateString('id-ID');
        const endStr = dateRange[1].toLocaleDateString('id-ID');

        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text("SPENDING INSIGHT REPORT", 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Periode: ${startStr} - ${endStr}`, 14, 28);
        doc.text(`Total Pengeluaran: Rp ${stats.total.toLocaleString('id-ID')}`, 14, 34);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.text("TOP 5 MERCHANTS", 14, 45);
        
        autoTable(doc, {
          startY: 48,
          head: [['Rank', 'Merchant', 'Transaksi', 'Total Amount']],
          body: stats.topMerchants.map((m, i) => [
            i + 1, 
            m.name, 
            `${m.count} Trx`, 
            `Rp ${m.total.toLocaleString('id-ID')}`
          ]),
          headStyles: { fillColor: [5, 150, 105] },
          margin: { left: 14 },
        });

        // Category Table
        const finalY = (doc as any).lastAutoTable.finalY + 12;
        doc.setFontSize(11);
        doc.text("SPENDING BY CATEGORY", 14, finalY);
        
        autoTable(doc, {
          startY: finalY + 4,
          head: [['Kategori', 'Amount', 'Persentase']],
          body: stats.categoryData.map(c => [
            c.name, 
            `Rp ${c.amount.toLocaleString('id-ID')}`, 
            `${((c.amount / (stats.total || 1)) * 100).toFixed(1)}%`
          ]),
          headStyles: { fillColor: [5, 150, 105] },
          margin: { left: 14 },
        });

        // Save PDF
        doc.save(`Insights_Report_${startStr}_to_${endStr}.pdf`);

        toast.success("PDF Report successfully downloaded", { id: loadingToast });
      } catch (error) {
        console.error("PDF Export Error:", error);
        toast.error("Failed to generate PDF", { id: loadingToast });
      } finally {
        setIsExporting(false);
      }
    }, 1500);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col lg:flex-row">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-[100px]" />
        <div className="absolute bottom-0 right-24 h-96 w-96 rounded-full bg-lime-300/40 blur-[100px]" />
      </div>

      <Sidebar handleLogout={handleLogout} />

      <div className="flex-1 pb-24 lg:pb-10 lg:ml-60 relative z-10">
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-200 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Analysis</span>
              </div>
              <h1 className="text-xl font-black  uppercase tracking-tighter text-slate-900">Insights</h1>
            </div>
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl disabled:opacity-50"
            >
             {isExporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} className="group-hover:animate-bounce" />
                )}
              Export
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto p-6 space-y-8">
          <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Total Spending</p>
                  <h2 className={`text-5xl font-black text-slate-900 tracking-tighter transition-all duration-300 ${isFiltering ? 'opacity-30 blur-sm scale-95' : 'opacity-100 blur-0 scale-100'}`}>
                    <span className="text-emerald-500 text-2xl mr-1">Rp</span>
                    {stats.total.toLocaleString('id-ID')}
                  </h2>
                </div>

                <div className="flex flex-col gap-2 min-w-60">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Calendar size={12}/> Analysis Period
                  </label>
                  <div className="relative group">
                    <Flatpickr
                      value={dateRange}
                      options={{ mode: "range", dateFormat: "d - M - Y" }}
                      onChange={(dates) => dates.length === 2 && setDateRange(dates)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black text-slate-700 outline-none focus:ring-2 ring-emerald-500/20"
                    />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="flex overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap gap-2 no-scrollbar">
                {CATEGORIES.map(cat => {
                  const isSelected = selectedCats.includes(cat.id);
                  
                  return (
                    <button 
                      key={cat.id}
                      onClick={() => setSelectedCats(prev => 
                        prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id]
                      )}
                      className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-extrabold uppercase transition-all flex items-center gap-1.5 border ${
                        isSelected 
                          ? `${cat.color} border-current shadow-sm scale-95` // Pakai warna asli kategori (e.g., bg-orange-100 text-orange-600)
                          : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {/* Icon akan mengikuti warna text dari parent (cat.color) */}
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 mb-8 text-slate-900">
                <Store size={20} className="text-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-widest">Top Merchants</h3>
              </div>
              
              <div className={`space-y-6 transition-all duration-300 ${isFiltering ? 'opacity-20 blur-sm' : 'opacity-100'}`}>
                {loading ? (
                  <div className="flex flex-col gap-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-12 w-full bg-slate-50 animate-pulse rounded-xl" />
                    ))}
                  </div>
                ) : stats.topMerchants.length > 0 ? (
                  stats.topMerchants.map((m, index) => (
                    <div key={m.name} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-slate-800 uppercase  leading-none">{m.name}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{m.count} Trx</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-slate-900 ">Rp {m.total.toLocaleString('id-ID')}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-[10px] font-black text-slate-300 uppercase py-10 tracking-widest ">No matching records found</p>
                )}
              </div>
              
              {isFiltering && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                   <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-100 shadow-sm flex items-center gap-2">
                     <Loader2 size={14} className="animate-spin text-emerald-500" />
                     <span className="text-[9px] font-black uppercase text-emerald-700">Filtering...</span>
                   </div>
                </div>
              )}
            </section>

            <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-8 text-slate-900">
                <PieIcon size={20} className="text-emerald-500" />
                <h3 className="text-sm font-black uppercase tracking-widest">Categories</h3>
              </div>

              <div className={`space-y-6 transition-all duration-300 ${isFiltering ? 'opacity-30' : 'opacity-100'}`}>
                {stats.categoryData.map((catData) => {
                  const categoryInfo = CATEGORIES.find(c => c.id === catData.name) || CATEGORIES[CATEGORIES.length - 1];
                  const percentage = (catData.amount / (stats.total || 1)) * 100;
                  return (
                    <div key={catData.name} className="space-y-2">
                      <div className="flex justify-between items-end">
                        <div className="flex items-center gap-2">
                          <span className={categoryInfo.color.split(' ')[1]}>{categoryInfo.icon}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {catData.name}
                          </span>
                        </div>
                        <span className="text-xs font-black text-slate-900">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden flex">
                        <div 
                          className="h-full rounded-full transition-all duration-1000" 
                          style={{ 
                            width: `${percentage}%`,
                            backgroundColor: categoryInfo.hex 
                          }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <section className="pt-4 pb-12 lg:pb-0">
            <button 
              onClick={handleExportPDF}
              disabled={isExporting}
              className="w-full group relative overflow-hidden bg-slate-900 text-white rounded-2xl p-4 hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} className="group-hover:animate-bounce" />}
                <span className="text-xs font-black uppercase tracking-widest">Download Analysis Report (PDF)</span>
              </div>
            </button>
          </section>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-50 flex items-center justify-around px-4">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 ${pathname === '/dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-black uppercase">Home</span>
        </Link>
        <Link href="/receipts" className={`flex flex-col items-center gap-1 ${pathname === '/receipts' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <Receipt size={20} />
          <span className="text-[9px] font-black uppercase">Bills</span>
        </Link>
        <Link href="/receipts/new" className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg -translate-y-5 border-[6px] border-[#F8FAFC]">
          <Plus size={24} />
        </Link>
        <Link href="/insights" className={`flex flex-col items-center gap-1 ${pathname === '/insights' ? 'text-emerald-600' : 'text-slate-400'}`}>
          <PieIcon size={20} />
          <span className="text-[9px] font-black uppercase">Insights</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400">
          <LogOut size={20} />
          <span className="text-[9px] font-black uppercase">Logout</span>
        </button>
      </nav>
    </div>
  );
}