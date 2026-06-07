import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = db
    .prepare(
      `SELECT comment_text FROM comment_pool
       WHERE criteria_id = ? AND status = 'active'
       ORDER BY RANDOM() LIMIT 1`
    )
    .get(Number(id)) as { comment_text: string } | undefined;
  if (!row) return NextResponse.json({ error: "no comments in criteria" }, { status: 404 });
  return NextResponse.json({ comment_text: row.comment_text });
}
