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
  
  // 1. Parameter Pagination
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // 2. Parameter Filter
  const search = searchParams.get("q");
  const category = searchParams.get("category");
  const month = searchParams.get("month"); // Untuk Dashboard

  // 3. Inisialisasi Query
  let query = supabase
    .from("receipts")
    .select("*", { count: 'exact' }) 
    .order("date", { ascending: false });

  // 4. Logika Search (Merchant & Notes)
  if (search) {
    query = query.or(`merchant_name.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  // 5. Logika Kategori (Multi-select)
  if (category) {
    query = query.in("category", category.split(","));
  }

  // 6. Logika Filter Bulan (Penyebab data Januari tidak muncul tadi)
  if (month) {
    const startDate = `${month}-01T00:00:00Z`;
    const [year, m] = month.split("-").map(Number);
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${month}-${lastDay}T23:59:59Z`;

    query = query.gte("date", startDate).lte("date", endDate);
  }

  // 7. Terapkan Pagination (Range ditaruh paling bawah setelah filter)
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 8. Return Response yang Konsisten
  return NextResponse.json({
    data,
    totalCount: count,
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page
  });
}