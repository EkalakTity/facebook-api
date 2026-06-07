import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  db.prepare(`DELETE FROM comment_criteria WHERE id = ?`).run(Number(id));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  db.prepare(`UPDATE comment_criteria SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(name.trim(), description?.trim() ?? null, Number(id));
  return NextResponse.json({ ok: true });
}
