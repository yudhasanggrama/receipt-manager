import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const merchantName = formData.get("merchant_name") as string;
    const date = formData.get("date") as string;
    const totalAmount = formData.get("total_amount") as string;
    const ocrDataRaw = formData.get("ocr_data") as string; // Ambil string mentah

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // 1. Upload Image ke Supabase Storage
    const objectPath = `${userData.user.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage
      .from("receipts")
      .upload(objectPath, file);

    if (uploadErr) throw uploadErr;

    const { data: publicUrl } = supabase.storage.from("receipts").getPublicUrl(objectPath);

    // 2. Parsing OCR Data dengan Aman
    let parsedOcr = {};
    try {
      parsedOcr = ocrDataRaw ? JSON.parse(ocrDataRaw) : {};
    } catch (e) {
      console.error("Gagal parse OCR data, menyimpan sebagai objek kosong");
      parsedOcr = {};
    }

    // 3. Simpan Data ke Tabel Receipts
    const { data: receipt, error: dbErr } = await supabase
      .from("receipts")
      .insert({
        user_id: userData.user.id,
        image_url: publicUrl.publicUrl,
        merchant_name: merchantName || "Unknown",
        date: date || new Date().toISOString().split('T')[0],
        // Pastikan total_amount berupa angka murni (float)
        total_amount: totalAmount ? parseFloat(totalAmount.replace(/[^0-9.]/g, '')) : 0,
        ocr_data: parsedOcr,
        status: "draft"
      })
      .select()
      .single();

    if (dbErr) throw dbErr;

    return NextResponse.json({ ok: true, data: receipt });
  } catch (e: any) {
    console.error("Database Save Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}