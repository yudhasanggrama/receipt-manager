"use client";

import { useEffect, useState } from "react";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface DeleteActionProps {
  onDelete: () => Promise<void>;
  itemLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function DeleteAction({ onDelete, itemLabel = "item", className = "", children }: DeleteActionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const mainContent = document.getElementById("main-layout-wrapper");
    
    if (isOpen) {
      mainContent?.classList.add("transition-all", "duration-300", "blur-md", "brightness-90", "pointer-events-none");
    } else {
      mainContent?.classList.remove("blur-md", "brightness-90", "pointer-events-none");
    }

    return () => {
      mainContent?.classList.remove("blur-md", "brightness-90", "pointer-events-none");
    };
  }, [isOpen]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setIsOpen(false);
      
      toast.success("Success Delete receipt", {
        description: `${itemLabel} has been permanently deleted.`,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete receipt", {
        description: `An error occurred while trying to delete ${itemLabel}.`,
      });
    } finally {
      setIsDeleting(false);
    }

    
  };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {children}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-slate-900/20 animate-in fade-in duration-200 backdrop-blur-[2px]">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100 relative z-10000">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6">
              <AlertTriangle size={28} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Delete receipts?</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Data <span className="font-bold text-slate-800">{itemLabel}</span> will be deleted permanently from system and storage.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex-1 px-4 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200 disabled:bg-red-400"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}