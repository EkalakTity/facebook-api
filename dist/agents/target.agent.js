"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFacebookUrl = isFacebookUrl;
exports.detectTargetType = detectTargetType;
exports.selectTarget = selectTarget;
const prompt_1 = require("../cli/prompt");
const target_repo_1 = require("../db/repositories/target.repo");
function isFacebookUrl(url) {
    try {
        const { hostname } = new URL(url);
        return hostname === 'www.facebook.com' || hostname === 'facebook.com' || hostname === 'm.facebook.com';
    }
    catch {
        return false;
    }
}
function detectTargetType(url) {
    try {
        const { pathname, search } = new URL(url);
        if (pathname.includes('/groups/'))
            return 'group';
        if (pathname.includes('/posts/') ||
            pathname.includes('/permalink/') ||
            search.includes('story_fbid') ||
            search.includes('fbid'))
            return 'post';
        // pathname ว่างหรือ "/" คือ Feed หลัก
        if (pathname === '/' || pathname === '')
            return 'feed';
        // มี path segment เดียว เช่น /username → profile
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 1)
            return 'profile';
        return 'feed';
    }
    catch {
        return 'feed';
    }
}
async function askForNewUrl() {
    while (true) {
        const url = await (0, prompt_1.askText)('ใส่ Facebook URL ที่ต้องการ Scan:');
        const trimmed = url.trim();
        if (!isFacebookUrl(trimmed)) {
            console.log('  ✗ URL ต้องเป็น facebook.com เท่านั้น กรุณาใส่ใหม่');
            continue;
        }
        return trimmed;
    }
}
async function selectTarget(accountId) {
    const history = target_repo_1.targetRepo.getAll().filter((t) => t.account_id === accountId).slice(0, 5);
    const choices = [
        { name: '+ ใส่ URL ใหม่', value: 'new' },
        ...history.map((t) => ({
            name: `${t.target_url}  (${t.target_type})`,
            value: t.id,
        })),
    ];
    const picked = await (0, prompt_1.askSelect)('เลือก Target:', choices);
    if (picked !== 'new') {
        const existing = target_repo_1.targetRepo.getById(picked);
        if (existing)
            return existing;
    }
    // ใส่ URL ใหม่
    const url = await askForNewUrl();
    const type = detectTargetType(url);
    console.log(`  ✓ ตรวจพบ: ${type}`);
    const data = {
        account_id: accountId,
        target_type: type,
        target_url: url,
    };
    return target_repo_1.targetRepo.create(data);
}
//# sourceMappingURL=target.agent.js.map