import { NextResponse } from "next/server";
import { searchGroups } from "@/lib/fb-bot";

export async function POST(req: Request) {
  const { query, accountId } = await req.json();
  if (!query?.trim() || !accountId)
    return NextResponse.json({ success: false, error: "query and accountId required" }, { status: 400 });
  try {
    const groups = await searchGroups(query.trim(), accountId);
    return NextResponse.json({ success: true, groups });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
