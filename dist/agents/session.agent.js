"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchBrowser = launchBrowser;
exports.closeBrowser = closeBrowser;
exports.getContext = getContext;
exports.checkSession = checkSession;
const playwright_1 = require("playwright");
const browser_config_1 = require("../config/browser.config");
let context = null;
async function launchBrowser(profilePath) {
    const path = profilePath || browser_config_1.browserConfig.profilePath;
    if (!path) {
        throw new Error('ไม่พบ BROWSER_PROFILE_PATH — กรุณาตั้งค่าใน .env');
    }
    context = await playwright_1.chromium.launchPersistentContext(path, {
        headless: browser_config_1.browserConfig.headless,
        slowMo: browser_config_1.browserConfig.slowMo,
        viewport: browser_config_1.browserConfig.viewport,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    return context;
}
async function closeBrowser() {
    if (context) {
        await context.close();
        context = null;
    }
}
function getContext() {
    if (!context)
        throw new Error('Browser ยังไม่ได้เปิด — เรียก launchBrowser() ก่อน');
    return context;
}
// คืนค่า true ถ้า Login แล้ว, false ถ้ายังไม่ได้ Login
async function checkSession(page) {
    try {
        await page.goto('https://www.facebook.com', {
            waitUntil: 'domcontentloaded',
            timeout: browser_config_1.browserConfig.timeout,
        });
        const url = page.url();
        // ถ้า redirect ไปหน้า login = session หมดอายุ
        if (url.includes('/login') || url.includes('login.php')) {
            return false;
        }
        // เช็ก element ที่มีเฉพาะตอน Login แล้ว (search bar หรือ nav)
        const loggedIn = await page.$('[aria-label="Facebook"]') !== null
            || await page.$('[data-testid="royal_login_button"]') === null;
        return loggedIn;
    }
    catch {
        return false;
    }
}
//# sourceMappingURL=session.agent.js.map