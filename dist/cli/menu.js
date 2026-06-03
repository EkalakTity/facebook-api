"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showMainMenu = showMainMenu;
const chalk_1 = __importDefault(require("chalk"));
const database_1 = require("../db/database");
const session_agent_1 = require("../agents/session.agent");
const prompt_1 = require("./prompt");
const new_job_flow_1 = require("./new-job.flow");
const review_queue_view_1 = require("./review-queue.view");
const log_viewer_view_1 = require("./log-viewer.view");
function getPendingCount() {
    const row = database_1.db
        .prepare(`SELECT COUNT(*) as count FROM review_queue WHERE status = 'pending'`)
        .get();
    return row.count;
}
function printHeader() {
    console.clear();
    console.log(chalk_1.default.bold.blue('╔══════════════════════════════════════╗'));
    console.log(chalk_1.default.bold.blue('║') + chalk_1.default.bold('  Facebook Personal Agent  v1.0.0     ') + chalk_1.default.bold.blue('║'));
    console.log(chalk_1.default.bold.blue('╚══════════════════════════════════════╝'));
    console.log();
}
async function handleNewJob() {
    console.log(chalk_1.default.bold('\n── เริ่มงานใหม่ ──────────────────────\n'));
    await (0, new_job_flow_1.runNewJobSetup)();
    await pause();
}
async function showMainMenu() {
    while (true) {
        printHeader();
        const pending = getPendingCount();
        const queueLabel = pending > 0
            ? `ดู Review Queue ${chalk_1.default.yellow(`[${pending} รอการทำ]`)}`
            : 'ดู Review Queue';
        const choice = await (0, prompt_1.askSelect)('เลือกการทำงาน:', [
            { name: 'เริ่มงานใหม่', value: 'new_job' },
            { name: queueLabel, value: 'review_queue' },
            { name: 'ดู Log ล่าสุด', value: 'logs' },
            { name: chalk_1.default.gray('ออกจากโปรแกรม'), value: 'exit' },
        ]);
        console.log();
        switch (choice) {
            case 'new_job':
                await handleNewJob();
                break;
            case 'review_queue':
                await (0, review_queue_view_1.showReviewQueue)();
                await pause();
                break;
            case 'logs':
                await (0, log_viewer_view_1.showLogViewer)();
                await pause();
                break;
            case 'exit':
                await (0, session_agent_1.closeBrowser)();
                console.log(chalk_1.default.gray('ออกจากโปรแกรม...'));
                process.exit(0);
        }
    }
}
function pause() {
    return new Promise((resolve) => {
        process.stdout.write(chalk_1.default.gray('\nกด Enter เพื่อกลับเมนูหลัก...'));
        process.stdin.once('data', () => resolve());
    });
}
//# sourceMappingURL=menu.js.map