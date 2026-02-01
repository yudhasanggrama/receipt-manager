"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
    ChevronLeft, Save, Loader2, Tag, Wallet, 
    Calendar, Layers, Image as ImageIcon, Trash2 
} from "lucide-react";
import Link from "next/link";

// Sinkronisasi kategori dengan Dashboard
const CATEGORIES = [
    { name: "Food & Drink", icon: "🍔" },
    { name: "Transport", icon: "🚗" },
    { name: "Shopping", icon: "🛍️" },
    { name: "Health", icon: "💊" },
    { name: "Entertainment", icon: "🎬" },
    { name: "Bills", icon: "📄" },
    { name: "Groceries", icon: "🛒" },
    { name: "Others", icon: "📦" },
];

export default function EditReceiptClient({ id }: { id: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // State lengkap untuk mendukung Core Features
    const [formData, setFormData] = useState({
        merchant_name: "",
        total_amount: "",
        date: "",
        category: "Others",
        notes: "",
        image_url: "" // Penting untuk Full Image Preview
    });

    // Fetch data dari API GET yang Anda berikan
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
            category: data.category || "Others",
            notes: data.notes || "",
            image_url: data.image_url || "" 
            });
        } catch (err) {
            console.error("Error loading receipt:", err);
        } finally {
            setLoading(false);
        }
        };
        if (id) loadReceipt();
    }, [id]);

    // Handle Update via API PATCH
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
        const res = await fetch(`/api/receipts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
            ...formData, 
            total_amount: parseFloat(formData.total_amount) 
            }),
        });
        if (res.ok) {
            router.push("/receipts");
            router.refresh();
        }
        } catch (err) {
        console.error("Error updating receipt:", err);
        } finally {
        setSaving(false);
        }
    };

    // Handle Delete via API DELETE
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        try {
        const res = await fetch(`/api/receipts/${id}`, { method: "DELETE" });
        if (res.ok) {
            router.push("/receipts");
            router.refresh();
        }
        } catch (err) {
        console.error("Error deleting receipt:", err);
        }
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
        
        <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-12 gap-8">
            
            {/* Sidebar Kiri - Preview Struk & Status */}
            <div className="lg:col-span-4 space-y-6">
            <Link href="/receipts" className="inline-flex items-center gap-3 px-5 py-3 bg-white rounded-2xl shadow-sm border border-slate-200 text-[10px] font-black uppercase text-slate-600 hover:text-emerald-600 transition-all group tracking-widest">
                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                Back to Archive
            </Link>

            {/* Fitur Core: Receipt Detail View (Full Image) */}
            <div className="bg-white rounded-[2.5rem] p-3 shadow-xl border border-slate-200 overflow-hidden">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-3 text-center tracking-[0.2em]">Original Receipt</p>
                <div className="aspect-[3/4] bg-slate-50 rounded-2xl overflow-hidden relative border border-dashed border-slate-200">
                {formData.image_url ? (
                    <img 
                    src={formData.image_url} 
                    alt="Receipt Original" 
                    className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon size={40} strokeWidth={1} />
                    <p className="text-[10px] font-bold mt-2 italic">NO IMAGE FOUND</p>
                    </div>
                )}
                </div>
            </div>
            
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl">
                <h2 className="text-2xl font-black italic uppercase leading-tight text-white mb-2">Edit<br/><span className="text-emerald-400">Record</span></h2>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-8 leading-relaxed">Review and correct the data captured by AI.</p>
                
                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Record ID</span>
                    <span className="text-[10px] font-mono text-emerald-400">#{id.slice(0, 8)}</span>
                </div>
                <button onClick={handleDelete} className="p-3 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                    <Trash2 size={18} />
                </button>
                </div>
            </div>
            </div>

            {/* Form Kanan - AI Data Correction */}
            <div className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="bg-white rounded-[3rem] p-8 lg:p-12 border border-slate-200 shadow-xl space-y-8">
                
                {/* Merchant Section */}
                <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                    <Tag size={14} className="text-emerald-600"/> Merchant Name
                </label>
                <input 
                    required
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all" 
                    value={formData.merchant_name} 
                    onChange={e => setFormData({...formData, merchant_name: e.target.value})} 
                    placeholder="Ex: Starbucks"
                />
                </div>

                {/* Category Selection Grid */}
                <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                    <Layers size={14} className="text-emerald-600"/> Category Selection
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map((cat) => (
                    <button
                        key={cat.name}
                        type="button"
                        onClick={() => setFormData({...formData, category: cat.name})}
                        className={`px-3 py-4 rounded-xl text-[9px] font-black uppercase transition-all border-2 flex flex-col items-center gap-2 ${
                        formData.category === cat.name 
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200'
                        }`}
                    >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="truncate w-full text-center">{cat.name}</span>
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
                <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2 px-1">
                        <ImageIcon size={14} className="text-emerald-600"/> Additional Notes
                    </label>
                    <textarea 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:bg-white outline-none transition-all min-h-[100px]" 
                        value={formData.notes} 
                        onChange={e => setFormData({...formData, notes: e.target.value})} 
                        placeholder="Add details like 'Dinner with client' or 'Office supplies'..."
                    />
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