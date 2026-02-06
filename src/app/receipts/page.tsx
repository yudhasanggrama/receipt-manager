"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
    Search, Trash2, Edit3, Loader2, 
    Filter, ReceiptText, Sparkles, Box, Car, FileText, 
    Film, HeartPulse, ShoppingBag, ShoppingCart, Utensils,
    ChevronDown, CalendarArrowUp, CalendarArrowDown,
    BanknoteArrowUp, BanknoteArrowDown, LayoutDashboard, 
    Plus, PieChart, LogOut, Receipt, X, Calendar as CalendarIcon
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "../components/sidebar/SidebarClient";
import DeleteAction from "../components/deleteButton/DeleteAction";

// FLAT PICKR IMPORTS
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr";

// --- CONSTANTS ---
const CATEGORIES = [
  { id: "Food", label: "Food", icon: <Utensils size={16} />, color: "bg-orange-100 text-orange-600" },
  { id: "Transport", label: "Transport", icon: <Car size={16} />, color: "bg-blue-100 text-blue-600" },
  { id: "Shopping", label: "Shopping", icon: <ShoppingBag size={16} />, color: "bg-purple-100 text-purple-600" },
  { id: "Health", label: "Health", icon: <HeartPulse size={16} />, color: "bg-red-100 text-red-600" },
  { id: "Entertainment", label: "Entertainment", icon: <Film size={16} />, color: "bg-pink-100 text-pink-600" },
  { id: "Bills", label: "Bills", icon: <FileText size={16} />, color: "bg-yellow-100 text-yellow-600" },
  { id: "Groceries", label: "Groceries", icon: <ShoppingCart size={16} />, color: "bg-emerald-100 text-emerald-600" },
  { id: "Others", label: "Others", icon: <Box size={16} />, color: "bg-slate-100 text-slate-600" },
];

const SORT_OPTIONS = [
    { id: "date_desc", label: "Newest First", icon: <CalendarArrowUp size={16} />, color: "bg-emerald-100 text-emerald-600" },
    { id: "date_asc", label: "Oldest First", icon: <CalendarArrowDown size={16} />, color: "bg-emerald-100 text-emerald-600" },
    { id: "amount_desc", label: "Highest Amount", icon: <BanknoteArrowUp size={16} />, color: "bg-emerald-100 text-emerald-600" },
    { id: "amount_asc", label: "Lowest Amount", icon: <BanknoteArrowDown size={16} />, color: "bg-emerald-100 text-emerald-600" },
];

