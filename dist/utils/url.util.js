"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPostId = extractPostId;
exports.normalizePostUrl = normalizePostUrl;
exports.isPostUrl = isPostUrl;
// ดึง Post ID จาก Facebook URL รูปแบบต่าง ๆ
function extractPostId(url) {
    try {
        const u = new URL(url);
        // /posts/123456
        const postsMatch = u.pathname.match(/\/posts\/(\d+)/);
        if (postsMatch)
            return postsMatch[1];
        // /permalink/123456
        const permalinkMatch = u.pathname.match(/\/permalink\/(\d+)/);
        if (permalinkMatch)
            return permalinkMatch[1];
        // ?story_fbid=123456
        const storyFbid = u.searchParams.get('story_fbid');
        if (storyFbid)
            return storyFbid;
        // ?fbid=123456
        const fbid = u.searchParams.get('fbid');
        if (fbid)
            return fbid;
        return null;
    }
    catch {
        return null;
    }
}
// ทำให้ URL อยู่ในรูปแบบมาตรฐาน ตัด tracking params ออก
function normalizePostUrl(url) {
    try {
        const u = new URL(url);
        // เก็บเฉพาะ query params ที่จำเป็นสำหรับระบุโพสต์
        const keep = ['story_fbid', 'id', 'fbid', 'p'];
        const cleaned = new URLSearchParams();
        for (const param of keep) {
            const val = u.searchParams.get(param);
            if (val)
                cleaned.set(param, val);
        }
        u.search = cleaned.toString();
        u.hash = '';
        // ทำให้ hostname เป็น www.facebook.com เสมอ
        if (u.hostname === 'facebook.com' || u.hostname === 'm.facebook.com') {
            u.hostname = 'www.facebook.com';
        }
        return u.toString();
    }
    catch {
        return url;
    }
}
// เช็กว่า URL เป็น Facebook post URL หรือไม่
function isPostUrl(url) {
    try {
        const u = new URL(url);
        const path = u.pathname;
        return (path.includes('/posts/') ||
            path.includes('/permalink/') ||
            u.searchParams.has('story_fbid') ||
            u.searchParams.has('fbid'));
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=url.util.js.map