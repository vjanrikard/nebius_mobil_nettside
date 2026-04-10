import { NextResponse } from "next/server";
import { STOCKS } from "@/lib/config";

export async function GET() {
  return NextResponse.json({ tickers: STOCKS });
}
