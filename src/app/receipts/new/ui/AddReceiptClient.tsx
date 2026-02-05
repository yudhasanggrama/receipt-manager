"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Camera, ImageIcon, ChevronLeft, Loader2, X, RefreshCw,
  Utensils, Car, ShoppingBag, HeartPulse, Film, FileText, ShoppingCart, Box,
  ChevronDown, LayoutDashboard, Receipt, PieChart as PieIcon, LogOut, Plus
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/app/components/sidebar/SidebarClient";
import { toast } from "sonner";
import { createWorker, type Worker } from "tesseract.js";

const CATEGORIES = [
  { id: "Food", label: "Food", icon: <Utensils size={14} />, color: "bg-orange-100 text-orange-600" },
  { id: "Transport", label: "Transport", icon: <Car size={14} />, color: "bg-blue-100 text-blue-600" },
  { id: "Shopping", label: "Shopping", icon: <ShoppingBag size={14} />, color: "bg-pink-100 text-pink-600" },
  { id: "Health", label: "Health", icon: <HeartPulse size={14} />, color: "bg-red-100 text-red-600" },
  { id: "Entertainment", label: "Entertainment", icon: <Film size={14} />, color: "bg-purple-100 text-purple-600" },
  { id: "Bills", label: "Bills", icon: <FileText size={14} />, color: "bg-yellow-100 text-yellow-600" },
  { id: "Groceries", label: "Groceries", icon: <ShoppingCart size={14} />, color: "bg-emerald-100 text-emerald-600" },
  { id: "Others", label: "Others", icon: <Box size={14} />, color: "bg-slate-100 text-slate-600" },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

function computeAvgConfidence(words: any[]): number {
  const valid = (words ?? []).filter((w) => typeof w?.confidence === "number");
  if (!valid.length) return 0;
  const sum = valid.reduce((s, w) => s + (w.confidence ?? 0), 0);
  return sum / valid.length; // 0..100
}

export default function AddReceiptClient() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const [status, setStatus] = useState<"idle" | "ocr" | "upload" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // hasil gabungan OCR + AI (buat disimpan ke DB)
  const [rawGeminiData, setRawGeminiData] = useState<any>(null);
  const [isCatOpen, setIsCatOpen] = useState(false);

  const [formData, setFormData] = useState<{
    merchant_name: string;
    amount: string;
    date: string;
    category: CategoryId;
    notes: string;
  }>({
    merchant_name: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "Others",
    notes: "",
  });

  const activeCategory = CATEGORIES.find((c) => c.id === formData.category) ?? CATEGORIES[7];
  const workerRef = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // Logger optional (buat debug progress)
        // const worker = await createWorker("eng", 1, { logger: (m) => console.log(m) });

        const worker = await createWorker("eng");
        if (!alive) {
          await worker.terminate();
          return;
        }

        // Optional parameter yang aman (nggak bikin “kacau”)
        await worker.setParameters({
          preserve_interword_spaces: "1",
          // tessedit_pageseg_mode: "6", // kalau mau coba, tapi default dulu biar stabil
        });

        workerRef.current = worker;
        workerReadyRef.current = true;
      } catch (e) {
        console.error(e);
        workerReadyRef.current = false;
      }
    })();

    return () => {
      alive = false;
      workerReadyRef.current = false;
      // terminate worker
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // --- CAMERA ---
  async function startCamera() {
    setIsCameraActive(true);
    setPreview(null);
    setFile(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Failed to access the camera.");
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext("2d")?.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `receipt_${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(capturedFile);
      setPreview(URL.createObjectURL(capturedFile));
      stopCamera();
      setError(null);
    }, "image/jpeg", 0.9);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    stopCamera();
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function upscaleForOcr(file: File): Promise<File> {
  const img = new Image();
  const url = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  // target width: 1600 px (cukup buat font struk)
  const targetW = Math.min(2000, Math.max(1600, img.width));
  const scale = targetW / img.width;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context error");

  // no filter dulu biar ga “kacau”
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.95);
  });

  return new File([blob], file.name, { type: "image/jpeg" });
}

  // --- OCR (Tesseract) -> AI extract (text) ---
  async function runOCR() {
  if (!file) return;
  setStatus("ocr");
  setError(null);

  try {
    const worker = workerRef.current;
    if (!worker) throw new Error("Worker belum siap");

    // optional resize biar OCR lebih stabil
    const input = await upscaleForOcr(file);

    // 1) OCR
    const ocr = await worker.recognize(input);
    const ocrText = String(ocr.data?.text ?? "");
    const confidence = typeof ocr.data?.confidence === "number" ? ocr.data.confidence : 0;

    if (!ocrText.trim()) throw new Error("OCR kosong");

    // 2) coba extract dari OCR text (utama)
    let ai: any = null;
    let usedFallback = false;

    try {
      const shouldFallbackEarly = confidence < 50;

      if (!shouldFallbackEarly) {
        const resText = await fetch("/api/extract-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ocrText }),
        });

        if (!resText.ok) {
          throw new Error("extract-text failed");
        }

        ai = await resText.json();

        const totalOk =
          typeof ai?.total_amount === "number" && ai.total_amount > 0;
        if (!totalOk) throw new Error("AI text total invalid");
      } else {
        throw new Error("OCR confidence too low, fallback");
      }
    } catch {
      usedFallback = true;

      const fd = new FormData();
      fd.append("file", file);

      const resImg = await fetch("/api/extract", {
        method: "POST",
        body: fd,
      });

      if (!resImg.ok) {
        const err = await resImg.json().catch(() => ({}));
        throw new Error(err?.error || "Fallback image extract failed");
      }

      ai = await resImg.json();
    }
    setRawGeminiData({
      ...ai,
      ocrText,     
      confidence,
      meta: {
        ...(ai?.meta || {}),
        usedFallback,
      },
    });

    setFormData((prev) => ({
      ...prev,
      merchant_name: ai?.merchant_name ?? "",
      amount: ai?.total_amount ? String(ai.total_amount) : "",
      date: ai?.date ?? new Date().toISOString().split("T")[0],
      category: ai?.category ?? "Others",
    }));

    if (usedFallback) {
      toast.success("Sukses: OCR → AI extract!");
    }

    setStatus("idle");
  } catch (e: any) {
    setError(e?.message || "Unknown error");
    setStatus("error");
  }
}



  async function saveReceipt() {
    if (!file || !formData.amount) {
      toast.error("Please complete the nominal receipt.");
      return;
    }

    setStatus("upload");

    const savingPromise = new Promise(async (resolve, reject) => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("merchant_name", formData.merchant_name);
        fd.append("total_amount", formData.amount);
        fd.append("date", formData.date);
        fd.append("category", formData.category);
        fd.append("notes", formData.notes);

        // ocr_data berisi OCR+AI bundle
        fd.append("ocr_data", JSON.stringify(rawGeminiData || {}));

        const res = await fetch("/api/receipts", { method: "POST", body: fd });
        if (!res.ok) throw new Error("Failed to save in database");

        router.push("/dashboard");
        router.refresh();
        resolve(true);
      } catch (e: any) {
        setStatus("error");
        setError(e.message);
        reject(e);
      }
    });

    toast.promise(savingPromise, {
      loading: "Saving receipt data...",
      success: "Successfully saved, Now going back to dashboard!",
      error: (err) => `Failed to save: ${err.message}`,
    });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* BACKGROUND DECOR */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #16a34a 1px, transparent 1px), linear-gradient(to bottom, #16a34a 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <Sidebar handleLogout={handleLogout} />

      <div className="flex-1 pb-24 lg:pb-10 lg:ml-60 relative z-10">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 px-6 py-3 backdrop-blur-md">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <ChevronLeft size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">
                Back
              </span>
            </button>

            <h1 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase flex items-center gap-2 me-auto ms-auto">
              <Plus size={14} className="text-emerald-500" /> New Receipt
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-5xl p-6">
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            {/* LEFT */}
            <div className="space-y-4">
              <div className="aspect-4/3 sm:aspect-square rounded-[2.5rem] bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm relative">
                {isCameraActive ? (
                  <div className="relative h-full w-full bg-black">
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6">
                      <button
                        onClick={stopCamera}
                        className="p-3 rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30"
                      >
                        <X size={18} />
                      </button>
                      <button
                        onClick={capturePhoto}
                        className="h-16 w-16 rounded-full border-4 border-white bg-emerald-500 shadow-xl"
                      />
                      <div className="w-10" />
                    </div>
                  </div>
                ) : preview ? (
                  <img src={preview} alt="Preview" className="h-full w-full object-contain p-6" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-300">
                    <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                      <Camera size={32} strokeWidth={1.5} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      No Receipt Selected
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={startCamera}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                >
                  <Camera size={16} className="text-slate-400 group-hover:text-emerald-600" />
                  <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-slate-600">
                    Camera
                  </span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                >
                  <ImageIcon size={16} className="text-slate-400 group-hover:text-emerald-600" />
                  <span className="text-[9px] font-black uppercase text-slate-400 group-hover:text-slate-600">
                    Gallery
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </button>
              </div>

              <button
                onClick={runOCR}
                disabled={!file || status !== "idle" || isCameraActive}
                className="w-full py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-600 disabled:opacity-20 transition-all shadow-xl shadow-slate-200"
              >
                {status === "ocr" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Scan (OCR → AI)
              </button>

              {error && (
                <div className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl p-3">
                  {error}
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-200 space-y-6">
              <FormGroup label="Merchant Name">
                <input
                  type="text"
                  value={formData.merchant_name}
                  onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 ring-emerald-500/10 outline-none transition-all"
                  placeholder="Where did you spend?"
                />
              </FormGroup>

              <FormGroup label="Amount (IDR)">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-500">
                    Rp
                  </span>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 pl-10 pr-4 py-4 text-xl font-black text-slate-900 focus:bg-white focus:ring-2 ring-emerald-500/10 outline-none transition-all"
                    placeholder="0"
                  />
                </div>
              </FormGroup>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup label="Transaction Date">
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-[10px] font-bold text-slate-700 outline-none focus:bg-white transition-all"
                  />
                </FormGroup>

                <FormGroup label="Category">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCatOpen(!isCatOpen)}
                      className="w-full flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3.5 text-[10px] font-bold text-slate-700 hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className={`p-1 rounded ${activeCategory.color}`}>{activeCategory.icon}</div>
                        <span className="truncate">{activeCategory.label}</span>
                      </div>
                      <ChevronDown size={12} className={`transition-transform ${isCatOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isCatOpen && (
                      <div className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl max-h-56 overflow-y-auto scrollbar-hide animate-in fade-in zoom-in duration-200">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, category: cat.id });
                              setIsCatOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                          >
                            <div className={`p-1.5 rounded-lg ${cat.color}`}>{cat.icon}</div>
                            <span className="font-bold text-[9px] uppercase tracking-wider text-slate-600">
                              {cat.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </FormGroup>
              </div>

              <FormGroup label="Additional Notes">
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-800 outline-none min-h-25 resize-none focus:bg-white transition-all"
                  placeholder="Optional details..."
                />
              </FormGroup>

              <button
                onClick={saveReceipt}
                disabled={status !== "idle" || !formData.amount}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-30"
              >
                {status === "upload" ? "Processing..." : "Confirm & Save"}
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* MOBILE NAV */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-50 flex items-center justify-around px-4">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center gap-1 transition-all ${pathname === "/dashboard" ? "text-emerald-600 scale-110" : "text-slate-400"}`}
        >
          <LayoutDashboard size={20} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
        </Link>

        <Link
          href="/receipts"
          className={`flex flex-col items-center gap-1 transition-all ${pathname === "/receipts" ? "text-emerald-600 scale-110" : "text-slate-400"}`}
        >
          <Receipt size={20} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Bills</span>
        </Link>

        <Link
          href="/receipts/new"
          className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 -translate-y-5 border-[6px] border-[#F8FAFC]"
        >
          <Plus size={24} />
        </Link>

        <Link
          href="/insights"
          className={`flex flex-col items-center gap-1 transition-all ${pathname === "/insights" ? "text-emerald-600 scale-110" : "text-slate-400"}`}
        >
          <PieIcon size={20} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Stats</span>
        </Link>

        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400">
          <LogOut size={20} />
          <span className="text-[9px] font-black uppercase tracking-tighter">Exit</span>
        </button>
      </nav>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1 italic">
        {label}
      </label>
      {children}
    </div>
  );
}
