"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.navigateToTarget = navigateToTarget;
exports.scanVisiblePosts = scanVisiblePosts;
exports.runScanRound = runScanRound;
const scroll_util_1 = require("../utils/scroll.util");
const url_util_1 = require("../utils/url.util");
const FB_BASE = 'https://www.facebook.com';
async function navigateToTarget(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // รอให้ Feed โหลดก่อน
    await (0, scroll_util_1.waitRandom)(2000, 3500);
}
// ดึง post URL จาก link ทุกตัวในโพสต์
async function extractUrlFromArticle(article) {
    if (!article)
        return null;
    const links = await article.$$('a[href]');
    for (const link of links) {
        const href = await link.getAttribute('href').catch(() => null);
        if (!href)
            continue;
        const full = href.startsWith('http') ? href : `${FB_BASE}${href}`;
        if ((0, url_util_1.isPostUrl)(full)) {
            return (0, url_util_1.normalizePostUrl)(full);
        }
    }
    return null;
}
// ดึง author name จาก article
async function extractAuthor(article) {
    if (!article)
        return null;
    // Facebook มักใส่ชื่อผู้โพสต์ใน h2 หรือ h3 ที่มี link
    for (const sel of ['h2 a', 'h3 a', 'strong a']) {
        const el = await article.$(sel).catch(() => null);
        if (el) {
            const text = await el.innerText().catch(() => '');
            if (text.trim())
                return text.trim();
        }
    }
    return null;
}
// ดึง post text บางส่วน
async function extractText(article) {
    if (!article)
        return null;
    for (const sel of [
        '[data-ad-preview="message"]',
        '[data-testid="post_message"]',
        'div[dir="auto"]',
    ]) {
        const el = await article.$(sel).catch(() => null);
        if (el) {
            const text = await el.innerText().catch(() => '');
            const trimmed = text.trim();
            if (trimmed)
                return trimmed.slice(0, 500);
        }
    }
    return null;
}
async function scanVisiblePosts(page) {
    const posts = [];
    const seen = new Set();
    const articles = await page.$$('[role="article"]');
    for (const article of articles) {
        try {
            const postUrl = await extractUrlFromArticle(article);
            if (!postUrl)
                continue;
            // กัน duplicate ในรอบเดียวกัน
            if (seen.has(postUrl))
                continue;
            seen.add(postUrl);
            const [authorName, postText] = await Promise.all([
                extractAuthor(article),
                extractText(article),
            ]);
            posts.push({
                postUrl,
                postId: (0, url_util_1.extractPostId)(postUrl),
                postText,
                authorName,
                foundAt: new Date().toISOString(),
            });
        }
        catch {
            // ข้ามโพสต์ที่ดึงข้อมูลไม่ได้โดยไม่หยุดการ scan
        }
    }
    return posts;
}
async function runScanRound(page, targetUrl, config) {
    await navigateToTarget(page, targetUrl);
    const allPosts = [];
    const seen = new Set();
    for (let scroll = 0; scroll <= config.scrollPerRound; scroll++) {
        const found = await scanVisiblePosts(page);
        for (const post of found) {
            if (!seen.has(post.postUrl)) {
                seen.add(post.postUrl);
                allPosts.push(post);
                if (allPosts.length >= config.maxPostsPerRound) {
                    return allPosts;
                }
            }
        }
        if (scroll < config.scrollPerRound) {
            await (0, scroll_util_1.scrollDown)(page, 1, 1500);
        }
    }
    await (0, scroll_util_1.waitRandom)(config.cooldownMs, config.cooldownMs + 3000);
    return allPosts;
}
//# sourceMappingURL=scanner.agent.js.map