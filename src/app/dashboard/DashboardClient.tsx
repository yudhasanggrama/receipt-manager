"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Plus, LayoutDashboard, Receipt, 
  PieChart as PieIcon, Download, LogOut, User, ChevronRight, ChevronLeft, Calendar,
  Utensils, Car, ShoppingBag, HeartPulse, Film, FileText, ShoppingCart, Box,
  X, FileSpreadsheet, File as FilePdf, Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "../components/sidebar/SidebarClient";
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { saveAs } from 'file-saver';
import { toast } from "sonner";

// Import Flatpickr
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr";
import monthSelectPlugin from "flatpickr/dist/plugins/monthSelect/index";
import "flatpickr/dist/plugins/monthSelect";

type Props = { 
  email: string; 
  username?: string 
};

const CATEGORIES = [
  { id: "Food", label: "Food & Drink", icon: <Utensils size={14} />, color: "bg-orange-100 text-orange-600", hex: "#F59E0B" },
  { id: "Transport", label: "Transport", icon: <Car size={14} />, color: "bg-blue-100 text-blue-600", hex: "#3B82F6" },
  { id: "Shopping", label: "Shop", icon: <ShoppingBag size={14} />, color: "bg-pink-100 text-pink-600", hex: "#8B5CF6" },
  { id: "Health", label: "Health", icon: <HeartPulse size={14} />, color: "bg-red-100 text-red-600", hex: "#EF4444" },
  { id: "Entertainment", label: "Ent", icon: <Film size={14} />, color: "bg-purple-100 text-purple-600", hex: "#EC4899" },
  { id: "Bills", label: "Bills", icon: <FileText size={14} />, color: "bg-yellow-100 text-yellow-600", hex: "#6B7280" },
  { id: "Groceries", label: "Grocer", icon: <ShoppingCart size={14} />, color: "bg-emerald-100 text-emerald-600", hex: "#10B981" },
  { id: "Others", label: "Other", icon: <Box size={14} />, color: "bg-slate-100 text-slate-600", hex: "#64748B" },
];

