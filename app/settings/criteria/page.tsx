"use client";
import { useEffect, useState, useRef } from "react";

interface Criteria {
  id: number;
  name: string;
  description: string | null;
  comment_count: number;
  created_at: string;
}

interface Comment {
  id: number;
  comment_text: string;
  status: string;
  created_at: string;
}

export default function CriteriaPage() {
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [randomResult, setRandomResult] = useState<Record<number, string>>({});
  const [randomLoading, setRandomLoading] = useState<Record<number, boolean>>({});

  // New criteria form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  // New comment per criteria
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [addingComment, setAddingComment] = useState<Record<number, boolean>>({});

  // Bulk add textarea per criteria
  const [bulkText, setBulkText] = useState<Record<number, string>>({});
  const [bulkMode, setBulkMode] = useState<Record<number, boolean>>({});
  const [bulkAdding, setBulkAdding] = useState<Record<number, boolean>>({});

  const commentInputRef = useRef<Record<number, HTMLTextAreaElement | null>>({});

  async function reload() {
    const data = await fetch("/api/comment-criteria").then((r) => r.json());
    setCriteria(data.criteria ?? []);
  }

  async function loadComments(id: number) {
    const data = await fetch(`/api/comment-criteria/${id}/comments`).then((r) => r.json());
    setComments((prev) => ({ ...prev, [id]: data.comments ?? [] }));
  }

  useEffect(() => { reload(); }, []);

  async function createCriteria() {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/comment-criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    });
    setNewName(""); setNewDesc("");
    await reload();
    setCreating(false);
  }

  async function deleteCriteria(id: number) {
    if (!confirm(`ลบ criteria นี้? จะลบ comment ทั้งหมดด้วย`)) return;
    await fetch(`/api/comment-criteria/${id}`, { method: "DELETE" });
    setExpanded(null);
    await reload();
  }

  async function expand(id: number) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!comments[id]) await loadComments(id);
  }

  async function addComment(criteriaId: number) {
    const text = (newComment[criteriaId] ?? "").trim();
    if (!text) return;
    setAddingComment((p) => ({ ...p, [criteriaId]: true }));
    await fetch(`/api/comment-criteria/${criteriaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_text: text }),
    });
    setNewComment((p) => ({ ...p, [criteriaId]: "" }));
    await loadComments(criteriaId);
    await reload();
    setAddingComment((p) => ({ ...p, [criteriaId]: false }));
  }

  async function addBulkComments(criteriaId: number) {
    const lines = (bulkText[criteriaId] ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setBulkAdding((p) => ({ ...p, [criteriaId]: true }));
    for (const line of lines) {
      await fetch(`/api/comment-criteria/${criteriaId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: line }),
      });
    }
    setBulkText((p) => ({ ...p, [criteriaId]: "" }));
    setBulkMode((p) => ({ ...p, [criteriaId]: false }));
    await loadComments(criteriaId);
    await reload();
    setBulkAdding((p) => ({ ...p, [criteriaId]: false }));
  }

  async function deleteComment(criteriaId: number, commentId: number) {
    await fetch(`/api/comment-criteria/${criteriaId}/comments/${commentId}`, { method: "DELETE" });
    setComments((prev) => ({
      ...prev,
      [criteriaId]: (prev[criteriaId] ?? []).filter((c) => c.id !== commentId),
    }));
    await reload();
  }

  async function testRandom(criteriaId: number) {
    setRandomLoading((p) => ({ ...p, [criteriaId]: true }));
    setRandomResult((p) => ({ ...p, [criteriaId]: "" }));
    const data = await fetch(`/api/comment-criteria/${criteriaId}/random`).then((r) => r.json());
    setRandomResult((p) => ({ ...p, [criteriaId]: data.comment_text ?? data.error ?? "ไม่มีข้อความ" }));
    setRandomLoading((p) => ({ ...p, [criteriaId]: false }));
  }

  const total = criteria.reduce((s, c) => s + c.comment_count, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">🎲 Comment Criteria</h1>
          <p className="text-xs text-gray-400 mt-1">
            {criteria.length} กลุ่ม · {total} ข้อความทั้งหมด — ระบบจะสุ่ม 1 ข้อความต่อโพสต์
          </p>
        </div>
        <a href="/settings" className="text-xs text-gray-500 hover:text-gray-300 transition">← กลับ Settings</a>
      </div>

      {/* Create new criteria */}
      <section className="bg-gray-900 border border-purple-900/60 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-medium text-purple-300">+ สร้าง Criteria ใหม่</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createCriteria()}
            placeholder="ชื่อกลุ่ม เช่น โปรโมชั่น, ทักทาย"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="คำอธิบาย (ไม่บังคับ)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
        </div>
        <button
          onClick={createCriteria}
          disabled={creating || !newName.trim()}
          className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-2 rounded-lg text-sm font-medium transition"
        >
          {creating ? "⏳ กำลังสร้าง..." : "+ สร้าง Criteria"}
        </button>
      </section>

      {/* Criteria list */}
      {criteria.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-12 border border-dashed border-gray-700 rounded-xl">
          ยังไม่มี Criteria — สร้างด้านบนได้เลย
        </div>
      )}

      {criteria.map((c) => {
        const isOpen = expanded === c.id;
        const cms = comments[c.id] ?? [];
        const randText = randomResult[c.id];
        const randLoading = randomLoading[c.id] ?? false;
        const isBulk = bulkMode[c.id] ?? false;

        return (
          <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Criteria header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-800/50 transition"
              onClick={() => expand(c.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div>
                  <p className="font-medium text-sm text-gray-100">{c.name}</p>
                  {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
                </div>
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${
                  c.comment_count === 0
                    ? "bg-red-900/30 text-red-400 border-red-800"
                    : c.comment_count < 5
                    ? "bg-yellow-900/30 text-yellow-400 border-yellow-800"
                    : "bg-purple-900/40 text-purple-300 border-purple-800"
                }`}>
                  {c.comment_count} ข้อความ
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-3">
                {/* Test random button */}
                <button
                  onClick={(e) => { e.stopPropagation(); testRandom(c.id); }}
                  disabled={randLoading || c.comment_count === 0}
                  className="text-xs bg-green-900/40 hover:bg-green-800/60 text-green-300 border border-green-800 px-3 py-1 rounded-lg transition disabled:opacity-40"
                >
                  {randLoading ? "⏳" : "🎲 ทดสอบ Random"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCriteria(c.id); }}
                  className="text-xs text-gray-600 hover:text-red-400 transition px-1"
                >
                  ลบ
                </button>
                <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Random result */}
            {randText && (
              <div className="mx-5 mb-3 bg-green-900/20 border border-green-800/50 rounded-lg px-4 py-2.5 text-sm text-green-300">
                🎲 <span className="font-medium">Random result:</span> {randText}
              </div>
            )}

            {/* Expanded panel */}
            {isOpen && (
              <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                {/* Comments list */}
                {cms.length === 0 ? (
                  <p className="text-xs text-gray-500">ยังไม่มีข้อความ — เพิ่มด้านล่าง</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {cms.map((cm, idx) => (
                      <div key={cm.id} className="flex items-start gap-2 group">
                        <span className="text-xs text-gray-600 mt-2 shrink-0 w-6 text-right">{idx + 1}.</span>
                        <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 leading-relaxed">
                          {cm.comment_text}
                        </div>
                        <button
                          onClick={() => deleteComment(c.id, cm.id)}
                          className="text-gray-600 hover:text-red-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Count hint */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        c.comment_count >= 10 ? "bg-green-500" : c.comment_count >= 5 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, (c.comment_count / 20) * 100)}%` }}
                    />
                  </div>
                  <span className={c.comment_count >= 10 ? "text-green-400" : "text-yellow-400"}>
                    {c.comment_count}/20 {c.comment_count >= 10 ? "✅ ดีมาก" : c.comment_count >= 5 ? "⚠️ ควรเพิ่ม" : "❌ น้อยเกินไป"}
                  </span>
                </div>

                {/* Add mode toggle */}
                <div className="flex gap-2 border-t border-gray-800 pt-3">
                  <button
                    onClick={() => setBulkMode((p) => ({ ...p, [c.id]: false }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${!isBulk ? "bg-gray-700 border-gray-600 text-white" : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"}`}
                  >
                    เพิ่มทีละรายการ
                  </button>
                  <button
                    onClick={() => setBulkMode((p) => ({ ...p, [c.id]: true }))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${isBulk ? "bg-gray-700 border-gray-600 text-white" : "bg-transparent border-gray-700 text-gray-500 hover:border-gray-600"}`}
                  >
                    วางหลายบรรทัดพร้อมกัน
                  </button>
                </div>

                {!isBulk ? (
                  <div className="flex gap-2">
                    <textarea
                      ref={(el) => { commentInputRef.current[c.id] = el; }}
                      rows={2}
                      value={newComment[c.id] ?? ""}
                      onChange={(e) => setNewComment((p) => ({ ...p, [c.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) addComment(c.id); }}
                      placeholder="พิมพ์ข้อความ... (Ctrl+Enter เพิ่ม)"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600 resize-none"
                    />
                    <button
                      onClick={() => addComment(c.id)}
                      disabled={addingComment[c.id] || !(newComment[c.id] ?? "").trim()}
                      className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 px-4 py-2 rounded-lg text-xs font-medium transition self-end"
                    >
                      {addingComment[c.id] ? "⏳" : "+ เพิ่ม"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">วางข้อความหลายรายการ — 1 บรรทัด = 1 ข้อความ</p>
                    <textarea
                      rows={6}
                      value={bulkText[c.id] ?? ""}
                      onChange={(e) => setBulkText((p) => ({ ...p, [c.id]: e.target.value }))}
                      placeholder={"ข้อความที่ 1\nข้อความที่ 2\nข้อความที่ 3\n..."}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600 resize-none font-mono"
                    />
                    <button
                      onClick={() => addBulkComments(c.id)}
                      disabled={bulkAdding[c.id] || !(bulkText[c.id] ?? "").trim()}
                      className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-40 py-2 rounded-lg text-xs font-medium transition"
                    >
                      {bulkAdding[c.id]
                        ? "⏳ กำลังเพิ่ม..."
                        : `+ เพิ่ม ${(bulkText[c.id] ?? "").split("\n").filter((l) => l.trim()).length} ข้อความ`}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Usage tip */}
      {criteria.length > 0 && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p className="text-gray-400 font-medium">💡 วิธีใช้งาน</p>
          <p>• ไปที่ Dashboard → ค้นหา &amp; คอมเม้น → Phase 2 Comment → เลือก <span className="text-purple-400">🎲 สุ่มจาก Criteria</span></p>
          <p>• ระบบจะสุ่ม 1 ข้อความจากกลุ่มที่เลือกในทุก Job run</p>
          <p>• แนะนำ 10–20 ข้อความต่อกลุ่มเพื่อความหลากหลาย หลีกเลี่ยง spam detection</p>
        </div>
      )}
    </div>
  );
}
