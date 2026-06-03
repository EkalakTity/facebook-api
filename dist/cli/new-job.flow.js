"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runNewJobSetup = runNewJobSetup;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const session_agent_1 = require("../agents/session.agent");
const prompt_1 = require("./prompt");
const browser_config_1 = require("../config/browser.config");
const account_repo_1 = require("../db/repositories/account.repo");
const target_agent_1 = require("../agents/target.agent");
const scanner_agent_1 = require("../agents/scanner.agent");
const duplicate_agent_1 = require("../agents/duplicate.agent");
const review_agent_1 = require("../agents/review.agent");
const logger_agent_1 = require("../agents/logger.agent");
const summary_view_1 = require("./summary.view");
const database_1 = require("../db/database");
// ── Step 5: Profile Path ──────────────────────────────────────────
async function resolveProfilePath() {
    if (browser_config_1.browserConfig.profilePath) {
        console.log(chalk_1.default.gray(`Profile: ${browser_config_1.browserConfig.profilePath}`));
        return browser_config_1.browserConfig.profilePath;
    }
    console.log(chalk_1.default.yellow('ไม่พบ BROWSER_PROFILE_PATH ใน .env'));
    const input = await (0, prompt_1.askText)('ใส่ path ของ Browser Profile:');
    return path_1.default.resolve(input.trim());
}
async function openAndVerifySession(profilePath) {
    console.log(chalk_1.default.gray('\nกำลังเปิด Browser...'));
    const context = await (0, session_agent_1.launchBrowser)(profilePath);
    const page = await context.newPage();
    console.log(chalk_1.default.gray('กำลังตรวจสอบ Session...'));
    const loggedIn = await (0, session_agent_1.checkSession)(page);
    if (!loggedIn) {
        await (0, session_agent_1.closeBrowser)();
        console.log(chalk_1.default.red('✗ Session หมดอายุหรือยังไม่ได้ Login'));
        console.log(chalk_1.default.yellow('  กรุณา Login Facebook ใน Browser Profile ก่อนใช้งาน'));
        return false;
    }
    console.log(chalk_1.default.green('✓ Login แล้ว พร้อมทำงาน'));
    return true;
}
async function selectMessageTemplate() {
    const templates = database_1.db
        .prepare(`SELECT id, name, text FROM message_templates WHERE status = 'active' ORDER BY id`)
        .all();
    if (templates.length === 0) {
        const text = await (0, prompt_1.askText)('ไม่มี Template — ใส่ข้อความที่จะใช้:');
        return { id: 0, name: 'custom', text };
    }
    const choices = templates.map((t) => ({ name: `${t.name}: ${t.text}`, value: t }));
    return await (0, prompt_1.askSelect)('เลือกข้อความ:', choices);
}
// ── Working Config ────────────────────────────────────────────────
async function setupConfig() {
    console.log(chalk_1.default.bold('\n── ตั้งค่าการทำงาน ──────────────────────'));
    const maxRounds = await (0, prompt_1.askNumber)('จำนวนรอบ:', 3);
    const scrollPerRound = await (0, prompt_1.askNumber)('Scroll ต่อรอบ:', 2);
    const cooldownSec = await (0, prompt_1.askNumber)('Cooldown ระหว่างรอบ (วินาที):', 90);
    const maxPosts = await (0, prompt_1.askNumber)('โพสต์สูงสุดต่อรอบ:', 10);
    return {
        config: { scrollPerRound, cooldownMs: cooldownSec * 1000, maxPostsPerRound: maxPosts },
        maxRounds,
    };
}
// ── Scan Loop ─────────────────────────────────────────────────────
async function runJobLoop(account, target, template, config, maxRounds) {
    const context = (0, session_agent_1.getContext)();
    const page = await context.newPage();
    let totalFound = 0;
    let totalNew = 0;
    let totalSkip = 0;
    for (let round = 1; round <= maxRounds; round++) {
        console.log(chalk_1.default.bold(`\n── รอบที่ ${round} / ${maxRounds} ──────────────────────`));
        (0, logger_agent_1.logEvent)('scan_round_start', { round, of: maxRounds });
        const rawPosts = await (0, scanner_agent_1.runScanRound)(page, target.target_url, config);
        const { newPosts, skipped, skipReasons } = (0, duplicate_agent_1.filterNewPosts)(account.id, target.id, rawPosts);
        totalFound += rawPosts.length;
        totalNew += newPosts.length;
        totalSkip += skipped;
        // Log ทุกโพสต์ที่เจอ
        rawPosts.forEach((p) => (0, logger_agent_1.logEvent)('post_found', { url: p.postUrl }));
        if (skipped > 0)
            (0, logger_agent_1.logEvent)('post_duplicate', { count: skipped, reasons: skipReasons });
        // Enqueue โพสต์ใหม่
        for (const post of newPosts) {
            try {
                (0, review_agent_1.enqueuePost)({
                    account_id: account.id,
                    target_id: target.id,
                    post_id: post.postId,
                    post_url: post.postUrl,
                    post_text: post.postText,
                    author_name: post.authorName,
                }, template.text);
                (0, logger_agent_1.logEvent)('post_queued', { url: post.postUrl });
            }
            catch (err) {
                (0, logger_agent_1.logError)('enqueue_error', err);
            }
        }
        console.log(chalk_1.default.gray(`พบ ${rawPosts.length} โพสต์`) +
            chalk_1.default.green(`  ใหม่ ${newPosts.length}`) +
            chalk_1.default.gray(`  ซ้ำ ${skipped}`));
        (0, logger_agent_1.logEvent)('scan_round_complete', { round, found: rawPosts.length, new: newPosts.length, skipped });
        if (round < maxRounds) {
            console.log(chalk_1.default.gray(`รอ Cooldown...`));
        }
    }
    console.log(chalk_1.default.bold(`\n── สรุปการ Scan ─────────────────────────`));
    console.log(`พบทั้งหมด: ${chalk_1.default.white(totalFound)}  ใหม่: ${chalk_1.default.green(totalNew)}  ซ้ำ: ${chalk_1.default.gray(totalSkip)}`);
}
// ── Entry Point ───────────────────────────────────────────────────
async function runNewJobSetup() {
    try {
        // Step 5: Session
        const profilePath = await resolveProfilePath();
        if (!profilePath)
            return;
        const ok = await openAndVerifySession(profilePath);
        if (!ok)
            return;
        // Step 6: Account + Target
        const account = account_repo_1.accountRepo.findOrCreate(profilePath);
        console.log(chalk_1.default.gray(`\nบัญชี: ${account.account_name} (id=${account.id})`));
        console.log();
        const target = await (0, target_agent_1.selectTarget)(account.id);
        console.log(chalk_1.default.green(`✓ Target: ${target.target_url} [${target.target_type}]`));
        // Template + Config
        const template = await selectMessageTemplate();
        console.log(chalk_1.default.green(`✓ ข้อความ: ${template.text.slice(0, 50)}`));
        const { config, maxRounds } = await setupConfig();
        const confirm = await (0, prompt_1.askConfirm)('\nพร้อมเริ่มทำงาน?', true);
        if (!confirm) {
            await (0, session_agent_1.closeBrowser)();
            return;
        }
        // Start Job
        const jobId = (0, logger_agent_1.createJob)();
        (0, logger_agent_1.logEvent)('job_setup', { account: account.id, target: target.target_url, rounds: maxRounds });
        // Run Scan Loop
        await runJobLoop(account, target, template, config, maxRounds);
        // End Job + Summary
        const summary = (0, logger_agent_1.endJob)();
        await (0, session_agent_1.closeBrowser)();
        (0, summary_view_1.showSummary)(summary);
    }
    catch (err) {
        (0, logger_agent_1.logError)('job_fatal_error', err);
        await (0, session_agent_1.closeBrowser)();
        const msg = err instanceof Error ? err.message : String(err);
        console.log(chalk_1.default.red(`\n✗ เกิดข้อผิดพลาด: ${msg}`));
    }
}
//# sourceMappingURL=new-job.flow.js.map