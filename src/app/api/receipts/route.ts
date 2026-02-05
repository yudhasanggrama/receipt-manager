import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeAmount(amountStr: string | null): number {
    if (!amountStr) return 0;
    let clean = amountStr.replace(/[^0-9.,]/g, "");
    if (/(,|\.)\d{3}$/.test(clean)) {
        clean = clean.replace(/[.,]/g, "");
    } else {
        clean = clean.replace(",", ".");
    }
    const result = parseFloat(clean);
    return isNaN(result) ? 0 : result;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rawAmount = formData.get("total_amount") as string;
    
    const normalizedAmount = normalizeAmount(rawAmount);

    const merchantName = formData.get("merchant_name") as string;
    const date = formData.get("date") as string;
    const category = formData.get("category") as string;
    const notes = formData.get("notes") as string;
    const ocrDataRaw = formData.get("ocr_data") as string;

    let parsedOcr = {};
    try { parsedOcr = ocrDataRaw ? JSON.parse(ocrDataRaw) : {}; } catch (e) { parsedOcr = {}; }

    if (!file) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const path = `${user.id}/${crypto.randomUUID()}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
    if (upErr) throw upErr;

    const { data: url } = supabase.storage.from("receipts").getPublicUrl(path);

    const { data, error: dbErr } = await supabase.from("receipts").insert({
      user_id: user.id,
      image_url: url.publicUrl,
      merchant_name: merchantName || "Unknown",
      total_amount: normalizedAmount,
      date: date || new Date().toISOString(),
      category: category || "Others",
      notes: notes || "",
      ocr_data: parsedOcr,
    }).select().single();

    if (dbErr) throw dbErr;
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const search = searchParams.get("q");
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "date_desc";
  const finalStart = searchParams.get("startDate") || searchParams.get("start"); 
  const finalEnd = searchParams.get("endDate") || searchParams.get("end");
  
  const minAmount = searchParams.get("minAmount");
  const maxAmount = searchParams.get("maxAmount");
  const monthParam = searchParams.get("month"); 
  
  let query = supabase
    .from("receipts")
    .select("*", { count: 'exact' })
    .eq("user_id", user.id); 

  // --- FILTER TANGGAL ---
  if (finalStart && finalEnd) {
    const startISO = `${finalStart.split('T')[0]}T00:00:00.000Z`;
    const endISO = `${finalEnd.split('T')[0]}T23:59:59.999Z`;
    query = query.gte("date", startISO).lte("date", endISO);
  } else if (monthParam) {
    const startDateMonth = `${monthParam}-01T00:00:00.000Z`;
    const [year, month] = monthParam.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const endDateMonth = `${monthParam}-${lastDay}T23:59:59.999Z`;
    query = query.gte("date", startDateMonth).lte("date", endDateMonth);
  }

  // --- FILTER HARGA ---
  if (minAmount && minAmount !== "") {
    query = query.gte("total_amount", parseFloat(minAmount));
  }
  if (maxAmount && maxAmount !== "") {
    query = query.lte("total_amount", parseFloat(maxAmount));
  }

  // --- LOGIKA SORTING ---
  switch (sort) {
    case "date_asc": query = query.order("date", { ascending: true }); break;
    case "amount_desc": query = query.order("total_amount", { ascending: false }); break;
    case "amount_asc": query = query.order("total_amount", { ascending: true }); break;
    default: query = query.order("date", { ascending: false }); break;
  }

  // --- SEARCH ---
  if (search) {
    query = query.or(`merchant_name.ilike.%${search}%,notes.ilike.%${search}%`);
  }

  // --- CATEGORY ---
  if (category) {
    query = query.in("category", category.split(","));
  }

  // --- PAGINATION ---
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    totalCount: count,
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page
  });
}