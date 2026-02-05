// src/app/api/extract-text/route.ts
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const CategoryEnum = z.enum([
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Entertainment",
  "Bills",
  "Groceries",
  "Others",
]);

const ReceiptSchema = z.object({
  merchant_name: z.string(),
  date: z.string().describe("Format YYYY-MM-DD"),
  total_amount: z.number(),
  category: CategoryEnum,
  line_items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
      })
    )
    .default([]),
});

// --- helpers ---
function normalizeIndoNumber(raw: string): number {
  let s = String(raw || "").trim();
  if (!s) return 0;

  s = s.replace(/[^0-9.,]/g, "");
  if (!s) return 0;

  if (/(,|\.)\d{3}$/.test(s)) {
    s = s.replace(/[.,]/g, "");
  } else {
    s = s.replace(",", ".");
  }

  let val = Number.parseFloat(s);
  if (!Number.isFinite(val)) return 0;

  if (val < 1000 && /\d+\.\d$/.test(s)) {
    val = Math.round(val * 1000);
  }

  return Math.round(val);
}

function extractTotalCandidates(ocrText: string): number[] {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidates: number[] = [];

  const TOTAL_KEY = /(TOTAL|GRAND\s*TOTAL|TOTAL\s*BAYAR|JUMLAH\s*BAYAR)/i;
  const BAD_KEY = /(PPN|PAJAK|TAX|HEMAT|DISKON|KEMBALI|CHANGE|TUNAI|CASH|SUBTOTAL)/i;

  for (const line of lines) {
    if (!TOTAL_KEY.test(line)) continue;
    if (BAD_KEY.test(line)) continue;

    const nums = line.match(/[\d][\d.,]*/g) ?? [];
    for (const n of nums) {
      const val = normalizeIndoNumber(n);
      if (val >= 1000 && val < 100_000_000) {
        candidates.push(val);
      }
    }
  }

  // fallback: cari TOTAL paling bawah
  if (!candidates.length) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (/TOTAL/i.test(line) && !BAD_KEY.test(line)) {
        const nums = line.match(/[\d][\d.,]*/g) ?? [];
        for (const n of nums) {
          const val = normalizeIndoNumber(n);
          if (val >= 1000) candidates.push(val);
        }
        if (candidates.length) break;
      }
    }
  }

  // fallback terakhir → angka terbesar yang masuk akal
  if (!candidates.length) {
    const nums = ocrText.match(/[\d][\d.,]*/g) ?? [];
    for (const n of nums) {
      const val = normalizeIndoNumber(n);
      if (val >= 1000 && val < 5_000_000) candidates.push(val);
    }
  }

  const unique = Array.from(new Set(candidates));
  unique.sort((a, b) => b - a);
  return unique;
}


function repairTotal(aiTotal: number, candidates: number[]) {
  if (!candidates.length) return aiTotal;

  // kalau AI absurd → pakai kandidat terbesar
  if (!aiTotal || aiTotal < 1000) return candidates[0];

  // cari paling dekat
  let best = candidates[0];
  for (const c of candidates) {
    if (Math.abs(c - aiTotal) < Math.abs(best - aiTotal)) {
      best = c;
    }
  }

  // kalau beda terlalu jauh → percaya rule
  if (Math.abs(best - aiTotal) > best * 0.5) {
    return best;
  }

  return best;
}

function reconstructTotal(ocrText: string): number | null {
  const lines = ocrText.split(/\r?\n/).map(l => l.trim().toUpperCase());

  let subtotal: number | null = null;
  let discount: number | null = null;

  for (const line of lines) {
    if (/HARGA JUAL|SUBTOTAL/.test(line)) {
      const m = line.match(/([\d.,]+)/);
      if (m) subtotal = normalizeIndoNumber(m[1]);
    }

    if (/HEMAT|DISKON|VC|VOUCHER/.test(line)) {
      const m = line.match(/([\d.,]+)/);
      if (m) discount = normalizeIndoNumber(m[1]);
    }
  }

  if (subtotal && discount) {
    const calc = subtotal - discount;
    if (calc > 0) return calc;
  }

  return null;
}


function normalizeDateToYYYYMMDD(raw: string): string {
  const s = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;


  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ocrText = String(body?.ocrText ?? "").trim();

    if (!ocrText) {
      return Response.json({ error: "ocrText is required" }, { status: 400 });
    }

    const result = await generateObject({
      model: google("gemini-2.5-flash"),
      schema: ReceiptSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are extracting structured receipt data from OCR text that may contain typos.
                      Return valid JSON matching the schema.

                      MERCHANT_NAME GUIDELINES:
                      - Identify the specific store or seller name, NOT the marketplace platform.
                      - If the receipt is from Tokopedia, Shopee, Lazada, or Amazon, look for the "Penjual", "Seller", or "Sold by" field.
                      - Do NOT use "Tokopedia", "Shopee", "PT GoTo Gojek Tokopedia", or similar platform names as the merchant_name.
                      - If the store name is not explicitly labeled, look for the entity that is providing the goods/services.

                      TOTAL_AMOUNT GUIDELINES:
                      - Always extract the full nominal value in Indonesian Rupiah (IDR).
                      - Indonesian receipts often use '.' as a thousand separator and ',' for decimals.
                      - If the receipt shows a decimal that represents thousands (e.g., 92.4 meaning 92400), you must convert it to the full integer 92400.
                      - Do not include fractional cents (digits after the decimal comma) unless they are significant.
                      - Your goal is to return the actual amount deducted from the user's balance.
                      - DOUBLE-CHECK LOGIC: Before outputting the total_amount, sum up all prices in line_items.
                      - If (Sum of line_items + Tax + Service Charge) equals a value on the receipt, use that value.
                      - If the extracted total_amount and the manual sum differ significantly, prioritize the value labeled as 'TOTAL' or 'GRAND TOTAL'.
                      - If the receipt is blurry and a digit is ambiguous (e.g., 8 or 0), use the context of other numbers to pick the most mathematically logical digit.
                      CLASSIFICATION RULES:
                      - Food: Restaurants, cafes, or ready-to-eat food.
                      - Transport: Fuel, parking, or public transit.
                      - Shopping: Clothing, electronics, or personal hobbies.
                      - Health: Pharmacy, hospital, or vitamins.
                      - Entertainment: Movies, games, or recreation.
                      - Bills: Electricity, water, internet, or taxes.
                      - Groceries: Supermarket/minimarket shopping for raw ingredients.
                      - Others: Use if no other category fits.

                      Return valid JSON matching the schema.

                      DATE:
                      - Return YYYY-MM-DD if present (can infer from typical formats).

                      OCR TEXT:
                      ${ocrText}`,
            },
          ],
        },
      ],
    });

    // --- Post processing (repair total) ---
    const aiObj = result.object;
    const candidates = extractTotalCandidates(ocrText);

    const aiTotal = Number(aiObj.total_amount ?? 0);
    let fixedTotal = repairTotal(aiTotal, candidates);

    if (fixedTotal < 3000) {
      const recon = reconstructTotal(ocrText);
      if (recon && recon > fixedTotal) {
        fixedTotal = recon;
      }
    }

    const safe = {
      ...aiObj,
      date: normalizeDateToYYYYMMDD(aiObj.date),
      total_amount: fixedTotal,
    };

    return Response.json({
      ...safe,
      meta: {
        total_candidates: candidates.slice(0, 10), // debug (boleh hapus kalau ga perlu)
        repaired: fixedTotal !== aiTotal,
      },
    });
  } catch (error: any) {
    console.error("extract-text error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
