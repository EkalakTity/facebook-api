import fs from "fs";
import path from "path";
import type { Browser, Page, CookieParam } from "puppeteer";
import { hasCommented, saveComment } from "./history";

// Lazy-init puppeteer-extra+stealth to avoid module-level init error in Next.js Turbopack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _puppeteerExtra: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPuppeteer(): any {
  if (!_puppeteerExtra) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pExtra = require("puppeteer-extra");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StealthPlugin = require("puppeteer-extra-plugin-stealth");
    pExtra.use(StealthPlugin());
    _puppeteerExtra = pExtra;
  }
  return _puppeteerExtra;
}

export interface Account {
  id: string;
  label: string;
  email: string;
  password: string;
  user_agent?: string;
  uid?: string;
  profile_url?: string;
}

export interface Settings {
  accounts: Account[];
  headless: boolean;
  max_posts: number;
  scroll_speed_ms: number;
  keywords: string[];
  auto_comment_text: string;
}

export interface AutoProgressEvent {
  type: "info" | "found" | "skip" | "commenting" | "success" | "error" | "done" | "fatal";
  message: string;
}

export interface AutoResult {
  commented: number;
  skipped_keyword: number;
  skipped_duplicate: number;
  errors: number;
}

export interface PostResult {
  postId: string;   // ใช้เป็น unique key สำหรับเช็ค history
  url: string;
  text: string;
}
export interface ChatResult { name: string; preview: string }
export interface GroupSearchResult {
  name: string
  url: string
  memberCount: string | null
  privacy: 'public' | 'private' | null
}
export type GroupJoinStatus = 'request_sent' | 'joined' | 'already_member' | 'failed'
export interface SessionInfo { exists: boolean; savedAt: string | null }

const SETTINGS_PATH = path.join(process.cwd(), "settings.json");
const PROFILES_DIR = path.join(process.cwd(), "profiles");

export function loadSettings(): Settings {
  return JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
}

