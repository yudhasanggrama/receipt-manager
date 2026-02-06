"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Save,
  Loader2,
  Tag,
  Wallet,
  Calendar,
  Layers,
  Image as ImageIcon,
  Trash2,
  Utensils,
  Car,
  ShoppingBag,
  HeartPulse,
  Film,
  FileText,
  ShoppingCart,
  Box,
} from "lucide-react";
import Link from "next/link";
import DeleteAction from "@/app/components/deleteButton/DeleteAction";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "Food", label: "Food", icon: Utensils, color: "bg-orange-100 text-orange-600" },
  { id: "Transport", label: "Transport", icon: Car, color: "bg-blue-100 text-blue-600" },
  { id: "Shopping", label: "Shopping", icon: ShoppingBag, color: "bg-pink-100 text-pink-600" },
  { id: "Health", label: "Health", icon: HeartPulse, color: "bg-red-100 text-red-600" },
  { id: "Entertainment", label: "Entertainment", icon: Film, color: "bg-purple-100 text-purple-600" },
  { id: "Bills", label: "Bills", icon: FileText, color: "bg-yellow-100 text-yellow-600" },
  { id: "Groceries", label: "Groceries", icon: ShoppingCart, color: "bg-emerald-100 text-emerald-600" },
  { id: "Others", label: "Others", icon: Box, color: "bg-slate-100 text-slate-600" },
];

export default function EditReceiptClient({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    merchant_name: "",
    total_amount: "",
    date: "",
    category: "Others",
    notes: "",
    image_url: "",
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
          date: data.date ? data.date.split("T")[0] : "",
          category: data.category || "Others",
          notes: data.notes || "",
          image_url: data.image_url || "",
        });
      } catch (err) {
        toast.error("Failed to load receipt");
      } finally {
        setLoading(false);
      }
    };
    loadReceipt();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const updateAction = new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(`/api/receipts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            total_amount: parseFloat(formData.total_amount),
          }),
        });

        if (!res.ok) throw new Error("Failed to update receipt");

        router.push("/receipts");
        router.refresh();
        resolve(true);
      } catch (err) {
        reject(err);
      } finally {
        setSaving(false);
      }
    });

    toast.promise(updateAction, {
      loading: 'Saving changes...',
      success: 'Receipt successfully update!',
      error: 'An error occurred while saving.',
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] relative overflow-hidden px-4 lg:px-8">
      {/* Background decorations */}
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

      <div className="relative z-10 max-w-5xl mx-auto grid lg:grid-cols-12 gap-8 py-4 lg:py-8">
        <aside className="lg:col-span-4 space-y-6">
          <Link
            href="/receipts"
            className="inline-flex items-center gap-3 px-5 py-3 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-emerald-600 transition-all"
          >
            <span className="grid place-items-center w-5 h-5">
              <ChevronLeft size={16} className="shrink-0" />
            </span>
            <span>Back to MyReceipts</span>
          </Link>

          <div className="bg-white rounded-[2.5rem] p-3 shadow-xl border border-slate-200">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-3 text-center tracking-[0.2em]">
              Original Receipt
            </p>
            <div className="max-w-90 mx-auto">
              <div className="relative aspect-3/4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                {formData.image_url ? (
                  <div className="absolute inset-0 grid place-items-center p-4">
                    <img
                      src={formData.image_url}
                      alt="Receipt"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                    <ImageIcon size={36} className="shrink-0" />
                    <span className="text-[10px] uppercase mt-2">No Image</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-5 sm:p-8 text-white shadow-2xl relative overflow-hidden">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase leading-tight">
              Edit <span className="text-emerald-400">Receipt</span>
            </h2>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 mt-2">
              Review and correct the data
            </p>

            <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-center">
              <div>
                <div className="text-[10px] uppercase text-slate-500">Record ID</div>
                <div className="text-[10px] font-mono text-emerald-400">#{id.slice(0, 8)}</div>
              </div>

              {/* 3. DeleteAction sudah otomatis menampilkan toast karena logic di dalam komponennya sudah kita update sebelumnya */}
              <DeleteAction
                itemLabel={formData.merchant_name}
                className="p-2 text-slate-400 hover:text-red-500"
                onDelete={async () => {
                   await fetch(`/api/receipts/${id}`, { method: "DELETE" });
                   router.push("/receipts");
                   router.refresh()
                }}
              >
                <Trash2 size={16} className="shrink-0" />
              </DeleteAction>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8">
          <form
            onSubmit={handleSubmit}
            className="bg-white/90 backdrop-blur-md rounded-[3rem] p-8 lg:p-12 border border-slate-200 shadow-xl space-y-8"
          >
            {/* Merchant */}
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                <Tag size={14} className="shrink-0 text-emerald-600" />
                Merchant Name
              </label>
              <input
                required
                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all"
                value={formData.merchant_name}
                onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                placeholder="Ex: Starbucks"
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                <Layers size={14} className="shrink-0 text-emerald-600" />
                Category Selection
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
                  const isSelected = formData.category === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: id })}
                      className={`px-3 py-4 rounded-xl text-[9px] font-black uppercase transition-all border-2 flex flex-col items-center gap-2
                        ${isSelected ? "border-emerald-600 ring-2 ring-emerald-600 shadow-md scale-[1.02]" : "border-transparent opacity-70 hover:opacity-100"} ${color}`}
                    >
                      <span className={`grid place-items-center w-8 h-8 rounded-lg ${isSelected ? "bg-white shadow-sm" : "bg-white/50"}`}>
                        <Icon size={16} className="shrink-0" />
                      </span>
                      <span className="truncate w-full text-center">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                  <Wallet size={14} className="shrink-0 text-emerald-600" />
                  Total Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">RP</span>
                  <input
                    type="number"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-black text-xl text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                  <Calendar size={14} className="shrink-0 text-emerald-600" />
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:bg-white focus:ring-4 ring-emerald-500/10 outline-none transition-all"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase text-slate-500 flex items-center gap-2">
                <ImageIcon size={14} className="shrink-0 text-emerald-600" />
                Additional Notes
              </label>
              <textarea
                className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl font-medium text-slate-900 focus:bg-white outline-none transition-all min-h-30"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add details..."
              />
            </div>

            <button
              disabled={saving}
              className="mx-auto block px-10 py-4 bg-slate-900 text-white rounded-full text-xs md:text-sm font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {saving ? <Loader2 size={18} className="animate-spin shrink-0" /> : <Save size={18} className="shrink-0" />}
                <span>{saving ? "Saving..." : "Update Transaction"}</span>
              </span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}