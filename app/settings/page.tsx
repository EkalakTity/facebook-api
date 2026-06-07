"use client";
import { useEffect, useState, useRef } from "react";

interface Account {
  id: string;
  label: string;
  email: string;
  password: string;
}

interface Settings {
  accounts: Account[];
  headless: boolean;
  max_posts: number;
  scroll_speed_ms: number;
  keywords: string[];
  auto_comment_text: string;
}

interface SessionInfo { exists: boolean; savedAt: string | null }

interface CommentCriteria {
  id: number;
  name: string;
  description: string | null;
  comment_count: number;
}

interface CommentPoolItem {
  id: number;
  comment_text: string;
  status: string;
}

function genId() {
  return "acc_" + Math.random().toString(36).slice(2, 8);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    accounts: [],
    headless: false,
    max_posts: 20,
    scroll_speed_ms: 1500,
    keywords: [],
    auto_comment_text: "",
  });
  const [sessions, setSessions] = useState<Record<string, SessionInfo>>({});
  const [loginStatus, setLoginStatus] = useState<Record<string, "idle" | "loading" | "error">>({});
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [newKeyword, setNewKeyword] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importLine, setImportLine] = useState("");
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [importMsg, setImportMsg] = useState("");

  // Comment Criteria state
  const [criteria, setCriteria] = useState<CommentCriteria[]>([]);
  const [expandedCriteria, setExpandedCriteria] = useState<number | null>(null);
  const [criteriaComments, setCriteriaComments] = useState<Record<number, CommentPoolItem[]>>({});
  const [newCriteriaName, setNewCriteriaName] = useState("");
  const [newCriteriaDesc, setNewCriteriaDesc] = useState("");
  const [newCommentText, setNewCommentText] = useState<Record<number, string>>({});
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  async function loadCriteria() {
    const data = await fetch("/api/comment-criteria").then((r) => r.json());
    setCriteria(data.criteria ?? []);
  }

  useEffect(() => {
    loadCriteria();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data: Settings = await fetch("/api/settings").then((r) => r.json());
        setSettings(data);

        const sessionMap: Record<string, SessionInfo> = {};
        await Promise.all(
          (data.accounts ?? []).map(async (acc) => {
            try {
              const r = await fetch(`/api/login?accountId=${acc.id}`);
              sessionMap[acc.id] = await r.json();
            } catch {
              sessionMap[acc.id] = { exists: false, savedAt: null };
            }
          })
        );
        setSessions(sessionMap);
      } catch (e) {
        console.error("load settings error", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function save() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function addAccount() {
    const newAcc: Account = { id: genId(), label: `บัญชี ${settings.accounts.length + 1}`, email: "", password: "" };
    setSettings((s) => ({ ...s, accounts: [...s.accounts, newAcc] }));
  }

  function updateAccount(id: string, field: keyof Account, value: string) {
    setSettings((s) => ({
      ...s,
      accounts: s.accounts.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }));
  }

  function removeAccount(id: string) {
    setSettings((s) => ({ ...s, accounts: s.accounts.filter((a) => a.id !== id) }));
    setSessions((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  async function doLogin(accountId: string, manual = false) {
    setLoginStatus((s) => ({ ...s, [accountId]: "loading" }));
    setLoginErrors((s) => ({ ...s, [accountId]: "" }));
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    try {
      const url = manual ? "/api/login/manual" : "/api/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSessions((s) => ({ ...s, [accountId]: data.session }));
      setLoginStatus((s) => ({ ...s, [accountId]: "idle" }));
    } catch (e: unknown) {
      setLoginErrors((s) => ({ ...s, [accountId]: e instanceof Error ? e.message : "Login ไม่สำเร็จ" }));
      setLoginStatus((s) => ({ ...s, [accountId]: "error" }));
    }
  }

  async function doClearSession(accountId: string) {
    await fetch("/api/login", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    setSessions((s) => ({ ...s, [accountId]: { exists: false, savedAt: null } }));
  }

  function addKeyword() {
    const kw = newKeyword.trim();
    if (!kw || settings.keywords.includes(kw)) return;
    setSettings((s) => ({ ...s, keywords: [...s.keywords, kw] }));
    setNewKeyword("");
  }

  async function doImport() {
    if (!importLine.trim()) return;
    setImportStatus("loading");
    setImportMsg("");
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line: importLine.trim() }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setImportStatus("ok");
      setImportMsg(`✅ Import สำเร็จ: ${data.label}`);
      setImportLine("");
      // reload settings
      const s = await fetch("/api/settings").then(r => r.json());
      setSettings(s);
    } catch (e: unknown) {
      setImportStatus("error");
      setImportMsg(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    }
  }

  async function addCriteria() {
    if (!newCriteriaName.trim()) return;
    setCriteriaLoading(true);
    await fetch("/api/comment-criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCriteriaName.trim(), description: newCriteriaDesc.trim() }),
    });
    setNewCriteriaName("");
    setNewCriteriaDesc("");
    await loadCriteria();
    setCriteriaLoading(false);
  }

  async function deleteCriteria(id: number) {
    await fetch(`/api/comment-criteria/${id}`, { method: "DELETE" });
    setExpandedCriteria(null);
    await loadCriteria();
  }

  async function expandCriteria(id: number) {
    if (expandedCriteria === id) { setExpandedCriteria(null); return; }
    setExpandedCriteria(id);
    if (!criteriaComments[id]) {
      const data = await fetch(`/api/comment-criteria/${id}/comments`).then((r) => r.json());
      setCriteriaComments((prev) => ({ ...prev, [id]: data.comments ?? [] }));
    }
  }

  async function addComment(criteriaId: number) {
    const text = (newCommentText[criteriaId] ?? "").trim();
    if (!text) return;
    await fetch(`/api/comment-criteria/${criteriaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment_text: text }),
    });
    setNewCommentText((prev) => ({ ...prev, [criteriaId]: "" }));
    const data = await fetch(`/api/comment-criteria/${criteriaId}/comments`).then((r) => r.json());
    setCriteriaComments((prev) => ({ ...prev, [criteriaId]: data.comments ?? [] }));
    await loadCriteria();
  }

  async function deleteComment(criteriaId: number, commentId: number) {
    await fetch(`/api/comment-criteria/${criteriaId}/comments/${commentId}`, { method: "DELETE" });
    setCriteriaComments((prev) => ({
      ...prev,
      [criteriaId]: (prev[criteriaId] ?? []).filter((c) => c.id !== commentId),
    }));
    await loadCriteria();
  }

  if (loading) return <p className="text-gray-400 text-sm mt-4">กำลังโหลด...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">⚙️ Settings</h1>

      {/* Import Account */}
      <section className="bg-gray-900 border border-blue-800 rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-gray-200">📥 Import Account</h2>
        <p className="text-xs text-gray-400">
          วาง format: <code className="bg-gray-800 px-1 rounded">email:password:profileURL:userAgent:base64cookies</code>
        </p>
        <textarea
          rows={3}
          value={importLine}
          onChange={(e) => { setImportLine(e.target.value); setImportStatus("idle"); }}
          placeholder="วางข้อมูลบัญชีที่นี่..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
        />
        {importMsg && (
          <p className={`text-xs ${importStatus === "ok" ? "text-green-400" : "text-red-400"}`}>{importMsg}</p>
        )}
        <button
          onClick={doImport}
          disabled={importStatus === "loading" || !importLine.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded-lg text-sm font-medium transition"
        >
          {importStatus === "loading" ? "⏳ กำลัง Import..." : "📥 Import & ใช้งานเลย"}
        </button>
      </section>

      {/* Accounts */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-200">บัญชี Facebook ({settings.accounts.length})</h2>
          <button
            onClick={addAccount}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition"
          >
            + เพิ่มบัญชี
          </button>
        </div>

        {settings.accounts.length === 0 && (
          <p className="text-gray-500 text-sm">ยังไม่มีบัญชี — กด "เพิ่มบัญชี" เพื่อเริ่มต้น</p>
        )}

        {settings.accounts.map((acc) => {
          const sess = sessions[acc.id] ?? { exists: false, savedAt: null };
          const status = loginStatus[acc.id] ?? "idle";
          return (
            <div key={acc.id} className="border border-gray-700 rounded-xl p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <input
                  value={acc.label}
                  onChange={(e) => updateAccount(acc.id, "label", e.target.value)}
                  className="bg-transparent font-medium text-sm focus:outline-none border-b border-transparent focus:border-gray-600 pb-0.5"
                />
                <div className="flex items-center gap-2">
                  {sess.exists ? (
                    <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">✅ Login อยู่</span>
                  ) : (
                    <span className="text-xs bg-red-900/50 text-red-400 border border-red-800 px-2 py-0.5 rounded-full">❌ ยังไม่ได้ Login</span>
                  )}
                  <button
                    onClick={() => removeAccount(acc.id)}
                    className="text-gray-600 hover:text-red-400 text-xs transition"
                  >
                    ลบ
                  </button>
                </div>
              </div>

              {/* Credentials */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email</label>
                  <input
                    type="email"
                    value={acc.email}
                    onChange={(e) => updateAccount(acc.id, "email", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Password</label>
                  <input
                    type="password"
                    value={acc.password}
                    onChange={(e) => updateAccount(acc.id, "password", e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {sess.savedAt && (
                <p className="text-xs text-gray-500">Session บันทึกล่าสุด: {new Date(sess.savedAt).toLocaleString("th-TH")}</p>
              )}

              {loginErrors[acc.id] && (
                <p className="text-red-400 text-xs">❌ {loginErrors[acc.id]}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => doLogin(acc.id, false)}
                  disabled={status === "loading"}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-1.5 rounded-lg text-xs font-medium transition"
                >
                  {status === "loading" ? "⏳ กำลัง Login..." : sess.exists ? "🔄 รีเฟรช" : "🔑 Auto Login"}
                </button>
                <button
                  onClick={() => doLogin(acc.id, true)}
                  disabled={status === "loading"}
                  title="เปิด Browser ให้ Login เอง รองรับ 2FA / CAPTCHA (รอ 3 นาที)"
                  className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-1.5 rounded-lg text-xs font-medium transition"
                >
                  {status === "loading" ? "⏳ รอ Login..." : "🖥 Manual Login"}
                </button>
                {sess.exists && (
                  <button
                    onClick={() => doClearSession(acc.id)}
                    className="px-3 py-1.5 rounded-lg text-xs text-red-400 border border-red-800 hover:bg-red-900/30 transition"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Bot config */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="font-medium text-gray-200">ตั้งค่า Bot</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm">Headless Mode</p>
            <p className="text-xs text-gray-400">เปิด browser แบบซ่อน</p>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, headless: !s.headless }))}
            className={`w-11 h-6 rounded-full transition-colors relative ${settings.headless ? "bg-blue-600" : "bg-gray-700"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.headless ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">จำนวน Post สูงสุด: <span className="text-white">{settings.max_posts}</span></label>
          <input type="range" min={5} max={100} step={5} value={settings.max_posts}
            onChange={(e) => setSettings((s) => ({ ...s, max_posts: Number(e.target.value) }))}
            className="w-full accent-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">ความเร็ว Scroll: <span className="text-white">{settings.scroll_speed_ms} ms</span></label>
          <input type="range" min={500} max={5000} step={100} value={settings.scroll_speed_ms}
            onChange={(e) => setSettings((s) => ({ ...s, scroll_speed_ms: Number(e.target.value) }))}
            className="w-full accent-blue-500" />
          <div className="flex justify-between text-xs text-gray-500 mt-1"><span>เร็ว</span><span>ช้า</span></div>
        </div>
      </section>

      {/* Auto Comment Text */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-gray-200">ข้อความ Auto Comment</h2>
        <p className="text-xs text-gray-400">ข้อความนี้จะถูกคอมเม้นอัตโนมัติในโพสต์ที่มี keyword ที่กำหนด</p>
        <textarea
          rows={3}
          value={settings.auto_comment_text}
          onChange={(e) => setSettings((s) => ({ ...s, auto_comment_text: e.target.value }))}
          placeholder="เช่น: สนใจติดต่อ inbox เลยนะครับ 😊"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 resize-none"
        />
      </section>

      {/* Keywords */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-gray-200">Keywords</h2>
        <div className="flex gap-2">
          <input type="text" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="เพิ่ม keyword..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
          <button onClick={addKeyword} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition">+ เพิ่ม</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {settings.keywords.map((kw) => (
            <span key={kw} className="bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-sm flex items-center gap-2">
              {kw}
              <button onClick={() => setSettings((s) => ({ ...s, keywords: s.keywords.filter((k) => k !== kw) }))}
                className="text-gray-500 hover:text-red-400 text-xs">✕</button>
            </span>
          ))}
          {settings.keywords.length === 0 && <p className="text-gray-500 text-sm">ยังไม่มี keyword</p>}
        </div>
      </section>

      {/* Comment Criteria */}
      <section className="bg-gray-900 border border-purple-900 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-gray-200">🎲 Comment Criteria</h2>
            <p className="text-xs text-gray-400 mt-0.5">สร้างกลุ่มข้อความ — ระบบจะสุ่ม comment จากกลุ่มที่เลือก</p>
          </div>
        </div>

        {/* Add new criteria */}
        <div className="bg-gray-800 rounded-lg p-3 space-y-2 border border-gray-700">
          <p className="text-xs text-gray-400 font-medium">+ เพิ่ม Criteria ใหม่</p>
          <input
            type="text"
            value={newCriteriaName}
            onChange={(e) => setNewCriteriaName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCriteria()}
            placeholder="ชื่อกลุ่ม เช่น โปรโมชั่น, ทักทาย, ติดตามผล"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
          <input
            type="text"
            value={newCriteriaDesc}
            onChange={(e) => setNewCriteriaDesc(e.target.value)}
            placeholder="คำอธิบาย (ไม่บังคับ)"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600"
          />
          <button
            onClick={addCriteria}
            disabled={criteriaLoading || !newCriteriaName.trim()}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:opacity-50 py-2 rounded-lg text-sm font-medium transition"
          >
            {criteriaLoading ? "⏳ กำลังบันทึก..." : "+ สร้าง Criteria"}
          </button>
        </div>

        {/* Criteria list */}
        {criteria.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-2">ยังไม่มี Criteria — สร้างด้านบน</p>
        )}

        {criteria.map((c) => {
          const isOpen = expandedCriteria === c.id;
          const comments = criteriaComments[c.id] ?? [];
          return (
            <div key={c.id} className="border border-gray-700 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-850 hover:bg-gray-800 cursor-pointer"
                onClick={() => expandCriteria(c.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-200">{c.name}</span>
                  {c.description && <span className="text-xs text-gray-500">{c.description}</span>}
                  <span className="text-xs bg-purple-900/50 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full">
                    {c.comment_count} ข้อความ
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCriteria(c.id); }}
                    className="text-gray-600 hover:text-red-400 text-xs transition px-1"
                  >
                    ลบ
                  </button>
                  <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded: comments list + add */}
              {isOpen && (
                <div className="border-t border-gray-700 p-4 space-y-3 bg-gray-900">
                  {/* Existing comments */}
                  {comments.length === 0 && (
                    <p className="text-xs text-gray-500">ยังไม่มีข้อความ — เพิ่มด้านล่าง</p>
                  )}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {comments.map((cm, idx) => (
                      <div key={cm.id} className="flex items-start gap-2 group">
                        <span className="text-xs text-gray-600 mt-1 shrink-0 w-5 text-right">{idx + 1}.</span>
                        <p className="flex-1 text-sm text-gray-300 bg-gray-800 rounded-lg px-3 py-2 leading-relaxed">
                          {cm.comment_text}
                        </p>
                        <button
                          onClick={() => deleteComment(c.id, cm.id)}
                          className="text-gray-600 hover:text-red-400 text-xs mt-1.5 opacity-0 group-hover:opacity-100 transition shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new comment */}
                  <div className="flex gap-2 pt-1">
                    <textarea
                      ref={(el) => { textareaRefs.current[c.id] = el; }}
                      rows={2}
                      value={newCommentText[c.id] ?? ""}
                      onChange={(e) => setNewCommentText((prev) => ({ ...prev, [c.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) addComment(c.id); }}
                      placeholder="พิมพ์ข้อความ... (Ctrl+Enter เพิ่ม)"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 placeholder-gray-600 resize-none"
                    />
                    <button
                      onClick={() => addComment(c.id)}
                      disabled={!(newCommentText[c.id] ?? "").trim()}
                      className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 px-3 py-2 rounded-lg text-xs font-medium transition self-end"
                    >
                      + เพิ่ม
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">แนะนำ 10-20 ข้อความ เพื่อความหลากหลาย</p>
                </div>
              )}
            </div>
          );
        })}
      </section>

      <button onClick={save} className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg font-medium transition text-sm">
        {saved ? "✅ บันทึกแล้ว" : "💾 บันทึก Settings"}
      </button>
    </div>
  );
}
