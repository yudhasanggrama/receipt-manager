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

// --- HELPERS ---
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
                      Return STRICT JSON matching the schema. No markdown.

                      ABSOLUTE RULES:
                      - Use ONLY information present in OCR TEXT. Do not invent.
                      - If uncertain/missing, use null.
                      - For any numeric field, output integer IDR (no separators).

                      STEP 1: CANDIDATES (must be derived from OCR TEXT)
                      Extract candidate lists:
                      - merchant_candidates: up to 5 strings from top/header-like lines (remove address-like lines).
                      - date_candidates: up to 5 strings that look like dates/times.
                      - total_candidates: up to 8 numbers near keywords: TOTAL, GRAND TOTAL, AMOUNT, BAYAR, TOTAL BAYAR, TOTAL RP, JUMLAH.
                      - line_item_amounts: list of integers from OCR that look like item prices/subtotals.

                      STEP 2: DECISION
                      - merchant_name: choose best from merchant_candidates. Must NOT be marketplace unless explicitly "Sold by / Penjual".
                      - date: pick the most plausible date from date_candidates and convert to YYYY-MM-DD. If only dd/mm/yy, infer century reasonably.
                      - total_amount:
                        - Prefer explicit TOTAL/GRAND TOTAL candidate.
                        - If ambiguous like "92.4", interpret as 92400 ONLY if it matches other totals/subtotal context.
                        - If multiple totals exist (subtotal, total, payment), choose the final amount paid/deducted.

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
