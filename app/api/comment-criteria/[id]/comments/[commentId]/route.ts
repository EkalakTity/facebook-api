import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; commentId: string }> }
) {
  const { id, commentId } = await ctx.params;
  db.prepare(`DELETE FROM comment_pool WHERE id = ? AND criteria_id = ?`)
    .run(Number(commentId), Number(id));
  return NextResponse.json({ ok: true });
}