export function saveSettings(settings: Settings): void {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export function getAccount(accountId: string): Account {
  const { accounts } = loadSettings();
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new Error(`ไม่พบบัญชี id: ${accountId}`);
  return account;
}

// --- Profile-based session (userDataDir) ---

export function profileDir(accountId: string): string {
  const dir = path.join(PROFILES_DIR, `profile_${accountId}`);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// เช็คว่า profile มีข้อมูลแล้วหรือยัง (Cookies file ของ Chrome)
export function getSessionInfo(accountId: string): SessionInfo {
  const cookiesFile = path.join(PROFILES_DIR, `profile_${accountId}`, "Default", "Cookies");
  if (!fs.existsSync(cookiesFile)) return { exists: false, savedAt: null };
  return { exists: true, savedAt: fs.statSync(cookiesFile).mtime.toISOString() };
}

export function clearSession(accountId: string): void {
  const dir = path.join(PROFILES_DIR, `profile_${accountId}`);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

// เปิด browser พร้อม profile ของบัญชีนั้นๆ
async function launchBrowser(accountId: string, headless: boolean): Promise<{ browser: Browser; page: Page }> {
  const { accounts } = loadSettings();
  const account = accounts.find((a) => a.id === accountId);
  const browser = await getPuppeteer().launch({
    headless,
    userDataDir: profileDir(accountId),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as Browser;
  const page = await browser.newPage();
  // Always use desktop UA — mobile UA causes redirects to m.facebook.com
  const ua = account?.user_agent && !account.user_agent.includes("Mobile") ? account.user_agent : DESKTOP_UA;
  await page.setUserAgent(ua);
  await page.setViewport({ width: 1280, height: 900 });
  return { browser, page };
}

async function isLoggedIn(page: Page): Promise<boolean> {
  await page.goto("https://www.facebook.com/", { waitUntil: "networkidle2" });
  const url = page.url();
  if (url.includes("/login") || url.includes("checkpoint") || url.includes("m.facebook.com")) return false;
  // Confirm by checking /me resolves to a real profile (not back to home)
  await page.goto("https://www.facebook.com/me", { waitUntil: "networkidle2" });
  const meUrl = page.url();
  // If /me stays at facebook.com/ or goes to login, not logged in
  return !meUrl.includes("/login") && !meUrl.includes("checkpoint") &&
    meUrl !== "https://www.facebook.com/" && meUrl !== "https://www.facebook.com";
}

async function doLogin(page: Page, account: Account): Promise<void> {
  await page.goto("https://www.facebook.com/login", { waitUntil: "networkidle2" });
  await page.waitForSelector('input[name="email"]', { timeout: 15000 });
  await page.type('input[name="email"]', account.email, { delay: 60 });
  await page.type('input[name="pass"]', account.password, { delay: 60 });
  await page.keyboard.press("Enter");
  await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 });
}

async function ensureLoggedIn(page: Page, accountId: string): Promise<void> {
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    const account = getAccount(accountId);
    await doLogin(page, account);
  }
}

export async function loginAndSave(accountId: string): Promise<{ uid: string; profile_url: string }> {
  const account = getAccount(accountId);
  const { headless } = loadSettings();
  const { browser, page } = await launchBrowser(accountId, headless);
  try {
    const alreadyIn = await isLoggedIn(page);
    if (!alreadyIn) {
      await doLogin(page, account);
      const afterUrl = page.url();
      if (afterUrl.includes("/login") || afterUrl.includes("checkpoint"))
        throw new Error("Login ไม่สำเร็จ — ตรวจสอบ Email/Password หรือ Facebook ขอ 2FA");
    }

    return await extractAndSaveProfile(page, accountId);
  } finally {
    await browser.close();
  }
}

// Open a visible browser and wait up to 3 minutes for the user to login manually
export async function manualLoginAndWait(accountId: string): Promise<{ uid: string; profile_url: string }> {
  const account = settings_find(accountId);
  const browser = await getPuppeteer().launch({
    headless: false,
    userDataDir: profileDir(accountId),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  }) as Browser;

  const page = await browser.newPage();
  // Skip custom user_agent during manual login so Facebook opens as desktop site
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // Check if already logged in first
    const alreadyIn = await isLoggedIn(page);
    if (alreadyIn) return await extractAndSaveProfile(page, accountId);

    // Navigate to login — force desktop site with www subdomain
    await page.goto("https://www.facebook.com/login?next=%2F", { waitUntil: "networkidle2" });
    if (account?.email) {
      try {
        await page.waitForSelector('input[name="email"]', { timeout: 5000 });
        await page.$eval('input[name="email"]', (el, v) => { (el as HTMLInputElement).value = v; }, account.email);
      } catch { /* ignore */ }
    }

    // Poll for 3 minutes waiting for the user to complete login
    const deadline = Date.now() + 3 * 60 * 1000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const url = page.url();

      // If stuck on mobile site, redirect back to desktop
      if (url.includes("m.facebook.com")) {
        await page.goto("https://www.facebook.com" + new URL(url).pathname, { waitUntil: "domcontentloaded" }).catch(() => {});
        continue;
      }

      // Still on login or checkpoint — wait
      if (url.includes("/login") || url.includes("checkpoint")) continue;

      // Off the login page — verify /me resolves to a real profile
      const meUrl = await page.evaluate(() => {
        return fetch("https://www.facebook.com/me", { redirect: "follow" }).then(r => r.url).catch(() => "");
      }).catch(() => "");

      if (meUrl && !meUrl.includes("/login") && meUrl !== "https://www.facebook.com/" && meUrl !== "https://www.facebook.com") {
        return await extractAndSaveProfile(page, accountId);
      }
    }

    throw new Error("หมดเวลา 3 นาที — กรุณา Login ให้เสร็จแล้วลองใหม่");
  } finally {
    await browser.close();
  }
}

function settings_find(accountId: string): Account | undefined {
  return loadSettings().accounts.find((a) => a.id === accountId);
}

async function extractAndSaveProfile(page: Page, accountId: string): Promise<{ uid: string; profile_url: string }> {
  await page.goto("https://www.facebook.com/me", { waitUntil: "networkidle2" });
  const rawUrl = page.url();

  // If /me didn't resolve to a real profile, user is not logged in
  if (rawUrl.includes("/login") || rawUrl === "https://www.facebook.com/" || rawUrl === "https://www.facebook.com") {
    throw new Error("ยังไม่ได้ Login — กรุณา Login ให้เสร็จก่อน");
  }

  const profile_url = rawUrl.split("?ref")[0].split("?sk")[0];
  const uidFromQuery = rawUrl.match(/[?&]id=(\d+)/)?.[1] ?? "";
  const uidFromPath = profile_url.replace(/\/$/, "").split("/").pop() ?? "";
  const uid = uidFromQuery || uidFromPath;

  const s = loadSettings();
  const acc = s.accounts.find((a) => a.id === accountId);
  if (acc) { acc.uid = uid; acc.profile_url = profile_url; saveSettings(s); }

  return { uid, profile_url };
}

