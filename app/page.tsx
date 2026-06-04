"use client";
import { useEffect, useState } from "react";

interface Account {
  id: string;
  label: string;
  email: string;
  password: string;
  uid?: string;
  profile_url?: string;
}
interface SessionInfo { exists: boolean; savedAt: string | null }
interface Post { postId: string; url: string; text: string }
interface Chat { name: string; preview: string }
interface CommentRecord { postId: string; url: string; comment: string; commentedAt: string }
interface LogEntry { type: string; message: string }
interface GroupSearchResult {
  name: string;
  url: string;
  memberCount: string | null;
  privacy: "public" | "private" | null;
}
interface GroupJoinRecord {
  id: number;
  group_name: string;
  group_url: string;
  status: string;
  requested_at: string;
}
interface QueueItem {
  id: number
  scanned_post_id: number
  message_text: string | null
  status: string
  created_at: string
  post_url: string
  post_id: string | null
  post_text: string | null
  author_name: string | null
  account_id: number
  target_id: number
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState<"accounts" | "feed" | "chat" | "groups" | "auto" | "history" | "queue">("accounts");

  // accounts tab state
  const [sessions, setSessions] = useState<Record<string, SessionInfo>>({});
  const [accLoginStatus, setAccLoginStatus] = useState<Record<string, "idle" | "loading" | "error">>({});
  const [accLoginErrors, setAccLoginErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");

  // comment state ต่อ postId
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [commentStatus, setCommentStatus] = useState<Record<string, "idle" | "loading" | "done" | "duplicate" | "error">>({});
  const [commentErrors, setCommentErrors] = useState<Record<string, string>>({});
  const [commentedIds, setCommentedIds] = useState<Set<string>>(new Set());

  const [keyword, setKeyword] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [history, setHistory] = useState<CommentRecord[]>([]);

  // Groups tab state
  const [groupQuery, setGroupQuery] = useState("");
  const [groupResults, setGroupResults] = useState<GroupSearchResult[]>([]);
  const [groupSearchLoading, setGroupSearchLoading] = useState(false);
  const [groupSearchError, setGroupSearchError] = useState("");
  const [groupJoinLoading, setGroupJoinLoading] = useState<Record<string, boolean>>({});
  const [groupJoinStatus, setGroupJoinStatus] = useState<Record<string, string>>({});
  const [groupHistory, setGroupHistory] = useState<GroupJoinRecord[]>([]);

  // Queue tab state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueConnected, setQueueConnected] = useState(false);
  const [queueActionLoading, setQueueActionLoading] = useState<Record<number, boolean>>({});

  // Auto tab state
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLog, setAutoLog] = useState<LogEntry[]>([]);
  const [autoStats, setAutoStats] = useState<{ commented: number; skipped_keyword: number; skipped_duplicate: number; errors: number } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(async (data) => {
        const accs: Account[] = data.accounts ?? [];
        setAccounts(accs);
        if (accs.length > 0) setSelectedId(accs[0].id);
        // load session info for all accounts
        const map: Record<string, SessionInfo> = {};
        await Promise.all(accs.map(async (acc) => {
          try {
            const r = await fetch(`/api/login?accountId=${acc.id}`);
            map[acc.id] = await r.json();
          } catch {
            map[acc.id] = { exists: false, savedAt: null };
          }
        }));
        setSessions(map);
      });
    // load group join history
    fetch("/api/groups/history")
      .then((r) => r.json())
      .then((data) => setGroupHistory(data.records ?? []));
  }, []);

  // โหลด history ทุกครั้งที่เปลี่ยน account
  useEffect(() => {
    if (!selectedId) return;
    fetch(`/api/history?accountId=${selectedId}`)
      .then((r) => r.json())
      .then((records: CommentRecord[]) => {
        setHistory(records);
        setCommentedIds(new Set(records.map((r) => r.postId)));
      });
  }, [selectedId]);

  async function reloadAccounts() {
    const data = await fetch("/api/settings").then((r) => r.json());
    const accs: Account[] = data.accounts ?? [];
    setAccounts(accs);
    const map: Record<string, SessionInfo> = {};
    await Promise.all(accs.map(async (acc) => {
      try {
        const r = await fetch(`/api/login?accountId=${acc.id}`);
        map[acc.id] = await r.json();
      } catch {
        map[acc.id] = { exists: false, savedAt: null };
      }
    }));
    setSessions(map);
  }

  async function doAccLogin(accountId: string, manual = false) {
    setAccLoginStatus((s) => ({ ...s, [accountId]: "loading" }));
    setAccLoginErrors((s) => ({ ...s, [accountId]: "" }));
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
      await reloadAccounts();
      setAccLoginStatus((s) => ({ ...s, [accountId]: "idle" }));
    } catch (e: unknown) {
      setAccLoginErrors((s) => ({ ...s, [accountId]: e instanceof Error ? e.message : "Login ไม่สำเร็จ" }));
      setAccLoginStatus((s) => ({ ...s, [accountId]: "error" }));
    }
  }

  async function doAccClearSession(accountId: string) {
    await fetch("/api/login", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId }),
    });
    setSessions((s) => ({ ...s, [accountId]: { exists: false, savedAt: null } }));
  }

  async function doAccDelete(accountId: string) {
    const res = await fetch("/api/settings").then((r) => r.json());
    const updated = { ...res, accounts: res.accounts.filter((a: Account) => a.id !== accountId) };
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    await doAccClearSession(accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    if (selectedId === accountId) setSelectedId(updated.accounts[0]?.id ?? "");
  }

  async function startScroll() {
    if (!selectedId) return;
    setFeedLoading(true);
    setFeedError("");
    setPosts([]);
    try {
      const res = await fetch("/api/scroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setPosts(data.posts);
    } catch (e: unknown) {
      setFeedError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setFeedLoading(false);
    }
  }

  async function submitComment(post: Post) {
    const comment = commentTexts[post.postId]?.trim();
    if (!comment || !selectedId) return;

    setCommentStatus((s) => ({ ...s, [post.postId]: "loading" }));
    setCommentErrors((s) => ({ ...s, [post.postId]: "" }));

    try {
      const res = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl: post.url, postId: post.postId, comment, accountId: selectedId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.alreadyCommented) {
        setCommentStatus((s) => ({ ...s, [post.postId]: "duplicate" }));
      } else {
        setCommentStatus((s) => ({ ...s, [post.postId]: "done" }));
        setCommentedIds((prev) => new Set([...prev, post.postId]));
        setHistory((h) => [...h, { postId: post.postId, url: post.url, comment, commentedAt: new Date().toISOString() }]);
      }
    } catch (e: unknown) {
      setCommentErrors((s) => ({ ...s, [post.postId]: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" }));
      setCommentStatus((s) => ({ ...s, [post.postId]: "error" }));
    }
  }

  async function startChatSearch() {
    if (!keyword.trim() || !selectedId) return;
    setChatLoading(true);
    setChatError("");
    setChats([]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, accountId: selectedId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setChats(data.chats);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setChatLoading(false);
    }
  }

  function startAuto() {
    if (!selectedId || autoRunning) return;
    setAutoRunning(true);
    setAutoLog([]);
    setAutoStats(null);

    const es = new EventSource(`/api/auto?accountId=${selectedId}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "done") {
        setAutoStats({ commented: data.commented, skipped_keyword: data.skipped_keyword, skipped_duplicate: data.skipped_duplicate, errors: data.errors });
        setAutoRunning(false);
        es.close();
        // รีโหลด history
        fetch(`/api/history?accountId=${selectedId}`).then(r => r.json()).then((records: CommentRecord[]) => {
          setHistory(records);
          setCommentedIds(new Set(records.map((r) => r.postId)));
        });
      } else if (data.type === "fatal") {
        setAutoLog((l) => [...l, { type: "fatal", message: `❌ ${data.message}` }]);
        setAutoRunning(false);
        es.close();
      } else {
        setAutoLog((l) => [...l, data]);
      }
    };
    es.onerror = () => {
      setAutoLog((l) => [...l, { type: "error", message: "Connection ขาด" }]);
      setAutoRunning(false);
      es.close();
    };
  }

  async function clearHistory() {
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: selectedId }),
    });
    setHistory([]);
    setCommentedIds(new Set());
  }

  useEffect(() => {
    const es = new EventSource("/api/queue/stream");
    es.onopen = () => setQueueConnected(true);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "queue") setQueueItems(data.items);
    };
    es.onerror = () => setQueueConnected(false);
    return () => es.close();
  }, []);

  async function doQueueDone(item: QueueItem) {
    if (!window.confirm(`ยืนยัน: โพสต์นี้ "Done" แล้ว (ส่งข้อความแล้ว)?\n\n${item.post_url}`)) return;
    setQueueActionLoading((s) => ({ ...s, [item.id]: true }));
    try {
      await fetch(`/api/queue/${item.id}/done`, { method: "POST" });
      setQueueItems((prev) => prev.filter((q) => q.id !== item.id));
    } finally {
      setQueueActionLoading((s) => ({ ...s, [item.id]: false }));
    }
  }

  async function doQueueReject(item: QueueItem) {
    if (!window.confirm(`ยืนยัน: Reject โพสต์นี้?\n\n${item.post_url}`)) return;
    setQueueActionLoading((s) => ({ ...s, [item.id]: true }));
    try {
      await fetch(`/api/queue/${item.id}/reject`, { method: "POST" });
      setQueueItems((prev) => prev.filter((q) => q.id !== item.id));
    } finally {
      setQueueActionLoading((s) => ({ ...s, [item.id]: false }));
    }
  }

  async function searchGroups() {
    if (!groupQuery.trim() || !selectedId) return;
    setGroupSearchLoading(true);
    setGroupSearchError("");
    setGroupResults([]);
    try {
      const res = await fetch("/api/groups/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: groupQuery, accountId: selectedId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGroupResults(data.groups);
    } catch (e: unknown) {
      setGroupSearchError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setGroupSearchLoading(false);
    }
  }

  async function doJoinGroup(group: GroupSearchResult) {
    setGroupJoinLoading((s) => ({ ...s, [group.url]: true }));
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupUrl: group.url, groupName: group.name, accountId: selectedId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setGroupJoinStatus((s) => ({ ...s, [group.url]: data.status }));
      // refresh history
      fetch("/api/groups/history")
        .then((r) => r.json())
        .then((d) => setGroupHistory(d.records ?? []));
    } catch (e: unknown) {
      setGroupJoinStatus((s) => ({ ...s, [group.url]: "error" }));
      alert(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setGroupJoinLoading((s) => ({ ...s, [group.url]: false }));
    }
  }

  const selectedAccount = accounts.find((a) => a.id === selectedId);

  return (
    <div>
      <div className="mb-4 p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg text-yellow-300 text-sm">
        ⚠️ การใช้งานนี้ขัดต่อ Facebook Terms of Service — ใช้บนความเสี่ยงของตัวเองเท่านั้น
      </div>

      {/* Account selector */}
      <div className="mb-5 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <label className="text-xs text-gray-400 block mb-2">เลือกบัญชีที่ต้องการใช้</label>
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-500">ยังไม่มีบัญชี — <a href="/settings" className="text-blue-400 underline">ไปเพิ่มที่ Settings</a></p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {accounts.map((acc) => (
              <button key={acc.id} onClick={() => setSelectedId(acc.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${selectedId === acc.id ? "bg-blue-600 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"}`}>
                👤 {acc.label}
                <span className="ml-2 text-xs opacity-60">{acc.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["accounts", "feed", "chat", "groups", "auto", "history", "queue"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {tab === "accounts" ? `👥 บัญชี (${accounts.length})` :
             tab === "feed" ? "🔄 Scroll Feed" :
             tab === "chat" ? "💬 ค้นหาแชท" :
             tab === "groups" ? "🔍 ขอเข้ากลุ่ม" :
             tab === "auto" ? "🤖 Auto Comment" :
             tab === "history" ? `📋 ประวัติ (${history.length})` :
             <span className="flex items-center gap-1.5">
               📬 Review Queue
               {queueItems.length > 0 && (
                 <span className="bg-yellow-500 text-black text-xs font-bold px-1.5 py-0.5 rounded-full leading-none">
                   {queueItems.length}
                 </span>
               )}
               {!queueConnected && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" title="SSE ขาด" />}
             </span>
            }
          </button>
        ))}
      </div>

      {/* Accounts tab */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">บัญชีทั้งหมด {accounts.length} รายการ</p>
            <a href="/settings" className="text-xs text-blue-400 border border-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-900/30 transition">
              + เพิ่มบัญชีใหม่
            </a>
          </div>

          {accounts.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
              ยังไม่มีบัญชี — <a href="/settings" className="text-blue-400 underline">ไปเพิ่มที่ Settings</a>
            </div>
          )}

          {accounts.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-gray-400 text-xs">
                    <th className="px-4 py-3 text-left font-medium">ชื่อ</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Password</th>
                    <th className="px-4 py-3 text-left font-medium">Session</th>
                    <th className="px-4 py-3 text-left font-medium">Login ล่าสุด</th>
                    <th className="px-4 py-3 text-left font-medium">UID</th>
                    <th className="px-4 py-3 text-left font-medium">Profile</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc, idx) => {
                    const sess = sessions[acc.id] ?? { exists: false, savedAt: null };
                    const status = accLoginStatus[acc.id] ?? "idle";
                    const showPw = showPasswords[acc.id] ?? false;
                    return (
                      <tr key={acc.id} className={`border-t border-gray-800 ${idx % 2 === 0 ? "bg-gray-950" : "bg-gray-900"}`}>
                        {/* ชื่อ */}
                        <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{acc.label}</td>

                        {/* Email */}
                        <td className="px-4 py-3 text-gray-300 max-w-[160px]">
                          <span className="truncate block" title={acc.email}>{acc.email}</span>
                        </td>

                        {/* Password */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-gray-300">
                              {showPw ? acc.password : "••••••••"}
                            </span>
                            <button
                              onClick={() => setShowPasswords((s) => ({ ...s, [acc.id]: !showPw }))}
                              className="text-gray-600 hover:text-gray-300 text-xs ml-1"
                              title={showPw ? "ซ่อน" : "แสดง"}
                            >
                              {showPw ? "🙈" : "👁"}
                            </button>
                          </div>
                        </td>

                        {/* Session */}
                        <td className="px-4 py-3">
                          {sess.exists ? (
                            <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full whitespace-nowrap">✅ Login อยู่</span>
                          ) : (
                            <span className="text-xs bg-red-900/50 text-red-400 border border-red-800 px-2 py-0.5 rounded-full whitespace-nowrap">❌ หมดอายุ</span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {sess.savedAt ? new Date(sess.savedAt).toLocaleString("th-TH") : "—"}
                        </td>

                        {/* UID */}
                        <td className="px-4 py-3 text-xs font-mono text-gray-400">
                          {acc.uid ? (
                            <span title={acc.uid}>{acc.uid.length > 16 ? acc.uid.slice(0, 16) + "…" : acc.uid}</span>
                          ) : "—"}
                        </td>

                        {/* Profile URL */}
                        <td className="px-4 py-3">
                          {acc.profile_url ? (
                            <a href={acc.profile_url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline whitespace-nowrap">
                              🔗 ดูโปรไฟล์
                            </a>
                          ) : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => doAccLogin(acc.id, false)}
                              disabled={status === "loading"}
                              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded-lg transition whitespace-nowrap"
                            >
                              {status === "loading" ? "⏳" : sess.exists ? "🔄 รีเฟรช" : "🔑 Auto Login"}
                            </button>
                            <button
                              onClick={() => doAccLogin(acc.id, true)}
                              disabled={status === "loading"}
                              title="เปิด Browser ให้ Login เอง (รองรับ 2FA)"
                              className="text-xs bg-purple-700 hover:bg-purple-600 disabled:opacity-50 px-3 py-1 rounded-lg transition whitespace-nowrap"
                            >
                              {status === "loading" ? "⏳" : "🖥 Manual Login"}
                            </button>
                            {sess.exists && (
                              <button
                                onClick={() => doAccClearSession(acc.id)}
                                className="text-xs text-red-400 border border-red-800 px-2 py-1 rounded-lg hover:bg-red-900/30 transition whitespace-nowrap"
                              >
                                ล้าง
                              </button>
                            )}
                            <button
                              onClick={() => doAccDelete(acc.id)}
                              className="text-xs text-gray-600 hover:text-red-400 transition"
                              title="ลบบัญชี"
                            >
                              🗑
                            </button>
                          </div>
                          {accLoginErrors[acc.id] && (
                            <p className="text-red-400 text-xs mt-1">{accLoginErrors[acc.id]}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Feed tab */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="font-semibold text-lg mb-1">Scroll News Feed</h2>
            <p className="text-gray-400 text-sm mb-4">{selectedAccount ? `บัญชี: ${selectedAccount.label}` : "กรุณาเลือกบัญชีก่อน"}</p>
            <button onClick={startScroll} disabled={feedLoading || !selectedId}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-medium transition">
              {feedLoading ? "⏳ กำลัง Scroll..." : "▶ เริ่ม Scroll"}
            </button>
            {feedError && <p className="mt-3 text-red-400 text-sm">❌ {feedError}</p>}
          </div>

          {posts.length > 0 && (
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">พบ {posts.length} โพสต์</p>
              {posts.map((p) => {
                const alreadyDone = commentedIds.has(p.postId);
                const status = commentStatus[p.postId] ?? "idle";
                return (
                  <div key={p.postId} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-gray-200 leading-relaxed">{p.text}</p>
                      {alreadyDone && (
                        <span className="shrink-0 text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">
                          ✅ คอมเม้นแล้ว
                        </span>
                      )}
                      {status === "duplicate" && !alreadyDone && (
                        <span className="shrink-0 text-xs bg-yellow-900/50 text-yellow-400 border border-yellow-700 px-2 py-0.5 rounded-full">
                          ⚠️ คอมเม้นซ้ำ
                        </span>
                      )}
                    </div>

                    {!alreadyDone && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentTexts[p.postId] ?? ""}
                          onChange={(e) => setCommentTexts((s) => ({ ...s, [p.postId]: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && submitComment(p)}
                          placeholder="พิมพ์คอมเม้น..."
                          disabled={status === "loading" || status === "done"}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 disabled:opacity-50"
                        />
                        <button
                          onClick={() => submitComment(p)}
                          disabled={status === "loading" || status === "done" || !commentTexts[p.postId]?.trim()}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-1.5 rounded-lg text-sm font-medium transition"
                        >
                          {status === "loading" ? "⏳" : status === "done" ? "✅" : "ส่ง"}
                        </button>
                      </div>
                    )}
                    {commentErrors[p.postId] && (
                      <p className="text-red-400 text-xs">❌ {commentErrors[p.postId]}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Chat tab */}
      {activeTab === "chat" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h2 className="font-semibold text-lg mb-1">ค้นหาแชทตาม Keyword</h2>
            <p className="text-gray-400 text-sm mb-4">{selectedAccount ? `บัญชี: ${selectedAccount.label}` : "กรุณาเลือกบัญชีก่อน"}</p>
            <div className="flex gap-3">
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startChatSearch()}
                placeholder="พิมพ์ keyword เช่น สนใจ, ราคา..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
              <button onClick={startChatSearch} disabled={chatLoading || !keyword.trim() || !selectedId}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-5 py-2 rounded-lg text-sm font-medium transition">
                {chatLoading ? "⏳ ค้นหา..." : "🔍 ค้นหา"}
              </button>
            </div>
            {chatError && <p className="mt-3 text-red-400 text-sm">❌ {chatError}</p>}
          </div>

          {chats.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">พบ {chats.length} การสนทนา</p>
              {chats.map((c, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-700 flex items-center justify-center text-sm font-bold shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.name}</p>
                    {c.preview && <p className="text-gray-400 text-xs mt-0.5">{c.preview}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auto tab */}
      {activeTab === "auto" && (
        <div className="space-y-4">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
            <h2 className="font-semibold text-lg">🤖 Auto Comment</h2>
            <p className="text-gray-400 text-sm">
              Bot จะ scroll feed → หาโพสต์ที่มี keyword ที่ตั้งไว้ → คอมเม้นอัตโนมัติด้วยข้อความใน Settings
            </p>
            <p className="text-gray-400 text-sm">
              บัญชี: <span className="text-white">{selectedAccount?.label ?? "—"}</span>
            </p>
            <button
              onClick={startAuto}
              disabled={autoRunning || !selectedId}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg text-sm font-semibold transition"
            >
              {autoRunning ? "⏳ กำลังทำงาน..." : "▶ เริ่ม Auto Comment"}
            </button>
          </div>

          {/* Stats */}
          {autoStats && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "คอมเม้นสำเร็จ", value: autoStats.commented, color: "text-green-400" },
                { label: "ข้ามซ้ำ", value: autoStats.skipped_duplicate, color: "text-yellow-400" },
                { label: "ไม่ตรง keyword", value: autoStats.skipped_keyword, color: "text-gray-400" },
                { label: "Error", value: autoStats.errors, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Live log */}
          {autoLog.length > 0 && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1 max-h-96 overflow-y-auto font-mono">
              {autoLog.map((entry, i) => (
                <p key={i} className={`text-xs ${
                  entry.type === "success" ? "text-green-400" :
                  entry.type === "found" ? "text-blue-400" :
                  entry.type === "error" || entry.type === "fatal" ? "text-red-400" :
                  entry.type === "skip" ? "text-yellow-500" :
                  entry.type === "commenting" ? "text-purple-400" :
                  "text-gray-400"
                }`}>
                  {entry.message}
                </p>
              ))}
              {autoRunning && <p className="text-xs text-gray-600 animate-pulse">กำลังทำงาน...</p>}
            </div>
          )}
        </div>
      )}

      {/* Groups tab */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          {/* Search box */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
            <h2 className="font-semibold text-lg">🔍 ขอเข้ากลุ่ม Facebook</h2>
            <p className="text-gray-400 text-sm">
              บัญชี: <span className="text-white">{selectedAccount?.label ?? "กรุณาเลือกบัญชีก่อน"}</span>
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={groupQuery}
                onChange={(e) => setGroupQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchGroups()}
                placeholder="ชื่อกลุ่มที่ต้องการค้นหา เช่น สวนผัก, เติมเกม..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
              />
              <button
                onClick={searchGroups}
                disabled={groupSearchLoading || !groupQuery.trim() || !selectedId}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
              >
                {groupSearchLoading ? "⏳ ค้นหา..." : "🔍 ค้นหา"}
              </button>
            </div>
            {groupSearchError && <p className="text-red-400 text-sm">❌ {groupSearchError}</p>}
          </div>

          {/* Results block — always visible, content changes by state */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {/* Loading */}
            {groupSearchLoading && (
              <div className="p-8 text-center text-gray-400 text-sm">
                <p className="animate-pulse">⏳ กำลังค้นหากลุ่ม...</p>
              </div>
            )}

            {/* Empty — no search yet */}
            {!groupSearchLoading && groupResults.length === 0 && !groupSearchError && (
              <div className="p-8 text-center text-gray-500 text-sm">
                พิมพ์ชื่อกลุ่มที่ต้องการค้นหาแล้วกดปุ่ม ค้นหา
              </div>
            )}

            {/* No results after search */}
            {!groupSearchLoading && groupResults.length === 0 && groupSearchError === "" && groupQuery && (
              <div className="p-8 text-center text-gray-500 text-sm" />
            )}

            {/* Results list */}
            {!groupSearchLoading && groupResults.length > 0 && (
              <>
                <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-xs text-gray-400">พบ <span className="text-white font-medium">{groupResults.length}</span> กลุ่มที่ใกล้เคียง</p>
                </div>
                {groupResults.map((g, i) => {
                  const joined = groupJoinStatus[g.url];
                  const loading = groupJoinLoading[g.url] ?? false;
                  const alreadyInHistory = groupHistory.some((h) => h.group_url === g.url);
                  return (
                    <div
                      key={g.url}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition ${i > 0 ? "border-t border-gray-800" : ""}`}
                    >
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center text-base shrink-0 select-none">
                        👥
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{g.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {g.privacy && (
                            <span className="text-xs text-gray-500">
                              {g.privacy === "public" ? "🌐 สาธารณะ" : "🔒 ส่วนตัว"}
                            </span>
                          )}
                          {g.memberCount && (
                            <span className="text-xs text-gray-500">· {g.memberCount} สมาชิก</span>
                          )}
                          {alreadyInHistory && !joined && (
                            <span className="text-xs text-yellow-600">· เคยขอแล้ว</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={g.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-blue-400 transition text-sm"
                          title="ดูกลุ่ม"
                        >
                          🔗
                        </a>
                        {joined ? (
                          <span className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap ${
                            joined === "request_sent" ? "bg-yellow-900/50 text-yellow-400 border border-yellow-700" :
                            joined === "joined"       ? "bg-green-900/50  text-green-400  border border-green-700"  :
                            joined === "already_member" ? "bg-blue-900/50 text-blue-400   border border-blue-700"   :
                                                          "bg-red-900/50   text-red-400    border border-red-700"
                          }`}>
                            {joined === "request_sent"   ? "⏳ รอ Approve" :
                             joined === "joined"         ? "✅ เข้าร่วมแล้ว" :
                             joined === "already_member" ? "✓ เป็นสมาชิกอยู่แล้ว" :
                                                          "❌ ไม่สำเร็จ"}
                          </span>
                        ) : (
                          <button
                            onClick={() => doJoinGroup(g)}
                            disabled={loading || !selectedId}
                            className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg font-medium transition whitespace-nowrap"
                          >
                            {loading ? "⏳" : "ขอเข้าร่วม"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Join history */}
          {groupHistory.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium px-1">ประวัติการขอเข้ากลุ่ม ({groupHistory.length} รายการ)</p>
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {groupHistory.slice(0, 20).map((r, i) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-gray-800" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{r.group_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{new Date(r.requested_at).toLocaleString("th-TH")}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${
                      r.status === "request_sent"   ? "bg-yellow-900/40 text-yellow-400 border-yellow-800" :
                      r.status === "joined"         ? "bg-green-900/40  text-green-400  border-green-800"  :
                      r.status === "already_member" ? "bg-blue-900/40   text-blue-400   border-blue-800"   :
                                                      "bg-red-900/40    text-red-400    border-red-800"
                    }`}>
                      {r.status === "request_sent"   ? "รอ Approve" :
                       r.status === "joined"         ? "เข้าร่วมแล้ว" :
                       r.status === "already_member" ? "เป็นสมาชิกอยู่แล้ว" :
                       r.status}
                    </span>
                    <a
                      href={r.group_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-blue-400 transition text-sm shrink-0"
                    >
                      🔗
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">คอมเม้นทั้งหมด {history.length} รายการ</p>
            {history.length > 0 && (
              <button onClick={clearHistory}
                className="text-xs text-red-400 border border-red-800 px-3 py-1.5 rounded-lg hover:bg-red-900/30 transition">
                🗑 ล้างประวัติ
              </button>
            )}
          </div>

          {history.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
              ยังไม่มีประวัติคอมเม้น
            </div>
          )}

          {history.map((r, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{new Date(r.commentedAt).toLocaleString("th-TH")}</span>
                <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full">✅ คอมเม้นแล้ว</span>
              </div>
              <p className="text-sm text-gray-200">💬 {r.comment}</p>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline break-all">
                  {r.url}
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Queue tab */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">รอ Review {queueItems.length} รายการ</p>
              <span className={`w-2 h-2 rounded-full ${queueConnected ? "bg-green-500" : "bg-red-500"}`} title={queueConnected ? "SSE เชื่อมต่ออยู่" : "SSE ขาด"} />
            </div>
            <p className="text-xs text-gray-600">อัปเดตอัตโนมัติทุก 3 วินาที</p>
          </div>

          {queueItems.length === 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500 text-sm">
              ไม่มีโพสต์รอ Review — รันงานสแกนผ่าน CLI ก่อน
            </div>
          )}

          {queueItems.map((item) => {
            const loading = queueActionLoading[item.id] ?? false;
            return (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {item.author_name && (
                      <p className="text-xs text-blue-400 font-medium mb-1">👤 {item.author_name}</p>
                    )}
                    <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString("th-TH")}</p>
                  </div>
                  <span className="shrink-0 text-xs bg-yellow-900/40 text-yellow-400 border border-yellow-800 px-2 py-0.5 rounded-full">
                    รอ Review
                  </span>
                </div>

                {/* Post text */}
                {item.post_text && (
                  <p className="text-sm text-gray-200 leading-relaxed line-clamp-3 bg-gray-950 rounded-lg p-3">
                    {item.post_text}
                  </p>
                )}

                {/* Message to send */}
                {item.message_text && (
                  <div className="flex items-start gap-2 bg-blue-950/30 border border-blue-900/50 rounded-lg p-3">
                    <span className="text-xs text-blue-400 shrink-0 font-medium">💬 ข้อความ:</span>
                    <p className="text-xs text-blue-200">{item.message_text}</p>
                  </div>
                )}

                {/* Post URL */}
                <a href={item.post_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-blue-400 hover:underline break-all block transition">
                  🔗 {item.post_url}
                </a>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <a href={item.post_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs border border-gray-700 text-gray-400 hover:bg-gray-800 px-3 py-1.5 rounded-lg transition">
                    👁 ดูโพสต์
                  </a>
                  <button
                    onClick={() => doQueueDone(item)}
                    disabled={loading}
                    className="text-xs bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg font-medium transition"
                  >
                    {loading ? "⏳" : "✅ Done"}
                  </button>
                  <button
                    onClick={() => doQueueReject(item)}
                    disabled={loading}
                    className="text-xs bg-red-900/60 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-red-300 border border-red-800 px-4 py-1.5 rounded-lg font-medium transition"
                  >
                    {loading ? "⏳" : "❌ Reject"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
