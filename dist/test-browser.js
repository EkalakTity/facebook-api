"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const session_agent_1 = require("./agents/session.agent");
async function main() {
    const profilePath = process.env.BROWSER_PROFILE_PATH;
    if (!profilePath) {
        console.error('กรุณาตั้งค่า BROWSER_PROFILE_PATH ใน .env');
        process.exit(1);
    }
    console.log('เปิด Browser...');
    const context = await (0, session_agent_1.launchBrowser)(profilePath);
    const page = await context.newPage();
    console.log('กำลังตรวจสอบ Session...');
    const loggedIn = await (0, session_agent_1.checkSession)(page);
    if (loggedIn) {
        console.log('✓ Login แล้ว — Session ใช้งานได้');
    }
    else {
        console.log('✗ ยังไม่ได้ Login — กรุณา Login ก่อนใช้งาน');
    }
    await (0, session_agent_1.closeBrowser)();
    console.log('ปิด Browser เรียบร้อย');
}
main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
//# sourceMappingURL=test-browser.js.map