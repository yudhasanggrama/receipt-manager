"use client";

import { useState, useEffect } from "react";
import { Search, Trash2, Edit3, ChevronLeft, Loader2, Filter, ReceiptText } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CATEGORIES = ["Food & Drink", "Transport", "Shopping", "Health", "Entertainment", "Bills", "Groceries", "Others"];

export default function MyReceiptsPage() {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 8;

    const router = useRouter();

    const fetchReceipts = async () => {
        setLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                q: search,
                category: category
            });
            const res = await fetch(`/api/receipts?${query.toString()}`);
            const result = await res.json();
            setReceipts(result.data || []);
            setTotalPages(result.totalPages || 1);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    useEffect(() => {
        const handler = setTimeout(() => fetchReceipts(), 300);
        return () => clearTimeout(handler);
    }, [page, search, category]);

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus struk ini secara permanen?")) return;
        const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
        if (res.ok) fetchReceipts();
    };

    return (
        <div className="min-h-screen bg-[#fcfdfd] relative overflow-hidden font-sans">
            {/* GRID BACKGROUND PATTERN (Sesuai kode yang Anda berikan) */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, #16a34a 1px, transparent 1px), linear-gradient(to bottom, #16a34a 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                }}
            />

            {/* RADIAL GRADIENT - Memberikan efek kedalaman di tengah grid */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#fcfdfd_80%)]" />

            <div className="relative max-w-7xl mx-auto p-4 lg:p-12 space-y-10">
                
                {/* HEADER SECTION */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="group p-4 bg-white border-2 border-emerald-100 rounded-3xl shadow-sm hover:border-emerald-500 hover:shadow-emerald-200/50 transition-all">
                            <ChevronLeft size={24} className="text-emerald-600 group-hover:-translate-x-1 transition-transform"/>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <ReceiptText size={16} className="text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600/60">Registry System</span>
                            </div>
                            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                                MY<span className="text-emerald-600">Receipts</span>
                            </h1>
                        </div>
                    </div>

                    {/* STATS MINI (Optional, agar header tidak kosong) */}
                    <div className="hidden lg:flex gap-4">
                        <div className="px-6 py-3 bg-white border-2 border-emerald-50 rounded-2xl shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Items</p>
                            <p className="text-xl font-black text-slate-900">{receipts.length}</p>
                        </div>
                    </div>
                </div>

                {/* SEARCH & FILTER CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative col-span-1 md:col-span-2 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:scale-110 transition-transform" size={20} />
                        <input 
                            placeholder="Find merchant, notes, or items..." 
                            className="w-full pl-14 pr-6 py-5 bg-white/80 backdrop-blur-md border-2 border-slate-200 rounded-3xl text-lg font-black text-slate-900 placeholder:text-slate-300 outline-none focus:border-emerald-500 focus:ring-8 ring-emerald-500/5 transition-all shadow-sm"
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
                        <select 
                            className="w-full pl-14 pr-10 py-5 bg-white/80 backdrop-blur-md border-2 border-slate-200 rounded-3xl text-lg font-black text-slate-900 outline-none appearance-none focus:border-emerald-500 cursor-pointer transition-all shadow-sm"
                            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        >
                            <option value="">All Categories</option>
                            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-500/50">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>
                </div>

                {/* DATA TABLE */}
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-2xl shadow-emerald-900/5 overflow-hidden relative">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Registry Entry</th>
                                    <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Metadata</th>
                                    <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Valuation</th>
                                    <th className="px-10 py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Ops</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="py-40 text-center">
                                            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-4" size={40} />
                                            <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.5em]">Fetching Records</p>
                                        </td>
                                    </tr>
                                ) : (
                                    receipts.map((r) => (
                                        <tr key={r.id} className="hover:bg-emerald-50/40 transition-all group">
                                            <td className="px-10 py-5">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border-2 border-slate-100 group-hover:border-emerald-300 transition-all">
                                                        {r.image_url ? (
                                                            <img src={r.image_url} alt="thumb" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-slate-200">VOID</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-lg uppercase leading-tight group-hover:text-emerald-700">{r.merchant_name}</p>
                                                        <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest">{r.category}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-600">{new Date(r.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold truncate max-w-[180px] mt-1">{r.notes || "---"}</span>
                                                </div>
                                            </td>
                                            <td className="px-10 py-5 text-right">
                                                <p className="text-2xl font-black italic text-slate-900 group-hover:scale-105 transition-transform origin-right">
                                                    <span className="text-[10px] not-italic text-emerald-500 mr-2 uppercase tracking-tighter font-black">IDR</span>
                                                    {Number(r.total_amount).toLocaleString('id-ID')}
                                                </p>
                                            </td>
                                            <td className="px-10 py-5">
                                                <div className="flex justify-center gap-3">
                                                    <button onClick={() => router.push(`/receipts/edit/${r.id}`)} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-emerald-600 hover:border-emerald-600 shadow-sm hover:shadow-emerald-100 transition-all">
                                                        <Edit3 size={18}/>
                                                    </button>
                                                    <button onClick={() => handleDelete(r.id)} className="p-3 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-red-500 hover:border-red-500 shadow-sm hover:shadow-red-100 transition-all">
                                                        <Trash2 size={18}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINATION BOTTOM BAR */}
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
                            Surface Page <span className="text-emerald-600">{page}</span> of {totalPages}
                        </div>
                        <div className="flex gap-3">
                            <button 
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                                className="px-6 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-emerald-500 hover:text-emerald-500 disabled:opacity-30 transition-all shadow-sm"
                            >
                                Back
                            </button>
                            <button 
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-10 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-900/20 disabled:opacity-30 transition-all active:scale-95"
                            >
                                Forward
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}