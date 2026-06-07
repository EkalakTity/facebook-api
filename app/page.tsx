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
type Phase1Type = "scroll_feed" | "search_posts" | "search_groups" | "direct_url";
type Phase2Type = "comment" | "join_group" | "like";
interface PipelineJob {
  id: string;
  name: string;
  accountId: string;
  phase1: { type: Phase1Type; query?: string; url?: string; criteria?: string[] };
  phase2: { type: Phase2Type; text?: string; criteriaId?: number };
  enabled: boolean;
  intervalHours: number;
  lastRunAt?: string;
}
interface CommentCriteria { id: number; name: string; comment_count: number }
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
  const [activeTab, setActiveTab] = useState<"accounts" | "feed" | "chat" | "groups" | "auto" | "search-comment" | "history" | "queue">("accounts");

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
  const [groupJoinLoading, setGroupJoinLoading] = useState<Record<string, boolean>>({}); // per groupUrl
  const [groupJoinStatus, setGroupJoinStatus] = useState<Record<string, Record<string, string>>>({}); // groupUrl → accountId → status
  const [groupSelectedAccounts, setGroupSelectedAccounts] = useState<Set<string>>(new Set());
  const [groupHistory, setGroupHistory] = useState<GroupJoinRecord[]>([]);

  // Join by URL state
  const [directUrl, setDirectUrl] = useState("");
  const [directJoinLoading, setDirectJoinLoading] = useState(false);
  const [directJoinStatus, setDirectJoinStatus] = useState<Record<string, string>>({}); // accountId → status
  const [directJoinError, setDirectJoinError] = useState("");

  // Queue tab state
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueConnected, setQueueConnected] = useState(false);
  const [queueActionLoading, setQueueActionLoading] = useState<Record<number, boolean>>({});

  // Auto tab state
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoLog, setAutoLog] = useState<LogEntry[]>([]);
  const [autoStats, setAutoStats] = useState<{ commented: number; skipped_keyword: number; skipped_duplicate: number; errors: number } | null>(null);

  // Comment criteria for random comment
  const [commentCriteria, setCommentCriteria] = useState<CommentCriteria[]>([]);
  const [pbCriteriaId, setPbCriteriaId] = useState<number | null>(null);
  const [pbCommentMode, setPbCommentMode] = useState<"text" | "criteria">("text");

  // Pipeline builder state
  const [pbAccountId, setPbAccountId] = useState("");
  const [pbName, setPbName] = useState("");
  const [pbPhase1, setPbPhase1] = useState<Phase1Type>("search_posts");
  const [pbQuery, setPbQuery] = useState("");
  const [pbUrl, setPbUrl] = useState("");
  const [pbCriteria, setPbCriteria] = useState("");
  const [pbPhase2, setPbPhase2] = useState<Phase2Type>("comment");
  const [pbText, setPbText] = useState("");
  const [pbInterval, setPbInterval] = useState(1);
  const [pbRunning, setPbRunning] = useState(false);
  const [pbLog, setPbLog] = useState<LogEntry[]>([]);
  const [pbStats, setPbStats] = useState<{ commented: number; skipped_keyword: number; skipped_duplicate: number; errors: number } | null>(null);

  // Scheduled pipeline jobs
  const [scJobs, setScJobs] = useState<PipelineJob[]>([]);
  const [scJobRunning, setScJobRunning] = useState<Record<string, boolean>>({});
  const [scJobLog, setScJobLog] = useState<Record<string, LogEntry[]>>({});
  const [scSaving, setScSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(async (data) => {
        const accs: Account[] = data.accounts ?? [];
        setAccounts(accs);
        if (accs.length > 0) { setSelectedId(accs[0].id); setPbAccountId(accs[0].id); }
        setGroupSelectedAccounts(new Set(accs.map((a) => a.id)));
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
    // load scheduled jobs
    fetch("/api/jobs")
      .then((r) => r.json())
      .then((data) => setScJobs(data.jobs ?? []));
    // load comment criteria
    fetch("/api/comment-criteria")
      .then((r) => r.json())
      .then((data) => setCommentCriteria(data.criteria ?? []));
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
    const targets = accounts.filter((a) => groupSelectedAccounts.has(a.id));
    if (targets.length === 0) return;

    setGroupJoinLoading((s) => ({ ...s, [group.url]: true }));

    for (const acc of targets) {
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupUrl: group.url, groupName: group.name, accountId: acc.id }),
        });
        const data = await res.json();
        const status = data.success ? data.status : "error";
        setGroupJoinStatus((s) => ({
          ...s,
          [group.url]: { ...(s[group.url] ?? {}), [acc.id]: status },
        }));
      } catch {
        setGroupJoinStatus((s) => ({
          ...s,
          [group.url]: { ...(s[group.url] ?? {}), [acc.id]: "error" },
        }));
      }
    }

    setGroupJoinLoading((s) => ({ ...s, [group.url]: false }));
    fetch("/api/groups/history").then((r) => r.json()).then((d) => setGroupHistory(d.records ?? []));
  }

  function buildPipelineJob(): PipelineJob | null {
    if (!pbAccountId) return null;
    const criteria = pbCriteria.split(",").map((s) => s.trim()).filter(Boolean);
    let phase1: PipelineJob["phase1"];
    if (pbPhase1 === "scroll_feed") phase1 = { type: "scroll_feed", criteria };
    else if (pbPhase1 === "search_posts") { if (!pbQuery.trim()) return null; phase1 = { type: "search_posts", query: pbQuery.trim(), criteria }; }
    else if (pbPhase1 === "search_groups") { if (!pbQuery.trim()) return null; phase1 = { type: "search_groups", query: pbQuery.trim() }; }
    else { if (!pbUrl.trim()) return null; phase1 = { type: "direct_url", url: pbUrl.trim(), criteria }; }

    let phase2: PipelineJob["phase2"];
    if (pbPhase2 === "comment") {
      if (pbCommentMode === "criteria") {
        if (!pbCriteriaId) return null;
        phase2 = { type: "comment", text: "", criteriaId: pbCriteriaId };
      } else {
        if (!pbText.trim()) return null;
        phase2 = { type: "comment", text: pbText.trim() };
      }
    } else if (pbPhase2 === "join_group") phase2 = { type: "join_group" };
    else phase2 = { type: "like" };

    return { id: "", name: pbName.trim() || `${pbPhase1} → ${pbPhase2}`, accountId: pbAccountId, phase1, phase2, enabled: true, intervalHours: pbInterval };
  }

  function startPipelineRun() {
    const job = buildPipelineJob();
    if (!job || pbRunning) return;
    setPbRunning(true);
    setPbLog([]);
    setPbStats(null);

    const encoded = btoa(JSON.stringify(job));
    const es = new EventSource(`/api/pipeline/run?job=${encoded}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "done") {
        setPbStats({ commented: data.commented, skipped_keyword: data.skipped_keyword, skipped_duplicate: data.skipped_duplicate, errors: data.errors });
        setPbRunning(false);
        es.close();
        fetch(`/api/history?accountId=${selectedId}`).then(r => r.json()).then((records: CommentRecord[]) => {
          setHistory(records);
          setCommentedIds(new Set(records.map((r) => r.postId)));
        });
      } else if (data.type === "fatal") {
        setPbLog((l) => [...l, { type: "fatal", message: `❌ ${data.message}` }]);
        setPbRunning(false);
        es.close();
      } else {
        setPbLog((l) => [...l, data]);
      }
    };
    es.onerror = () => { setPbLog((l) => [...l, { type: "error", message: "Connection ขาด" }]); setPbRunning(false); es.close(); };
  }

  async function saveScJob() {
    const job = buildPipelineJob();
    if (!job) return;
    setScSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...job, intervalHours: pbInterval }),
      });
      const data = await res.json();
      setScJobs(data.jobs ?? []);
    } finally {
      setScSaving(false);
    }
  }

  async function toggleScJob(job: PipelineJob) {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: job.id, enabled: !job.enabled }),
    });
    const data = await res.json();
    setScJobs(data.jobs ?? []);
  }

  async function deleteScJob(id: string) {
    const res = await fetch(`/api/jobs?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    setScJobs(data.jobs ?? []);
  }

  function runScJobNow(job: PipelineJob) {
    if (scJobRunning[job.id]) return;
    setScJobRunning((s) => ({ ...s, [job.id]: true }));
    setScJobLog((s) => ({ ...s, [job.id]: [] }));

    const es = new EventSource(`/api/jobs/run?id=${job.id}`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "done" || data.type === "fatal") {
        setScJobRunning((s) => ({ ...s, [job.id]: false }));
        es.close();
        // refresh lastRunAt
        fetch("/api/jobs").then((r) => r.json()).then((d) => setScJobs(d.jobs ?? []));
      }
      setScJobLog((s) => ({ ...s, [job.id]: [...(s[job.id] ?? []), data] }));
    };
    es.onerror = () => {
      setScJobRunning((s) => ({ ...s, [job.id]: false }));
      es.close();
    };
  }

  async function doJoinByUrl() {
    const url = directUrl.trim();
    if (!url) return;
    const targets = accounts.filter((a) => groupSelectedAccounts.has(a.id));
    if (targets.length === 0) return;

    setDirectJoinLoading(true);
    setDirectJoinStatus({});
    setDirectJoinError("");

    for (const acc of targets) {
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupUrl: url, groupName: url, accountId: acc.id }),
        });
        const data = await res.json();
        const status = data.success ? data.status : (data.error ?? "error");
        setDirectJoinStatus((s) => ({ ...s, [acc.id]: status }));
      } catch {
        setDirectJoinStatus((s) => ({ ...s, [acc.id]: "error" }));
      }
    }

    setDirectJoinLoading(false);
    fetch("/api/groups/history").then((r) => r.json()).then((d) => setGroupHistory(d.records ?? []));
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
        {(["accounts", "feed", "chat", "groups", "auto", "search-comment", "history", "queue"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
            {tab === "accounts" ? `👥 บัญชี (${accounts.length})` :
             tab === "feed" ? "🔄 Scroll Feed" :
             tab === "chat" ? "💬 ค้นหาแชท" :
             tab === "groups" ? "🔍 ขอเข้ากลุ่ม" :
             tab === "auto" ? "🤖 Auto Comment" :
             tab === "search-comment" ? "🔍💬 ค้นหา & คอมเม้น" :
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

          {/* Join by URL */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
            <h3 className="font-semibold text-sm text-gray-200">🔗 เข้ากลุ่มด้วย URL โดยตรง</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={directUrl}
                onChange={(e) => { setDirectUrl(e.target.value); setDirectJoinStatus({}); setDirectJoinError(""); }}
                onKeyDown={(e) => e.key === "Enter" && doJoinByUrl()}
                placeholder="https://www.facebook.com/groups/..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 font-mono"
              />
              <button
                onClick={doJoinByUrl}
                disabled={directJoinLoading || !directUrl.trim() || groupSelectedAccounts.size === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap"
              >
                {directJoinLoading ? "⏳ กำลัง Join..." : "ขอเข้าร่วม"}
              </button>
            </div>
            {directJoinError && <p className="text-red-400 text-sm">❌ {directJoinError}</p>}
            {Object.keys(directJoinStatus).length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {accounts.filter((a) => directJoinStatus[a.id]).map((acc) => {
                  const s = directJoinStatus[acc.id];
                  const cls =
                    s === "request_sent"   ? "bg-yellow-900/50 text-yellow-400 border-yellow-700" :
                    s === "joined"         ? "bg-green-900/50  text-green-400  border-green-700"  :
                    s === "already_member" ? "bg-blue-900/50   text-blue-400   border-blue-700"   :
                                            "bg-red-900/50    text-red-400    border-red-700";
                  const label =
                    s === "request_sent"   ? "รอ Approve" :
                    s === "joined"         ? "เข้าร่วมแล้ว" :
                    s === "already_member" ? "เป็นสมาชิกอยู่แล้ว" : s;
                  return (
                    <span key={acc.id} className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>
                      👤 {acc.label}: {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account selector — shown when 2+ accounts exist */}
          {accounts.length > 1 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-400">เลือกบัญชีที่จะใช้ Join กลุ่ม</p>
              <div className="flex flex-wrap gap-2">
                {accounts.map((acc) => {
                  const checked = groupSelectedAccounts.has(acc.id);
                  return (
                    <button
                      key={acc.id}
                      onClick={() =>
                        setGroupSelectedAccounts((prev) => {
                          const next = new Set(prev);
                          if (checked) next.delete(acc.id); else next.add(acc.id);
                          return next;
                        })
                      }
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition ${
                        checked
                          ? "bg-blue-900/50 border-blue-600 text-blue-300"
                          : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-xs shrink-0 ${
                        checked ? "bg-blue-500 border-blue-500 text-white" : "border-gray-600"
                      }`}>
                        {checked ? "✓" : ""}
                      </span>
                      👤 {acc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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
                  const statusMap = groupJoinStatus[g.url] ?? {};
                  const loading = groupJoinLoading[g.url] ?? false;
                  const alreadyInHistory = groupHistory.some((h) => h.group_url === g.url);
                  const selectedAccList = accounts.filter((a) => groupSelectedAccounts.has(a.id));
                  const completedAccs = selectedAccList.filter((a) => statusMap[a.id]);
                  const allDone = selectedAccList.length > 0 && completedAccs.length === selectedAccList.length;

                  function statusBadge(s: string) {
                    const cls =
                      s === "request_sent"   ? "bg-yellow-900/50 text-yellow-400 border-yellow-700" :
                      s === "joined"         ? "bg-green-900/50  text-green-400  border-green-700"  :
                      s === "already_member" ? "bg-blue-900/50   text-blue-400   border-blue-700"   :
                                              "bg-red-900/50    text-red-400    border-red-700";
                    const label =
                      s === "request_sent"   ? "รอ Approve" :
                      s === "joined"         ? "เข้าร่วมแล้ว" :
                      s === "already_member" ? "เป็นสมาชิกอยู่แล้ว" : "ไม่สำเร็จ";
                    return { cls, label };
                  }

                  return (
                    <div
                      key={g.url}
                      className={`px-4 py-3 hover:bg-gray-800/50 transition ${i > 0 ? "border-t border-gray-800" : ""}`}
                    >
                      <div className="flex items-center gap-3">
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
                            {alreadyInHistory && completedAccs.length === 0 && (
                              <span className="text-xs text-yellow-600">· เคยขอแล้ว</span>
                            )}
                          </div>
                        </div>

                        {/* Action */}
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
                          {loading ? (
                            <span className="text-xs text-gray-400 animate-pulse whitespace-nowrap">⏳ กำลัง Join...</span>
                          ) : allDone ? (
                            <span className="text-xs text-gray-500 whitespace-nowrap">✓ เสร็จแล้ว</span>
                          ) : (
                            <button
                              onClick={() => doJoinGroup(g)}
                              disabled={groupSelectedAccounts.size === 0}
                              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg font-medium transition whitespace-nowrap"
                            >
                              ขอเข้าร่วม{groupSelectedAccounts.size > 1 ? ` (${groupSelectedAccounts.size})` : ""}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Per-account status — shown after joining */}
                      {completedAccs.length > 0 && (
                        <div className="mt-2 ml-12 flex flex-wrap gap-1.5">
                          {completedAccs.map((acc) => {
                            const { cls, label } = statusBadge(statusMap[acc.id]);
                            return (
                              <span key={acc.id} className={`text-xs px-2 py-0.5 rounded-full border ${cls}`}>
                                👤 {acc.label}: {label}
                              </span>
                            );
                          })}
                        </div>
                      )}
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

      {/* Pipeline Jobs tab */}
      {activeTab === "search-comment" && (
        <div className="space-y-4">

          {/* Builder */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-5">
            <h2 className="font-semibold text-lg">⚙️ สร้าง Pipeline Job</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">ชื่อ Job (ไม่บังคับ)</label>
                <input type="text" value={pbName} onChange={(e) => setPbName(e.target.value)}
                  placeholder="เช่น หาคนขายบ้าน แล้วคอมเม้น"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">บัญชีที่ใช้ *</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-gray-500 mt-2">ยังไม่มีบัญชี — <a href="/settings" className="text-blue-400 underline">เพิ่มที่ Settings</a></p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((acc) => (
                      <button key={acc.id} onClick={() => setPbAccountId(acc.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition ${
                          pbAccountId === acc.id
                            ? "bg-blue-600 border-blue-500 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${pbAccountId === acc.id ? "bg-white" : "bg-gray-600"}`} />
                        {acc.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Phase 1 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Phase 1 — หาเป้าหมาย</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { value: "scroll_feed",   label: "📜 Scroll Feed",   desc: "scroll หน้า feed ปกติ" },
                  { value: "search_posts",  label: "🔍 Search Posts",  desc: "ค้นหาโพสต์ด้วย query" },
                  { value: "search_groups", label: "👥 Search Groups", desc: "ค้นหากลุ่มด้วย query" },
                  { value: "direct_url",    label: "🔗 Direct URL",    desc: "ระบุ URL กลุ่ม/เพจ" },
                ] as { value: Phase1Type; label: string; desc: string }[]).map((opt) => (
                  <button key={opt.value} onClick={() => setPbPhase1(opt.value)}
                    className={`p-3 rounded-lg border text-left transition ${pbPhase1 === opt.value ? "bg-blue-900/50 border-blue-500 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {(pbPhase1 === "search_posts" || pbPhase1 === "search_groups") && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Search Query *</label>
                  <input type="text" value={pbQuery} onChange={(e) => setPbQuery(e.target.value)}
                    placeholder={pbPhase1 === "search_groups" ? "เช่น ขายบ้าน, เติมเกม..." : "เช่น รับสมัครงาน, ขายที่ดิน..."}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
                </div>
              )}
              {pbPhase1 === "direct_url" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">URL *</label>
                  <input type="text" value={pbUrl} onChange={(e) => setPbUrl(e.target.value)}
                    placeholder="https://www.facebook.com/groups/..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 placeholder-gray-500" />
                </div>
              )}
              {pbPhase1 !== "search_groups" && (
                <div>
                  <label className="text-xs text-gray-400 block mb-1">
                    Criteria Keywords — คั่นด้วยจุลภาค
                    <span className="text-gray-600 ml-1">(ว่าง = ทุกโพสต์)</span>
                  </label>
                  <input type="text" value={pbCriteria} onChange={(e) => setPbCriteria(e.target.value)}
                    placeholder="เช่น ราคา, สนใจ, ติดต่อ"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500" />
                </div>
              )}
            </div>

            {/* Phase 2 */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Phase 2 — Action</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "comment",    label: "💬 Comment",    desc: "คอมเม้นบนโพสต์" },
                  { value: "join_group", label: "🤝 Join Group", desc: "ขอเข้าร่วมกลุ่ม" },
                  { value: "like",       label: "👍 Like",       desc: "กด Like โพสต์" },
                ] as { value: Phase2Type; label: string; desc: string }[]).map((opt) => (
                  <button key={opt.value} onClick={() => setPbPhase2(opt.value)}
                    className={`p-3 rounded-lg border text-left transition ${pbPhase2 === opt.value ? "bg-purple-900/50 border-purple-500 text-purple-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
              {pbPhase2 === "comment" && (
                <div className="space-y-3">
                  {/* Mode toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPbCommentMode("text")}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${pbCommentMode === "text" ? "bg-blue-900/50 border-blue-500 text-blue-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      ✏️ พิมพ์ข้อความ
                    </button>
                    <button
                      onClick={() => setPbCommentMode("criteria")}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition ${pbCommentMode === "criteria" ? "bg-purple-900/50 border-purple-500 text-purple-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}
                    >
                      🎲 สุ่มจาก Criteria
                    </button>
                  </div>

                  {pbCommentMode === "text" ? (
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">ข้อความคอมเม้น *</label>
                      <textarea value={pbText} onChange={(e) => setPbText(e.target.value)}
                        placeholder="ข้อความที่จะใช้คอมเม้น..." rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 resize-none" />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">เลือก Criteria *</label>
                      {commentCriteria.length === 0 ? (
                        <p className="text-xs text-gray-500">
                          ยังไม่มี Criteria — <a href="/settings" className="text-purple-400 underline">สร้างที่ Settings</a>
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {commentCriteria.map((c) => (
                            <button key={c.id} onClick={() => setPbCriteriaId(c.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs border transition ${pbCriteriaId === c.id ? "bg-purple-900/50 border-purple-500 text-purple-200" : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"}`}>
                              🎲 {c.name}
                              <span className="ml-1.5 text-gray-500">({c.comment_count})</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Interval + Action buttons */}
            <div className="flex items-center gap-4 flex-wrap pt-1 border-t border-gray-800">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">รันทุก</label>
                <input type="number" min={1} max={24} value={pbInterval} onChange={(e) => setPbInterval(Number(e.target.value))}
                  className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-blue-500" />
                <span className="text-xs text-gray-400">ชั่วโมง</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={startPipelineRun} disabled={pbRunning || !selectedId}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold transition">
                  {pbRunning ? "⏳ กำลังทำงาน..." : "▶ รันเดี่ยว"}
                </button>
                <button onClick={saveScJob} disabled={scSaving || !selectedId}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded-lg text-sm font-semibold transition">
                  {scSaving ? "⏳ บันทึก..." : "⏰ บันทึกเป็น Job"}
                </button>
              </div>
            </div>
          </div>

          {/* One-off stats */}
          {pbStats && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Action สำเร็จ", value: pbStats.commented, color: "text-green-400" },
                { label: "ข้ามซ้ำ", value: pbStats.skipped_duplicate, color: "text-yellow-400" },
                { label: "ไม่ตรงเกณฑ์", value: pbStats.skipped_keyword, color: "text-gray-400" },
                { label: "Error", value: pbStats.errors, color: "text-red-400" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* One-off live log */}
          {pbLog.length > 0 && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1 max-h-64 overflow-y-auto font-mono">
              {pbLog.map((entry, i) => (
                <p key={i} className={`text-xs ${
                  entry.type === "success"    ? "text-green-400"  :
                  entry.type === "found"      ? "text-blue-400"   :
                  entry.type === "error" || entry.type === "fatal" ? "text-red-400" :
                  entry.type === "skip"       ? "text-yellow-500" :
                  entry.type === "commenting" ? "text-purple-400" :
                  "text-gray-400"
                }`}>{entry.message}</p>
              ))}
              {pbRunning && <p className="text-xs text-gray-600 animate-pulse">กำลังทำงาน...</p>}
            </div>
          )}

          {/* Scheduled jobs list */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium px-1">
              ⏰ Scheduled Jobs ({scJobs.length} รายการ)
            </p>

            {scJobs.length === 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
                ยังไม่มี Job — ตั้งค่า Pipeline แล้วกด "บันทึกเป็น Job"
              </div>
            )}

            {scJobs.map((job) => {
              const acc = accounts.find((a) => a.id === job.accountId);
              const running = scJobRunning[job.id] ?? false;
              const log = scJobLog[job.id] ?? [];
              const nextRun = job.lastRunAt
                ? new Date(new Date(job.lastRunAt).getTime() + job.intervalHours * 3600_000)
                : null;

              const p1Label =
                job.phase1.type === "scroll_feed"   ? "📜 Scroll Feed" :
                job.phase1.type === "search_posts"  ? `🔍 Search: "${job.phase1.query}"` :
                job.phase1.type === "search_groups" ? `👥 Groups: "${job.phase1.query}"` :
                `🔗 URL: ${job.phase1.url?.slice(0, 40)}`;

              const p2Label =
                job.phase2.type === "comment"
                  ? job.phase2.criteriaId
                    ? `🎲 Comment (criteria: ${commentCriteria.find(c => c.id === job.phase2.criteriaId)?.name ?? `#${job.phase2.criteriaId}`})`
                    : `💬 Comment: "${job.phase2.text?.slice(0, 30)}"`
                  : job.phase2.type === "join_group" ? "🤝 Join Group"
                  : "👍 Like";

              return (
                <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <button onClick={() => toggleScJob(job)} title={job.enabled ? "คลิกเพื่อหยุด" : "คลิกเพื่อเปิดใช้"}
                      className={`mt-0.5 w-10 h-5 rounded-full relative transition-colors shrink-0 ${job.enabled ? "bg-green-600" : "bg-gray-700"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${job.enabled ? "left-5" : "left-0.5"}`} />
                    </button>

                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium text-white">{job.name}</p>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-blue-900/40 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">{p1Label}</span>
                        <span className="text-gray-500">→</span>
                        <span className="bg-purple-900/40 text-purple-300 border border-purple-800 px-2 py-0.5 rounded-full">{p2Label}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                        <span>👤 {acc?.label ?? job.accountId}</span>
                        <span>⏱ ทุก {job.intervalHours} ชม.</span>
                        {job.phase1.criteria && job.phase1.criteria.length > 0 && (
                          <span>🎯 {job.phase1.criteria.join(", ")}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs">
                        {job.lastRunAt && <span className="text-gray-500">รันล่าสุด: {new Date(job.lastRunAt).toLocaleString("th-TH")}</span>}
                        {nextRun && job.enabled && <span className="text-blue-500">รันถัดไป: {nextRun.toLocaleString("th-TH")}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => runScJobNow(job)} disabled={running}
                        className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition whitespace-nowrap">
                        {running ? "⏳" : "▶ รัน"}
                      </button>
                      <button onClick={() => deleteScJob(job.id)} disabled={running}
                        className="text-gray-600 hover:text-red-400 transition text-base disabled:opacity-40">🗑</button>
                    </div>
                  </div>

                  {log.length > 0 && (
                    <div className="bg-gray-950 rounded-lg p-3 space-y-0.5 max-h-40 overflow-y-auto font-mono">
                      {log.map((entry, i) => (
                        <p key={i} className={`text-xs ${
                          entry.type === "success"    ? "text-green-400"  :
                          entry.type === "found"      ? "text-blue-400"   :
                          entry.type === "error" || entry.type === "fatal" ? "text-red-400" :
                          entry.type === "skip"       ? "text-yellow-500" :
                          entry.type === "commenting" ? "text-purple-400" :
                          "text-gray-400"
                        }`}>{entry.message ?? "✅ เสร็จ"}</p>
                      ))}
                      {running && <p className="text-xs text-gray-600 animate-pulse">กำลังทำงาน...</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
