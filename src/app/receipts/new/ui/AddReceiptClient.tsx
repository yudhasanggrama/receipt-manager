"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, ImageIcon, Search, Sparkles } from "lucide-react";

// --- HELPERS ---
function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// Daftar kategori agar mudah dikelola
const CATEGORIES = [
  { id: "Food", label: "🍔 Food" },
  { id: "Transport", label: "🚗 Transport" },
  { id: "Shopping", label: "🛍️ Shopping" },
  { id: "Health", label: "💊 Health" },
  { id: "Entertainment", label: "🎬 Entertainment" },
  { id: "Bills", label: "📄 Bills" },
  { id: "Groceries", label: "🛒 Groceries" },
  { id: "Others", label: "📦 Others" },
];

export default function AddReceiptClient() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "ocr" | "upload" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  
  const [rawGeminiData, setRawGeminiData] = useState<any>(null);

  const [formData, setFormData] = useState({
    merchant_name: "",
    amount: "", 
    date: "",   
    category: "Others", // Default ID kategori
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
      if (f) {
        setFile(f);
        setPreview(URL.createObjectURL(f));
        setRawGeminiData(null); // Reset data lama jika ganti gambar
        setError(null);
      }
  };

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  async function runOCR() {
    if (!file) return;
    setStatus("ocr");
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal mengekstrak data");
      }

      const result = await res.json();
      setRawGeminiData(result);

      // Pastikan category yang didapat dari AI ada di daftar kita, jika tidak fallback ke Others
      const detectedCategory = CATEGORIES.find(c => c.id === result.category) 
        ? result.category 
        : "Others";

      setFormData({
        merchant_name: result.merchant_name || "",
        amount: result.total_amount ? String(result.total_amount) : "",
        date: result.date || new Date().toISOString().split("T")[0],
        category: detectedCategory,
      });

      setStatus("idle");
    } catch (e: any) {
      console.error("Scan Error:", e);
      setStatus("error");
      setError(e.message || "Gagal membaca struk. Pastikan gambar jelas.");
    }
  }

  async function saveReceipt() {
    if (!file || !formData.amount) return;
    setStatus("upload");
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("merchant_name", formData.merchant_name);
      fd.append("total_amount", formData.amount); 
      fd.append("date", formData.date);
      fd.append("category", formData.category);
      fd.append("ocr_data", JSON.stringify(rawGeminiData || {}));

      const res = await fetch("/api/receipts", { 
        method: "POST", 
        body: fd 
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal menyimpan ke database");
      }

      setStatus("done");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      console.error("Save Error:", e);
      setStatus("error");
      setError(e.message);
    }
    
  }

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-lime-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.back()} 
            className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            ← BACK
          </button>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Add Receipt</h1>
          <button 
            onClick={saveReceipt} 
            disabled={status !== "idle" || !formData.amount} 
            className="text-sm font-extrabold text-emerald-600 disabled:opacity-30 uppercase"
          >
            {status === "upload" ? "SAVING..." : "SAVE"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-100 p-4 text-sm text-red-800 border border-red-200 shadow-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Section Upload & Preview */}
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-3xl border-2 border-dashed border-emerald-200 bg-white flex items-center justify-center overflow-hidden shadow-sm relative">
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  Preview Struk
                </div>
              )}
              {file && (
                <div className="absolute bottom-4 right-4 bg-black/50 px-2 py-1 rounded text-[10px] text-white font-mono">
                  {formatBytes(file.size)}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Tombol Kamera */}
              <label className="group cursor-pointer rounded-2xl bg-white border border-slate-200 py-4 text-center text-[10px] font-black text-slate-700 hover:border-emerald-500 transition-all shadow-sm active:scale-95 flex flex-col items-center justify-center gap-2">
                <Camera size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="tracking-widest uppercase">Take Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>

              {/* Tombol Gallery */}
              <label className="group cursor-pointer rounded-2xl bg-white border border-slate-200 py-4 text-center text-[10px] font-black text-slate-700 hover:border-emerald-500 transition-all shadow-sm active:scale-95 flex flex-col items-center justify-center gap-2">
                <ImageIcon size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="tracking-widest uppercase">Gallery</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
            </div>

            {/* Tombol Scan AI yang lebar di bawahnya */}
            <button 
                onClick={runOCR} 
                disabled={!file || status !== "idle"} 
                className="w-full rounded-2xl bg-emerald-600 py-4 text-xs font-black text-white shadow-lg hover:bg-emerald-700 disabled:bg-slate-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {status === "ocr" ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span className="tracking-widest uppercase">Scanning...</span>
                  </>
                ) : (
                  <>
                    <Search size={18} className="animate-pulse" />
                    <span className="tracking-widest uppercase">Scan Image</span>
                  </>
                )}
            </button>
          </div>

          {/* Section Form Review */}
          <div className="flex flex-col rounded-3xl border border-emerald-100 bg-white/90 p-8 shadow-2xl backdrop-blur-md">
            <h2 className="mb-8 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-900 border-b pb-2 border-emerald-50">
              Data Review
            </h2>
            
            <div className="space-y-8">
              {/* Merchant Name */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Merchant</label>
                <input 
                  type="text" 
                  value={formData.merchant_name} 
                  onChange={e => setFormData({...formData, merchant_name: e.target.value})} 
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all" 
                  placeholder="Nama Toko"
                />
              </div>

              {/* Total Amount */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Amount (Rp)</label>
                <input 
                  type="number" 
                  value={formData.amount} 
                  onChange={e => setFormData({...formData, amount: e.target.value})} 
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-xl font-black text-emerald-700 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all" 
                  placeholder="0"
                />
              </div>

              {/* Date */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Date</label>
                <input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all" 
                />
              </div>

              {/* Category */}
              <div className="relative">
                <label className="absolute -top-2.5 left-3 bg-white px-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Category</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                  className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none transition-all cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>

            <button 
              onClick={saveReceipt} 
              disabled={status !== "idle" || !formData.amount} 
              className="mt-12 w-full rounded-2xl bg-slate-900 py-5 text-xs font-black tracking-widest text-white shadow-xl hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:bg-slate-200 uppercase"
            >
              {status === "upload" ? "Saving..." : "Confirm & Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}