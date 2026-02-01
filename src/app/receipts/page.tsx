"use client";

import { useState, useEffect } from "react";
import { Search, Trash2, Edit3, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MyReceiptsPage() {
    const [receipts, setReceipts] = useState<any[]>([]);
    const [search, setSearch] = useState(""); // Nilai input langsung
    const [debouncedSearch, setDebouncedSearch] = useState(""); // Nilai setelah delay
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false); // Fake loading khusus search
    const router = useRouter();

    // 1. Fetch Data Awal
    useEffect(() => {
        const fetchReceipts = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/receipts");
                const data = await res.json();
                setReceipts(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error:", error);
            } finally {
                // Memberikan sedikit delay agar transisi loading terasa halus
                setTimeout(() => setLoading(false), 800);
            }
        };
        fetchReceipts();
    }, []);

    // 2. Logika Debounce & Fake Loading untuk Search
    useEffect(() => {
        if (search) setIsSearching(true); // Mulai loading saat user mengetik
        
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false); // Berhenti loading setelah user berhenti mengetik
        }, 500); // Delay 500ms

        return () => clearTimeout(handler);
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm("Hapus struk ini?")) return;
        const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
        if (res.ok) setReceipts(prev => prev.filter(r => r.id !== id));
    };

    // Filter menggunakan debouncedSearch, bukan search biasa
    const filtered = receipts.filter(r => 
        r.merchant_name?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-12 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-100/40 blur-[120px] pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-5">
                        <Link href="/dashboard" className="p-4 bg-white rounded-2xl border shadow-sm hover:text-emerald-600 transition-all"><ChevronLeft size={20} color="#009966"/></Link>
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">My <span className="text-emerald-600">Receipts</span></h1>
                    </div>

                    {/* Input Search dengan Status Loading */}
                    <div className="relative w-full md:w-80">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            {isSearching ? (
                                <Loader2 className="animate-spin text-emerald-500" size={18} />
                            ) : (
                                <Search className="text-emerald-500" size={18} />
                            )}
                        </div>
                        <input 
                            placeholder="Search..." 
                            value={search}
                            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 text-slate-900 rounded-3xl text-sm font-bold outline-none focus:ring-4 ring-emerald-500/10 transition-all placeholder:text-emerald-400 placeholder:font-normal"
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-2xl rounded-[3.5rem] border border-white shadow-2xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-emerald-600/5 border-b border-emerald-100">
                            <tr>
                                <th className="px-10 py-7 text-[10px] font-black text-emerald-700 uppercase tracking-widest">Merchant</th>
                                <th className="px-10 py-7 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-right">Amount</th>
                                <th className="px-10 py-7 text-[10px] font-black text-emerald-700 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 className="animate-spin text-emerald-600" size={30} />
                                            <p className="animate-pulse text-emerald-600 font-black italic uppercase tracking-widest">Syncing Data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length > 0 ? (
                                filtered.map(r => (
                                    <tr key={r.id} className="hover:bg-emerald-50/40 transition-all group">
                                        <td className="px-10 py-6">
                                            <p className="text-base font-black text-slate-800 uppercase group-hover:text-emerald-700">{r.merchant_name}</p>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(r.date).toLocaleDateString('id-ID')}</span>
                                        </td>
                                        <td className="px-10 py-6 text-right font-black italic text-lg text-slate-900">
                                            Rp {Number(r.total_amount).toLocaleString('id-ID')}
                                        </td>
                                        <td className="px-10 py-6">
                                            <div className="flex justify-center gap-3">
                                                <button onClick={() => router.push(`/receipts/edit/${r.id}`)} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all"><Edit3 size={18}/></button>
                                                <button onClick={() => handleDelete(r.id)} className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={18}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={3} className="py-20 text-center text-slate-400 italic">No receipts found for "{debouncedSearch}"</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}