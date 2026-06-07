import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.description, c.created_at,
              COUNT(p.id) AS comment_count
       FROM comment_criteria c
       LEFT JOIN comment_pool p ON p.criteria_id = c.id AND p.status = 'active'
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    )
    .all();
  return NextResponse.json({ criteria: rows });
}

export async function POST(req: Request) {
  const { name, description } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });
  const result = db
    .prepare(`INSERT INTO comment_criteria (name, description) VALUES (?, ?)`)
    .run(name.trim(), description?.trim() ?? null);
  return NextResponse.json({ id: result.lastInsertRowid, name: name.trim() });
}
