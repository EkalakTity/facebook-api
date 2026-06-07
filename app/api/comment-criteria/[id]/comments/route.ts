import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rows = db
    .prepare(`SELECT id, comment_text, status, created_at FROM comment_pool WHERE criteria_id = ? ORDER BY id ASC`)
    .all(Number(id));
  return NextResponse.json({ comments: rows });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { comment_text } = await req.json();
  if (!comment_text?.trim()) return NextResponse.json({ error: "comment_text required" }, { status: 400 });
  const result = db
    .prepare(`INSERT INTO comment_pool (criteria_id, comment_text) VALUES (?, ?)`)
    .run(Number(id), comment_text.trim());
  return NextResponse.json({ id: result.lastInsertRowid });
}