// --- Helpers ---

async function dismissPopups(page: Page): Promise<void> {
  // Click "Nanti" (Not Now) on password save dialog
  const notNowSelectors = [
    'div[aria-label="Nanti"]',
    'div[aria-label="Not Now"]',
    '[data-testid="cancel"]',
    'div[role="button"] span::-webkit-inner-text',
  ];
  for (const sel of notNowSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn) { await btn.click(); await new Promise((r) => setTimeout(r, 500)); }
    } catch { /* ignore */ }
  }
  // Also try clicking by text content
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[role="button"]'));
    const notNow = buttons.find((b) => b.textContent?.trim() === "Nanti" || b.textContent?.trim() === "Not Now");
    if (notNow) (notNow as HTMLElement).click();
  }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));
}

// --- Bot functions ---

export async function scrollFeed(accountId: string): Promise<PostResult[]> {
  const settings = loadSettings();
  const { browser, page } = await launchBrowser(accountId, settings.headless);

  try {
    await ensureLoggedIn(page, accountId);
    // Navigate to news feed after login check (isLoggedIn leaves page on /me)
    await page.goto("https://www.facebook.com/", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 2000));
    // Dismiss any popups (password save dialog, notifications, etc.)
    await dismissPopups(page);

    const posts: PostResult[] = [];
    const seenIds = new Set<string>();
    let attempts = 0;

    while (posts.length < settings.max_posts && attempts < 40) {
      const items = await page.$$eval(
        // Try multiple selectors for different Facebook layouts
        'div[data-pagelet^="FeedUnit"], div[role="article"], div[data-testid="fbfeed_story"]',
        (els) => els.map((el) => {
          // Text: try multiple selectors in order of specificity
          const textSelectors = [
            '[data-ad-preview="message"]',
            '[data-testid="post_message"]',
            'div[dir="auto"][style]',
            'div[dir="auto"]',
          ];
          let text = "";
          for (const sel of textSelectors) {
            const found = el.querySelector(sel);
            if (found) {
              text = (found as HTMLElement).innerText?.trim() ?? "";
              if (text.length >= 10) break;
            }
          }

          // URL: try multiple link patterns
          const linkSelectors = [
            'a[href*="/posts/"]',
            'a[href*="story_fbid"]',
            'a[href*="/permalink/"]',
            'a[href*="?p="]',
            'a[role="link"][href*="facebook.com"]',
          ];
          let url = "";
          for (const sel of linkSelectors) {
            const found = el.querySelector(sel) as HTMLAnchorElement | null;
            if (found?.href) { url = found.href; break; }
          }

          const postId = url.match(/(\d{10,})/)?.[1] ?? "";
          return { text, url, postId };
        })
      ).catch(() => [] as { text: string; url: string; postId: string }[]);

      for (const item of items) {
        if (!item.text || item.text.length < 10) continue;
        const key = item.postId || item.text.slice(0, 80);
        if (seenIds.has(key)) continue;
        seenIds.add(key);
        posts.push({ postId: key, url: item.url, text: item.text.slice(0, 400) });
      }

      await page.evaluate(`window.scrollBy(0, 1200)`);
      await new Promise((r) => setTimeout(r, settings.scroll_speed_ms));
      attempts++;
    }
    return posts;
  } finally {
    await browser.close();
  }
}

