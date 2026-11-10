import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";

export const maxDuration = 60;

const system = (cats: unknown) => `Estrai una transazione da uno scontrino (immagine) o da una frase dettata (testo italiano).
Rispondi SOLO con JSON: {"amount": number (positivo), "type": "expense"|"income", "date": "YYYY-MM-DD"|null, "description": string, "payee": string (negozio/persona), "category": string, "subcategory": string, "tags": string[]}.
Categorie ammesse: ${JSON.stringify(cats)}. Usa il totale pagato dello scontrino.`;

function fallback(text: string) {
  const m = text.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  const income = /(stipendio|incasso|ricevuto|entrata)/i.test(text);
  return { amount: m ? Number(m[1]) : 0, type: income ? "income" : "expense", date: null, description: text, category: "Altro", subcategory: "Varie", tags: [] };
}

export async function POST(req: Request) {
  const { image, mediaType, text, categories } = (await req.json()) as { image?: string; mediaType?: string; text?: string; categories?: Record<string, string[]> };
  const valid = categories && Object.values(categories).every((v) => Array.isArray(v) && v.every((x) => typeof x === "string"));
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ ...fallback(text ?? ""), note: "ANTHROPIC_API_KEY mancante: parsing base" });
  try {
    const client = new Anthropic();
    const content: Anthropic.ContentBlockParam[] = image
      ? [
          { type: "image", source: { type: "base64", media_type: (mediaType ?? "image/jpeg") as "image/jpeg", data: image } },
          { type: "text", text: "Estrai la transazione da questo scontrino." },
        ]
      : [{ type: "text", text: `Frase dettata: "${text}". Oggi è ${new Date().toISOString().slice(0, 10)}.` }];
    const res = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 500,
      system: system(valid ? categories : CATEGORIES),
      messages: [{ role: "user", content }],
    });
    const out = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = out.match(/\{[\s\S]*\}/);
    return NextResponse.json(json ? JSON.parse(json[0]) : fallback(text ?? ""));
  } catch (e) {
    return NextResponse.json({ ...fallback(text ?? ""), note: "Errore AI: " + (e as Error).message }, { status: 200 });
  }
}
