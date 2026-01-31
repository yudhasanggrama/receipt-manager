import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) return Response.json({ error: "File tidak ditemukan" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    const result = await generateObject({
      // Menggunakan Gemini 2.0 Flash untuk akurasi klasifikasi yang lebih baik
      model: google('gemini-2.5-flash'), 
      schema: z.object({
        merchant_name: z.string(),
        date: z.string().describe("Format YYYY-MM-DD"),
        total_amount: z.number(),
        // Menambahkan pemilihan kategori berdasarkan daftar Anda
        category: z.enum([
          "Food", "Transport", "Shopping", "Health", 
          "Entertainment", "Bills", "Groceries", "Others"
        ]),
        line_items: z.array(z.object({
          name: z.string(),
          price: z.number()
        }))
      }),
      messages: [
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: `Extract data from this receipt. 
              
              CLASSIFICATION RULES:
              - Food: Restaurants, cafes, or ready-to-eat food.
              - Transport: Fuel, parking, or public transit.
              - Shopping: Clothing, electronics, or personal hobbies.
              - Health: Pharmacy, hospital, or vitamins.
              - Entertainment: Movies, games, or recreation.
              - Bills: Electricity, water, internet, or taxes.
              - Groceries: Supermarket/minimarket shopping for raw ingredients.
              - Others: Use if no other category fits.

              Return valid JSON matching the schema.` 
            },
            { 
              type: 'image', 
              image: uint8Array, 
            },
          ],
        },
      ],
    });

    return Response.json(result.object);
  } catch (error: any) {
    console.error("AI Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}