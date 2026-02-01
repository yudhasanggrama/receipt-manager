import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const merchantName = formData.get("merchant_name") as string;
    const date = formData.get("date") as string;
    const totalAmount = formData.get("total_amount") as string;
    const category = formData.get("category") as string;
    const notes = formData.get("notes") as string;
    const ocrDataRaw = formData.get("ocr_data") as string;

    // Parsing OCR data secara aman
    let parsedOcr = {};
    try { parsedOcr = ocrDataRaw ? JSON.parse(ocrDataRaw) : {}; } catch (e) { parsedOcr = {}; }

    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    // 1. Upload ke Storage
    const path = `${user.id}/${crypto.randomUUID()}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
    if (upErr) throw upErr;

    const { data: url } = supabase.storage.from("receipts").getPublicUrl(path);

    // 2. Simpan ke Database (Epic 3: Categorization)
    const { data, error: dbErr } = await supabase.from("receipts").insert({
      user_id: user.id,
      image_url: url.publicUrl,
      merchant_name: merchantName || "Unknown",
      total_amount: parseFloat(totalAmount) || 0,
      date: date || new Date().toISOString(),
      category: category || "Others", // US-07
      notes: notes || "",
      ocr_data: parsedOcr,
    }).select().single();

    if (dbErr) throw dbErr;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// US-08 & US-10: GET dengan Filter & Search
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supabase = await createClient();
  
  const search = searchParams.get("q");
  const category = searchParams.get("category"); // Bisa multi-select dipisah koma
  const month = searchParams.get("month"); // Format YYYY-MM

  let query = supabase.from("receipts").select("*").order("date", { ascending: false });

  if (search) query = query.or(`merchant_name.ilike.%${search}%,notes.ilike.%${search}%`);
  if (category) query = query.in("category", category.split(","));
  if (month) {
    query = query.gte("date", `${month}-01`).lte("date", `${month}-31`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}