export async function commentOnPost(
  postUrl: string,
  postId: string,
  comment: string,
  accountId: string
): Promise<{ alreadyCommented: boolean }> {
  if (hasCommented(accountId, postId)) {
    return { alreadyCommented: true };
  }

  const { headless } = loadSettings();
  const { browser, page } = await launchBrowser(accountId, headless);

  try {
    await ensureLoggedIn(page, accountId);
    await page.goto(postUrl, { waitUntil: "networkidle2" });

    // คลิก comment box
    const commentBox = await page.$(
      '[aria-label="แสดงความคิดเห็น..."], [aria-label="Write a comment…"], [aria-label="Write a public comment…"]'
    );
    if (!commentBox) throw new Error("ไม่พบ comment box — โพสต์นี้อาจปิดคอมเม้น");

    await commentBox.click();
    await page.keyboard.type(comment, { delay: 60 });
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 2000));

    saveComment(accountId, {
      postId,
      url: postUrl,
      comment,
      commentedAt: new Date().toISOString(),
    });

    return { alreadyCommented: false };
  } finally {
    await browser.close();
  }
}

export async function autoScrollAndComment(
  accountId: string,
  onProgress: (event: AutoProgressEvent) => void
): Promise<AutoResult> {
  const settings = loadSettings();
  const { keywords, auto_comment_text, max_posts, scroll_speed_ms, headless } = settings;

  if (!auto_comment_text.trim()) throw new Error("กรุณาตั้ง 'ข้อความ Auto Comment' ใน Settings ก่อน");
  if (keywords.length === 0) throw new Error("กรุณาเพิ่ม keyword อย่างน้อย 1 คำใน Settings");

  const { browser, page } = await launchBrowser(accountId, headless);

  const stats: AutoResult = { commented: 0, skipped_keyword: 0, skipped_duplicate: 0, errors: 0 };

  try {
    await ensureLoggedIn(page, accountId);
    await page.goto("https://www.facebook.com/", { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 2000));
    await dismissPopups(page);
    onProgress({ type: "info", message: "Login สำเร็จ — เริ่ม scroll feed..." });

    // Phase 1: scroll หาโพสต์ที่ตรง keyword
    const matchedPosts: PostResult[] = [];
    const seenIds = new Set<string>();
    let attempts = 0;

    while (attempts < 40) {
      const items = await page.$$eval(
        'div[data-pagelet^="FeedUnit"]',
        (els) => els.map((el) => {
          const textEl = el.querySelector('[data-ad-preview="message"], [data-testid="post_message"], [dir="auto"] span');
          const linkEl = el.querySelector('a[href*="/posts/"], a[href*="story_fbid"], a[href*="/permalink/"]');
          const text = (textEl as HTMLElement)?.innerText?.trim() ?? "";
          const url = (linkEl as HTMLAnchorElement)?.href ?? "";
          const postId = url.match(/(\d{10,})/)?.[1] ?? text.slice(0, 80);
          return { text, url, postId };
        })
      );

      for (const item of items) {
        if (!item.text || item.text.length < 10 || seenIds.has(item.postId)) continue;
        seenIds.add(item.postId);

        const hasKeyword = keywords.some((kw) =>
          item.text.toLowerCase().includes(kw.toLowerCase())
        );

        if (!hasKeyword) { stats.skipped_keyword++; continue; }

        if (hasCommented(accountId, item.postId)) {
          stats.skipped_duplicate++;
          onProgress({ type: "skip", message: `⏭ คอมเม้นซ้ำแล้ว: "${item.text.slice(0, 60)}..."` });
          continue;
        }

        matchedPosts.push({ postId: item.postId, url: item.url, text: item.text });
        onProgress({ type: "found", message: `🎯 พบ keyword: "${item.text.slice(0, 70)}..."` });

        if (matchedPosts.length >= max_posts) break;
      }

      if (matchedPosts.length >= max_posts) break;

      await page.evaluate(`window.scrollBy(0, 900)`);
      await new Promise((r) => setTimeout(r, scroll_speed_ms));
      attempts++;
    }

    onProgress({
      type: "info",
      message: `Scroll เสร็จ — พบ ${matchedPosts.length} โพสต์ที่ตรง keyword (ข้าม ${stats.skipped_keyword} ไม่ตรง, ${stats.skipped_duplicate} ซ้ำ)`,
    });

    // Phase 2: คอมเม้นทีละโพสต์
    for (const post of matchedPosts) {
      try {
        onProgress({ type: "commenting", message: `💬 กำลังคอมเม้น: "${post.text.slice(0, 60)}..."` });

        if (!post.url) {
          onProgress({ type: "error", message: "ข้ามโพสต์ที่ไม่มี URL" });
          stats.errors++;
          continue;
        }

        await page.goto(post.url, { waitUntil: "networkidle2" });

        const commentBox = await page.$(
          '[aria-label="แสดงความคิดเห็น..."], [aria-label="Write a comment…"], [aria-label="Write a public comment…"]'
        );
        if (!commentBox) throw new Error("ไม่พบ comment box — โพสต์นี้อาจปิดคอมเม้น");

        await commentBox.click();
        await page.keyboard.type(auto_comment_text, { delay: 60 });
        await page.keyboard.press("Enter");
        await new Promise((r) => setTimeout(r, 2000));

        saveComment(accountId, {
          postId: post.postId,
          url: post.url,
          comment: auto_comment_text,
          commentedAt: new Date().toISOString(),
        });

        stats.commented++;
        onProgress({ type: "success", message: `✅ คอมเม้นสำเร็จ (รวม ${stats.commented} รายการ)` });

        // หน่วงเวลาระหว่างโพสต์ ป้องกัน spam detection
        await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
      } catch (err) {
        stats.errors++;
        onProgress({ type: "error", message: `❌ ${err instanceof Error ? err.message : "unknown error"}` });
      }
    }

    return stats;
  } finally {
    await browser.close();
  }
}