export default function DashboardClient({ email, username }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const calendarRef = useRef<HTMLDivElement>(null);
  
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); 
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const displayUsername = username || email.split('@')[0];

  const drawPieSlice = (
    doc: jsPDF, 
    x: number, 
    y: number, 
    radius: number, 
    startAngle: number, 
    endAngle: number, 
    color: { r: number, g: number, b: number }
  ) => {
    doc.setFillColor(color.r, color.g, color.b);
    const startDeg = (startAngle * 180) / Math.PI;
    const endDeg = (endAngle * 180) / Math.PI;
    const p = doc as any;
    if (typeof p.pie === 'function') {
      p.pie(x, y, radius, startDeg, endDeg, 'F');
    } else {
      const ctx = p.context2d;
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, startAngle, endAngle, false);
      ctx.closePath();
      ctx.fill();
    }
  };

  useEffect(() => {
    if (calendarRef.current) {
      flatpickr(calendarRef.current, {
        onOpen: (selectedDates, dateStr, instance) => {
          instance.calendarContainer.classList.add("dashboard-month-picker");
        },
        disableMobile: true,
        plugins: [
          new (monthSelectPlugin as any)({
            shorthand: true,
            dateFormat: "Y-m",
            altFormat: "F Y",
          })
        ],
        defaultDate: selectedMonth,
        onChange: (selectedDates, dateStr) => {
          setSelectedMonth(dateStr);
        },
      });
    }
  }, []);

  useEffect(() => {
    const fetchFiltered = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedCats.length > 0) params.append("category", selectedCats.join(","));
        if (selectedMonth) params.append("month", selectedMonth);
        
        const res = await fetch(`/api/receipts?${params.toString()}`);
        const result = await res.json();
        setReceipts(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    };
    fetchFiltered();
  }, [selectedCats, selectedMonth]);

  const stats = useMemo(() => {
    const total = receipts.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    
    const byCat = CATEGORIES.map(cat => {
      const amount = receipts.filter(r => {
        const dbCat = (r.category || "").toLowerCase().trim();
        const targetId = cat.id.toLowerCase().trim();
        const targetLabel = cat.label.toLowerCase().trim();
        return dbCat.includes(targetId) || targetId.includes(dbCat) || dbCat === targetLabel;
      }).reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

      const percentage = total > 0 ? (amount / total) * 100 : 0;
      return { ...cat, amount, percentage };
    })
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);

    return { total, byCat };
  }, [receipts]);

  const pieGradient = useMemo(() => {
    let acc = 0;
    const parts = stats.byCat.map(c => {
      const start = acc;
      acc += c.percentage;
      return `${c.hex} ${start}% ${acc}%`;
    });
    return parts.length > 0 ? `conic-gradient(${parts.join(', ')})` : `conic-gradient(#f1f5f9 0% 100%)`;
  }, [stats.byCat]);
  

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (receipts.length === 0) return toast.error("Data Not Found For This Month!");
    
    setIsExporting(true);
    const loadingToast = toast.loading(`Preparing file ${format.toUpperCase()}...`);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (format === 'excel') {
        const workbook = new ExcelJS.Workbook();
        const sheet1 = workbook.addWorksheet('Receipts');
        sheet1.columns = [
          { header: 'Tanggal', key: 'date', width: 15 },
          { header: 'Merchant', key: 'merchant', width: 30 },
          { header: 'Kategori', key: 'category', width: 20 },
          { header: 'Jumlah', key: 'amount', width: 15 },
          { header: 'Notes', key: 'notes', width: 25 }
        ];

        receipts.forEach(r => {
          const row = sheet1.addRow({
            date: new Date(r.date).toLocaleDateString('id-ID'),
            merchant: r.merchant_name,
            category: r.category,
            amount: Number(r.total_amount),
            notes: r.notes || "-"
          });
          row.getCell('amount').numFmt = '"Rp"#,##0';
        });

        sheet1.autoFilter = 'A1:E1';

        const sheet2 = workbook.addWorksheet('Summary');
        sheet2.addRow(['RINGKASAN PENGELUARAN']);
        sheet2.addRow([`Periode: ${selectedMonth}`]);
        sheet2.addRow([]);
        sheet2.addRow(['Kategori', 'Total']);
        
        stats.byCat.forEach(c => {
          const row = sheet2.addRow([c.label, c.amount]);
          row.getCell(2).numFmt = '"Rp"#,##0';
        });
        
        sheet2.addRow([]);
        const totalRow = sheet2.addRow(['TOTAL SPENT', stats.total]);
        totalRow.font = { bold: true, size: 12 };
        totalRow.getCell(2).numFmt = '"Rp"#,##0';

        const buffer = await workbook.xlsx.writeBuffer();
        saveAs(new Blob([buffer]), `Report_${selectedMonth}.xlsx`);

      } else {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.setTextColor(5, 150, 105); 
        doc.text("SPENDING REPORT", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Periode: ${new Date(selectedMonth + "-01").toLocaleString('id-ID', {month: 'long', year: 'numeric'})}`, 14, 30);
        
        doc.setFillColor(248, 250, 252); 
        doc.rect(14, 35, 182, 22, 'F');
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text("TOTAL PENGELUARAN", 20, 43);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`Rp ${stats.total.toLocaleString('id-ID')}`, 20, 52);

        // --- PIE CHART ---
        const centerX = 50;
        const centerY = 100;
        const radius = 25;
        let currentAngle = -Math.PI / 2;

        stats.byCat.forEach((c) => {
          const sliceAngle = (c.percentage / 100) * (Math.PI * 2);
          const r = parseInt(c.hex.slice(1, 3), 16);
          const g = parseInt(c.hex.slice(3, 5), 16);
          const b = parseInt(c.hex.slice(5, 7), 16);

          drawPieSlice(doc, centerX, centerY, radius, currentAngle, currentAngle + sliceAngle, { r, g, b });
          currentAngle += sliceAngle;
        });

        doc.setFillColor(255, 255, 255);
        doc.circle(centerX, centerY, 13, 'F'); 

        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont("helvetica", "bold");
        doc.text(`${stats.byCat.length}`, centerX, centerY - 1, { align: "center" });
        doc.setFontSize(6);
        doc.text("KATEGORI", centerX, centerY + 3, { align: "center" });

        // Legend
        const startYLegend = 80;
        stats.byCat.forEach((c, i) => {
          const itemY = startYLegend + (i * 8);
          const r = parseInt(c.hex.slice(1, 3), 16);
          const g = parseInt(c.hex.slice(3, 5), 16);
          const b = parseInt(c.hex.slice(5, 7), 16);
          
          doc.setFillColor(r, g, b);
          doc.roundedRect(95, itemY - 3, 4, 4, 1, 1, 'F');
          
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(c.label, 102, itemY);
          
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100);
          doc.text(`${c.percentage.toFixed(1)}% - Rp ${c.amount.toLocaleString('id-ID')}`, 125, itemY);
        });

        autoTable(doc, {
          startY: 145,
          head: [['Tanggal', 'Merchant', 'Kategori', 'Jumlah']],
          body: receipts.map(r => [
            new Date(r.date).toLocaleDateString('id-ID'), 
            r.merchant_name, 
            r.category, 
            `Rp ${Number(r.total_amount).toLocaleString('id-ID')}`
          ]),
          headStyles: { fillColor: [5, 150, 105], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { top: 20 },
          theme: 'striped'
        });

        doc.save(`Report_${selectedMonth}.pdf`);
      }
      toast.success(`${format.toUpperCase()} Successfully downloaded!`, { id: loadingToast });
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export", { id: loadingToast });
    } finally {
      setIsExporting(false);
    }
  };

  const changeMonth = (offset: number) => {
    const date = new Date(selectedMonth + "-01");
    date.setMonth(date.getMonth() + offset);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] font-sans text-slate-900 overflow-x-hidden">
      
      {/* MODAL EXPORT */}
      {showExportModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !isExporting && setShowExportModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Choosing Format Report</h3>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid gap-3">
              <button 
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-emerald-50 hover:border-emerald-500 hover:bg-emerald-50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">Microsoft Excel</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium tracking-tighter">.xlsx Spreadsheet</p>
                </div>
              </button>

              <button 
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-50 hover:border-slate-900 hover:bg-slate-50 transition-all group disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <FilePdf size={24} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800">PDF Document</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium tracking-tighter">Format Laporan Resmi</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACKGROUND DECOR */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-emerald-300/40 blur-[100px]" />
        <div className="absolute top-1/2 -right-24 h-96 w-96 rounded-full bg-lime-300/40 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(to right, #16a34a 1px, transparent 1px), linear-gradient(to bottom, #16a34a 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <Sidebar handleLogout={handleLogout} />

      <main className="relative z-10 lg:ml-60 min-h-screen pb-24 lg:pb-8">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 px-4 py-3 backdrop-blur-md flex items-center justify-between">
          <h1 className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-slate-400">Overview</h1>
          
          <div className="flex items-center gap-2 sm:gap-3">
             <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-50 rounded-md transition-all text-slate-400"><ChevronLeft size={14}/></button>
                
                <div ref={calendarRef} className="relative flex items-center px-1 sm:px-2 min-w-17.5 sm:min-w-22.5 justify-center h-6 cursor-pointer hover:bg-slate-50 rounded-md transition-all">
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold text-slate-600 pointer-events-none">
                    <Calendar size={10}/> {new Date(selectedMonth + "-01").toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>

                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-50 rounded-md transition-all text-slate-400"><ChevronRight size={14}/></button>
             </div>
             <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase max-w-15 sm:max-w-none truncate">{displayUsername}</p>
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                  <User size={12} className="sm:hidden" />
                  <User size={14} className="hidden sm:block" />
                </div>
             </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
          <section className="relative overflow-hidden rounded-3xl bg-emerald-700 shadow-2xl shadow-emerald-900/20">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-600/30 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 h-40 w-40 rounded-full bg-lime-400/20 blur-2xl pointer-events-none" />
            <div className={`relative z-10 p-6 sm:p-8 ${loading ? 'opacity-50 blur-sm transition-all' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400 animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/80">Monthly Spending</p>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tighter text-white">
                    <span className="text-emerald-300 text-lg sm:text-2xl mr-1">Rp</span>
                    {stats.total.toLocaleString('id-ID')}
                  </h2>
                </div>
                <Link href="/receipts/new" className="flex items-center justify-center gap-2 px-5 py-3.5 bg-lime-400 hover:bg-lime-300 text-emerald-900 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all shadow-xl shadow-black/10 active:scale-95 group">
                  <Plus size={18} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                  Add Receipt
                </Link>
              </div>
              <div className="mt-8 flex overflow-x-auto pb-2 -mx-2 px-2 sm:mx-0 sm:px-0 sm:flex-wrap gap-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCats(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                    className={`shrink-0 px-3 py-2 rounded-xl text-[9px] font-extrabold uppercase transition-all flex items-center gap-1.5 border backdrop-blur-md ${selectedCats.includes(cat.id) ? "bg-white text-emerald-800 border-white shadow-[0_4px_12px_rgba(255,255,255,0.3)] scale-95" : "bg-emerald-800/40 text-emerald-100 border-emerald-500/30 hover:bg-emerald-600/50"}`}>
                    <span className={selectedCats.includes(cat.id) ? "text-emerald-600" : "opacity-70"}>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-2"><PieIcon size={12}/> Analysis</h3>
              <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-8 justify-around">
                <div className="relative shrink-0 w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center shadow-inner" style={{ background: pieGradient, aspectRatio: "1/1" }}>
                  <div className="absolute inset-8 bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-slate-400 text-center uppercase leading-tight">{stats.byCat.length} <br/> Cats</div>
                </div>
                <div className="w-full space-y-2.5">
                  {stats.byCat.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor: c.hex}} />
                        <span className="text-[10px] font-bold uppercase text-slate-500">{c.label}</span>
                      </div>
                      <p className="text-[10px] font-bold">Rp {c.amount.toLocaleString('id-ID')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Recent Activity</h3>
                <Link href="/receipts" className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase">View All</Link>
              </div>
              <div className="space-y-1">
                {receipts.length > 0 ? (
                  receipts.slice(0, 5).map(r => {
                    const catData = CATEGORIES.find(c => 
                      c.id.toLowerCase().includes(r.category?.toLowerCase()) || 
                      r.category?.toLowerCase().includes(c.label.toLowerCase())
                    ) || CATEGORIES[7];
                    return (
                      <Link href={`/receipts/edit/${r.id}`} key={r.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${catData.color}`}>{catData.icon}</div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-800 leading-tight truncate">{r.merchant_name}</p>
                            <p className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{new Date(r.date).toLocaleDateString('en-ID', { day: 'numeric', month: 'short' })}</p>
                          </div>
                        </div>
                        <p className="text-xs font-bold text-slate-700 shrink-0 ml-2">Rp {Number(r.total_amount).toLocaleString('id-ID')}</p>
                      </Link>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-dashed border-slate-100 rounded-xl">No Data</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/insights" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-200 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors"><PieIcon size={18} /></div>
                <span className="text-xs font-bold">Spending Insights</span>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </Link>
            
            <button 
              onClick={() => setShowExportModal(true)}
              className="bg-slate-900 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-800 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-9 h-9 bg-white/10 text-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  {isExporting ? <Loader2 size={18} className="animate-spin text-emerald-400" /> : <Download size={18} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-none">Export Report</p>
                  <p className="text-[8px] text-slate-400 uppercase mt-1">Excel & PDF Available</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </main>

      {/* MOBILE NAV */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-lg border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 flex items-center justify-around px-4 lg:hidden">
        <Link href="/dashboard" className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/dashboard' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
          <LayoutDashboard size={20} /><span className="text-[9px] font-bold uppercase tracking-tighter">Home</span>
        </Link>
        <Link href="/receipts" className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/receipts' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
          <Receipt size={20} /><span className="text-[9px] font-bold uppercase tracking-tighter">Bills</span>
        </Link>
        <Link href="/receipts/new" className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 -translate-y-5 border-[6px] border-[#F8FAFC]">
          <Plus size={24} />
        </Link>
        <Link href="/insights" className={`flex flex-col items-center gap-1 p-2 transition-all ${pathname === '/insights' ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}>
          <PieIcon size={20} /><span className="text-[9px] font-bold uppercase tracking-tighter">Stats</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500 transition-colors">
          <LogOut size={20} /><span className="text-[9px] font-bold uppercase tracking-tighter">Logout</span>
        </button>
      </nav>
    </div>
  );
}