export default function MyReceiptsPage(p0: { params: Promise<{ id: string; }>; }) {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [sortBy, setSortBy] = useState("date_desc");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    
    const [isCatOpen, setIsCatOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);

    const limit = 20;
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    // States for filtering
    const [minAmount, setMinAmount] = useState("");
    const [maxAmount, setMaxAmount] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    // Ref for Flatpickr
    const datePickerRef = useRef<HTMLInputElement>(null);

    // Helper to format date without timezone shift (Anti H+1)
    const formatDateLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Initialize Flatpickr
    useEffect(() => {
        if (datePickerRef.current) {
            const fp = flatpickr(datePickerRef.current, {
                mode: "range",
                dateFormat: "Y-m-d",
                onChange: (selectedDates) => {
                    if (selectedDates.length === 2) {
                        setStartDate(formatDateLocal(selectedDates[0]));
                        setEndDate(formatDateLocal(selectedDates[1]));
                        setPage(1);
                    }
                },
            });

            return () => {
                fp.destroy();
            };
        }
    }, []);

    // Debounce Logic for Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchReceipts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                q: debouncedSearch, 
                category: category,
                sort: sortBy,
                minAmount,
                maxAmount,
                startDate,
                endDate
            });

            const res = await fetch(`/api/receipts?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const result = await res.json();
            
            setReceipts(result.data || []);
            setTotalPages(result.totalPages || 1);
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setLoading(false);
        }
    }, [page, debouncedSearch, category, sortBy, minAmount, maxAmount, startDate, endDate]);

    // Clear Filters including Flatpickr instance
    const clearFilters = () => {
        setSearch("");
        setCategory("");
        setSortBy("date_desc");
        setMinAmount("");
        setMaxAmount("");
        setStartDate("");
        setEndDate("");
        setPage(1);
        
        // Reset visual flatpickr
        if (datePickerRef.current) {
            const fp = (datePickerRef.current as any)._flatpickr;
            if (fp) fp.clear();
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            fetchReceipts();
        }, 300);
        return () => clearTimeout(handler);
    }, [fetchReceipts]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/login");
    };

    return (
        <div className="relative min-h-screen bg-[#F8FAFC] font-sans text-slate-900 flex flex-col lg:flex-row">
            
            <Sidebar handleLogout={handleLogout} />

            <div className="flex-1 pb-24 lg:pb-10 lg:ml-60">
                <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-[100px]" />
                <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-lime-300/40 blur-[100px]" />
                
                <main className="relative z-10 max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
                    {/* HEADER */}
                    <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles size={14} className="text-emerald-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600/60">Archive Manager</span>
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                                My <span className="text-emerald-600 underline decoration-lime-400 decoration-4">Receipts</span>
                            </h2>
                        </div>
                        {(minAmount || maxAmount || startDate || endDate || category) && (
                            <button 
                                onClick={clearFilters}
                                className="text-[10px] font-bold uppercase text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                            >
                                <X size={12} /> Clear Filters
                            </button>
                        )}
                    </div>

                    {/* FILTERS SECTION */}
                    <div className="space-y-3">
                        {/* Row 1: Search & Dropdowns */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="relative col-span-1 md:col-span-2 group">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    value={search}
                                    placeholder="Search merchant..." 
                                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-sm"
                                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                />
                            </div>

                            <div className="relative">
                                <button 
                                    onClick={() => { setIsCatOpen(!isCatOpen); setIsSortOpen(false); }} 
                                    className="w-full flex items-center justify-between px-5 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-bold uppercase text-slate-600 shadow-sm transition-all active:scale-95">
                                    <div className="flex items-center gap-2 truncate">
                                        {category ? (
                                            <span className={CATEGORIES.find(c => c.id === category)?.color.split(' ')[1]}>
                                                {CATEGORIES.find(c => c.id === category)?.icon}
                                            </span>
                                        ) : (
                                            <Filter size={14} className="text-slate-400" />
                                        )}
                                        
                                        {/* Bagian Teks Label */}
                                        <span className={`truncate ${
                                            category 
                                                ? CATEGORIES.find(c => c.id === category)?.color.split(' ')[1]
                                                : 'text-slate-600'
                                        }`}>
                                            {category || "All Categories"}
                                        </span>
                                    </div>
                                    <ChevronDown size={14} className={`transition-transform ${isCatOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {isCatOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-100 rounded-2xl shadow-xl p-2 max-h-60 overflow-y-auto no-scrollbar">
                                        <button onClick={() => { setCategory(""); setPage(1); setIsCatOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                                            <div className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-md"><ReceiptText size={12} /></div>
                                            All Categories
                                        </button>
                                        {CATEGORIES.map(cat => (
                                            <button key={cat.id} onClick={() => { setCategory(cat.id); setPage(1); setIsCatOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase rounded-lg mb-0.5 transition-all ${category === cat.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                                                <div className={`w-6 h-6 flex items-center justify-center rounded-md ${cat.color} bg-opacity-20`}>{cat.icon}</div>
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <button onClick={() => { setIsSortOpen(!isSortOpen); setIsCatOpen(false); }} className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-slate-200">
                                    <span className="flex items-center gap-2">
                                        {/* Mengambil icon dan label dari option yang terpilih */}
                                        {SORT_OPTIONS.find(o => o.id === sortBy)?.icon}
                                        {SORT_OPTIONS.find(o => o.id === sortBy)?.label || "Sort By"}
                                    </span>
                                    <ChevronDown size={14} />
                                </button>
                                {isSortOpen && (
                                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-100 rounded-2xl shadow-xl p-2">
                                        {SORT_OPTIONS.map(opt => (
                                            <button key={opt.id} onClick={() => { setSortBy(opt.id); setPage(1); setIsSortOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold uppercase rounded-lg mb-1 transition-colors ${sortBy === opt.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                                                <span className={sortBy === opt.id ? "text-emerald-600" : "text-slate-400"}>{opt.icon}</span>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Row 2: Flatpickr & Amount Inputs */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="relative col-span-1 md:col-span-2">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    ref={datePickerRef}
                                    placeholder="SELECT DATE RANGE" 
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-emerald-500 shadow-sm cursor-pointer"
                                    readOnly
                                />
                            </div>
                            <input 
                                type="number" 
                                placeholder="Min Rp"
                                value={minAmount}
                                onChange={(e) => { setMinAmount(e.target.value); setPage(1); }}
                                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-emerald-500 shadow-sm"
                            />
                            <input 
                                type="number" 
                                placeholder="Max Rp"
                                value={maxAmount}
                                onChange={(e) => { setMaxAmount(e.target.value); setPage(1); }}
                                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-emerald-500 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* TABLE AREA */}
                    <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
                        {loading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={32} /></div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {receipts.map((r) => (
                                    <div key={r.id} className="p-5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                                            {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <Receipt size={20} className="m-auto text-slate-300" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">{r.merchant_name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                {new Date(r.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})} • {r.category}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                                                {r.notes}
                                            </p>
                                        </div>
                                        <div className="text-right mr-2">
                                            <p className="font-black text-slate-900 text-sm">Rp{Number(r.total_amount).toLocaleString('id-ID')}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => router.push(`/receipts/edit/${r.id}`)} className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"><Edit3 size={16}/></button>
                                            <DeleteAction 
                                                itemLabel={r.merchant_name}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                                onDelete={async () => {
                                                    const res = await fetch(`/api/receipts/${r.id}`, { method: 'DELETE' });
                                                    if (res.ok) {
                                                        await fetchReceipts(); 
                                                        router.refresh(); 
                                                    } else {
                                                        throw new Error("Gagal menghapus data dari server");
                                                    }
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </DeleteAction>
                                        </div>
                                    </div>
                                ))}
                                {receipts.length === 0 && (
                                    <div className="py-20 text-center text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                                        No Receipts Found
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Page {page} of {totalPages}</span>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase disabled:opacity-50 transition-all">Prev</button>
                                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase disabled:opacity-50 transition-all">Next</button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* MOBILE NAVIGATION */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 flex items-center justify-around px-4">
                <Link href="/dashboard" className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/dashboard' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
                    <LayoutDashboard size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Home</span>
                </Link>
                <Link href="/receipts" className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/receipts' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
                    <Receipt size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Bills</span>
                </Link>
                <Link href="/receipts/new" className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 -translate-y-5 border-[6px] border-[#F8FAFC] hover:bg-emerald-700 transition-transform active:scale-90">
                    <Plus size={24} />
                </Link>
                <Link href="/insights" className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/insights' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
                    <PieChart size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Stats</span>
                </Link>
                <button onClick={handleLogout} className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut size={20} />
                    <span className="text-[9px] font-bold uppercase tracking-tighter">Logout</span>
                </button>
            </nav>
        </div>
    );
}