export async function searchChats(keyword: string, accountId: string): Promise<ChatResult[]> {
  const { headless } = loadSettings();
  const { browser, page } = await launchBrowser(accountId, headless);

  try {
    await ensureLoggedIn(page, accountId);
    await page.goto("https://www.facebook.com/messages/", { waitUntil: "networkidle2" });

    const searchBox = await page.$(
      '[aria-label="ค้นหา Messenger"], [aria-label="Search Messenger"], [placeholder*="Search"], [placeholder*="ค้นหา"]'
    );
    if (searchBox) {
      await searchBox.click();
      await searchBox.type(keyword, { delay: 80 });
      await new Promise((r) => setTimeout(r, 2500));
    }

    const results: ChatResult[] = await page.$$eval('[role="row"]', (rows) =>
      rows.slice(0, 20).map((row) => {
        const spans = row.querySelectorAll("span");
        return {
          name: spans[0]?.textContent?.trim() ?? "Unknown",
          preview: spans[1]?.textContent?.trim() ?? "",
        };
      })
    );

    return results.filter((r) => r.name !== "Unknown" && r.name.length > 0);
  } finally {
    await browser.close();
  }
}

const SKIP_GROUP_SLUGS = new Set(['discover', 'feed', 'notifications', 'search', 'join'])

export async function searchGroups(query: string, accountId: string): Promise<GroupSearchResult[]> {
  const { headless } = loadSettings()
  const { browser, page } = await launchBrowser(accountId, headless)
  try {
    await ensureLoggedIn(page, accountId)
    // domcontentloaded + manual wait — networkidle2 never settles on Facebook search
    await page.goto(`https://www.facebook.com/search/groups/?q=${encodeURIComponent(query)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    })
    await new Promise((r) => setTimeout(r, 4000))

    const raw = await page.$$eval('[role="article"]', (articles) => {
      const SKIP = ['discover', 'feed', 'notifications', 'search', 'join']
      return articles.slice(0, 10).map((article) => {
        const links = Array.from(article.querySelectorAll('a[href*="/groups/"]')) as HTMLAnchorElement[]
        let groupUrl = ''
        let groupName = ''
        for (const link of links) {
          const match = link.href.match(/facebook\.com\/groups\/([^/?#]+)/)
          if (!match || SKIP.includes(match[1])) continue
          if (!groupUrl) {
            groupUrl = `https://www.facebook.com/groups/${match[1]}`
            // Walk up to the article to find the heading/span with the group name
            const heading = article.querySelector('span[dir="auto"]')
            groupName = heading?.textContent?.trim() || link.textContent?.trim() || ''
          }
        }
        if (!groupUrl || !groupName) return null
        const bodyText = article.textContent ?? ''
        const memberMatch = bodyText.match(/([\d,.]+[Kk]?)\s*(สมาชิก|member)/i)
        const privacy = /สาธารณะ|public/i.test(bodyText)
          ? 'public'
          : /ส่วนตัว|private/i.test(bodyText)
          ? 'private'
          : null
        return { name: groupName, url: groupUrl, memberCount: memberMatch ? memberMatch[1] : null, privacy }
      })
    })

    return (raw.filter(Boolean) as GroupSearchResult[]).filter(
      (r, i, arr) => arr.findIndex((x) => x.url === r.url) === i,
    )
  } finally {
    await browser.close()
  }
}

