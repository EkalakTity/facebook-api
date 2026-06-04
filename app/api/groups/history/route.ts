import { NextResponse } from "next/server";
import { db } from "@/lib/db";

interface GroupJoinRow {
  id: number;
  group_name: string;
  group_url: string;
  status: string;
  requested_at: string;
}

export async function GET() {
  const records = db
    .prepare("SELECT * FROM group_join_history ORDER BY requested_at DESC LIMIT 100")
    .all() as GroupJoinRow[];
  return NextResponse.json({ records });
}
