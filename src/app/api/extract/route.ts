import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) return Response.json({ error: "File Not Found" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const uint8Array = new Uint8Array(bytes);

    const result = await generateObject({
      model: google('gemini-2.5-flash'), 
      schema: z.object({
        merchant_name: z.string(),
        date: z.string().describe("Format YYYY-MM-DD"),
        total_amount: z.number(),
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