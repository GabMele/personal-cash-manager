import { NextResponse } from "next/server";
import { FALLBACK } from "@/lib/fx";

// Cambi BCE via frankfurter.dev (gratuito), in cache 12h.
export async function GET() {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=EUR", { next: { revalidate: 43200 } });
    if (!res.ok) throw new Error(String(res.status));
    const j = (await res.json()) as { rates: Record<string, number>; date: string };
    return NextResponse.json({ rates: j.rates, date: j.date, live: true });
  } catch {
    return NextResponse.json({ rates: FALLBACK, date: null, live: false });
  }
}
