import EditReceiptClient from "./EditReceiptClient";

export default async function Page({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // Wajib di-await di Next.js 15/16
  const resolvedParams = await params;
  const id = resolvedParams.id;

  return (
    <main>
      <EditReceiptClient id={id} />
    </main>
  );
}