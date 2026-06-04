import { NextResponse } from "next/server";
import { joinGroup } from "@/lib/fb-bot";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const { groupUrl, groupName, accountId } = await req.json();
  if (!groupUrl || !accountId)
    return NextResponse.json({ success: false, error: "groupUrl and accountId required" }, { status: 400 });
  try {
    const status = await joinGroup(groupUrl, accountId);
    db.prepare(
      "INSERT INTO group_join_history (group_name, group_url, status) VALUES (?, ?, ?)"
    ).run(groupName ?? groupUrl, groupUrl, status);
    return NextResponse.json({ success: true, status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
