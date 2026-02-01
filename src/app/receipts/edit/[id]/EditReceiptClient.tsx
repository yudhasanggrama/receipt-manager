"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save, Loader2, Tag, Wallet, Calendar, Layers, Info } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
    { name: "Food & Drink", icon: "🍔" },
    { name: "Transport", icon: "🚗" },
    { name: "Shopping", icon: "🛍️" },
    { name: "Bills", icon: "📄" },
    { name: "Others", icon: "📦" },
];

export default function EditReceiptClient({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        merchant_name: "",
        total_amount: "",
        date: "",
        category: "Others"
    });

    useEffect(() => {
        const loadReceipt = async () => {
        try {
            const res = await fetch(`/api/receipts/${id}`);
            if (!res.ok) throw new Error("Data tidak ditemukan");
            const data = await res.json();
            setFormData({
            merchant_name: data.merchant_name || "",
            total_amount: data.total_amount?.toString() || "",
            date: data.date ? data.date.split('T')[0] : "",
            category: data.category || "Others"
            });
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
        };
        if (id) loadReceipt();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
        const res = await fetch(`/api/receipts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...formData, total_amount: parseFloat(formData.total_amount) }),
        });
        if (res.ok) { router.push("/receipts"); router.refresh(); }
        } catch (err) { console.error(err); } 
        finally { setSaving(false); }
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <p className="font-black italic text-emerald-600">LOADING DATA...</p>
        </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden flex items-center justify-center p-4 lg:p-8">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-100/50 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10 w-full max-w-4xl grid lg:grid-cols-12 gap-8">
            
            {/* Left Sidebar - Status */}
            <div className="lg:col-span-4 space-y-6">
            <Link href="/receipts" className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-xs font-bold text-slate-600 hover:text-emerald-600 transition-all group">
                <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                Back to Archive
            </Link>
            
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
                <h2 className="text-2xl font-black italic uppercase leading-tight text-white mb-2">Edit<br/><span className="text-emerald-400">Record</span></h2>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-8 text-balance">Review and correct the data captured by AI.</p>
                
                <div className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex justify-between">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">Record ID</span>
                    <span className="text-[10px] font-mono text-emerald-400">#{id.slice(0, 8)}</span>
                    </div>
                </div>
            </div>
            </div>

            {/* Right Main Form */}
            <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 lg:p-12 border border-slate-200 shadow-xl space-y-8">
                
                {/* Merchant Section */}
                <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                    <Tag size={14} className="text-emerald-600"/> Merchant Name
                </label>
                <input 
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all placeholder:text-slate-300" 
                    value={formData.merchant_name} 
                    onChange={e => setFormData({...formData, merchant_name: e.target.value})} 
                    placeholder="Ex: Starbucks"
                />
                </div>

                {/* Category Section */}
                <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                    <Layers size={14} className="text-emerald-600"/> Category Selection
                </label>
                <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                    <button
                        key={cat.name}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat.name})}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                        formData.category === cat.name 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-100 scale-105' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200'
                        }`}
                    >
                        {cat.icon} {cat.name}
                    </button>
                    ))}
                </div>
                </div>

                {/* Amount & Date Grid */}
                <div className="grid md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                    <Wallet size={14} className="text-emerald-600"/> Total Amount
                    </label>
                    <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 italic">RP</span>
                    <input 
                        type="number" 
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black italic text-xl text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all" 
                        value={formData.total_amount} 
                        onChange={e => setFormData({...formData, total_amount: e.target.value})} 
                    />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                    <Calendar size={14} className="text-emerald-600"/> Transaction Date
                    </label>
                    <input 
                    type="date" 
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    />
                </div>
                </div>

                {/* Submit Button */}
                <button 
                disabled={saving} 
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-3 mt-4 disabled:opacity-50"
                >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                {saving ? "SAVING..." : "UPDATE TRANSACTION"}
                </button>
            </form>
            </div>
        </div>
        </div>
    );
}