export async function joinGroup(groupUrl: string, accountId: string): Promise<GroupJoinStatus> {
  const { headless } = loadSettings()
  const { browser, page } = await launchBrowser(accountId, headless)
  try {
    await ensureLoggedIn(page, accountId)
    await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise((r) => setTimeout(r, 4000))

    const bodyText: string = await page.evaluate(() => document.body.textContent ?? '')
    if (/ออกจากกลุ่ม|Leave group/i.test(bodyText)) return 'already_member'
    if (/ยกเลิกคำขอ|Cancel request/i.test(bodyText)) return 'request_sent'

    const clicked: boolean = await page.evaluate(() => {
      const JOIN_TEXTS = ['ขอเข้าร่วม', 'Join group', 'Join Group']
      const btns = Array.from(document.querySelectorAll('[role="button"]'))
      for (const text of JOIN_TEXTS) {
        const btn = btns.find((b) => b.textContent?.trim().includes(text))
        if (btn) { ;(btn as HTMLElement).click(); return true }
      }
      return false
    })
    if (!clicked) return 'failed'

    await new Promise((r) => setTimeout(r, 2000))

    // Handle confirmation dialog on private groups
    await page.evaluate(() => {
      const CONFIRM_TEXTS = ['ยืนยัน', 'Confirm', 'ส่งคำขอ', 'Send request']
      const btns = Array.from(document.querySelectorAll('[role="button"]'))
      for (const text of CONFIRM_TEXTS) {
        const btn = btns.find((b) => b.textContent?.trim().includes(text))
        if (btn) { ;(btn as HTMLElement).click(); return }
      }
    })
    await new Promise((r) => setTimeout(r, 2000))

    const afterText: string = await page.evaluate(() => document.body.textContent ?? '')
    if (/ยกเลิกคำขอ|Cancel request/i.test(afterText)) return 'request_sent'
    if (/ออกจากกลุ่ม|Leave group/i.test(afterText)) return 'joined'

    return 'request_sent'
  } finally {
    await browser.close()
  }
}

function genId() {
  return "acc_" + Math.random().toString(36).slice(2, 8);
}

function parseImportLine(line: string): { email: string; password: string; userAgent: string; cookies: CookieParam[] } {
  const parts = line.trim().split(":");
  if (parts.length < 6) throw new Error("format ไม่ถูกต้อง — ต้องมี 6 ส่วนคั่นด้วย :");
  const email = parts[0];
  const password = parts[1];
  // parts[2] = "https", parts[3] = "//profileURL" — ข้ามส่วน URL
  const userAgent = parts[4];
  const cookiesB64 = parts[5];
  const cookies: CookieParam[] = JSON.parse(Buffer.from(cookiesB64, "base64").toString("utf-8"));
  return { email, password, userAgent, cookies };
}

export async function importAccount(line: string): Promise<{ accountId: string; label: string }> {
  const { email, password, userAgent, cookies } = parseImportLine(line);
  const settings = loadSettings();

  let account = settings.accounts.find((a) => a.email === email);
  if (!account) {
    account = { id: genId(), label: email.split("@")[0], email, password, user_agent: userAgent };
    settings.accounts.push(account);
  } else {
    account.password = password;
    account.user_agent = userAgent;
  }
  saveSettings(settings);

  const { browser, page } = await launchBrowser(account.id, settings.headless);
  try {
    await page.goto("https://www.facebook.com/", { waitUntil: "networkidle2" });
    await page.setCookie(...cookies);
    await page.reload({ waitUntil: "networkidle2" });

    const url = page.url();
    const loggedIn = !url.includes("/login") && !url.includes("checkpoint") &&
      (await page.$('input[name="email"]')) === null;
    if (!loggedIn) throw new Error("Cookies หมดอายุหรือ Invalid — export cookies ใหม่อีกครั้ง");
  } finally {
    await browser.close();
  }

  return { accountId: account.id, label: account.label };
}
