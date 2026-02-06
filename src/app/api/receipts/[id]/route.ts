import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Definisikan tipe params sebagai Promise
type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const body = await req.json();

  const { id } = await params; 

  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("receipts")
    .update({
      merchant_name: body.merchant_name,
      total_amount: body.total_amount,
      date: body.date,
      category: body.category,
      notes: body.notes
    })
    .eq("id", id)
    .eq("user_id", user?.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = await params;
  
  const { data: { user } } = await supabase.auth.getUser();

  // Ambil data struk untuk hapus gambar di storage
  const { data: receipt } = await supabase
    .from("receipts")
    .select("image_url")
    .eq("id", id)
    .single();

  if (receipt?.image_url) {
    const fileName = receipt.image_url.split('/').pop();
    if (fileName) await supabase.storage.from("receipts").remove([fileName]);
  }

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id)
    .eq("user_id", user?.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id } = await params;

   // Di dalam export async function GET...
    const { data: { user } } = await supabase.auth.getUser(); // Ambil user aktif

    const { data, error } = await supabase
      .from("receipts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user?.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Data not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}