import { Suspense } from "react";
import EditReceiptClient from "./EditReceiptClient";

export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-[#fcfcfc]">
      <Suspense fallback={
        <div className="h-screen flex items-center justify-center">
          <div className="animate-pulse text-xs font-bold text-slate-400 uppercase">
            Initializing...
          </div>
        </div>
      }>
        <EditReceiptClient id={id} />
      </Suspense>
    </main>
  );
}