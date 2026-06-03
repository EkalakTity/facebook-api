"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showReviewQueue = showReviewQueue;
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const review_queue_repo_1 = require("../db/repositories/review-queue.repo");
const review_agent_1 = require("../agents/review.agent");
const prompt_1 = require("./prompt");
function shortUrl(url) {
    return url.replace('https://www.facebook.com', 'fb.com').slice(0, 60);
}
function printItem(item, index, total) {
    console.log();
    console.log(chalk_1.default.bold(`#${index + 1} / ${total}`) + '  ' + chalk_1.default.yellow('[pending]') + '  ' + chalk_1.default.gray(item.author_name ?? 'ไม่ทราบชื่อ'));
    console.log(chalk_1.default.cyan(shortUrl(item.post_url)));
    if (item.post_text) {
        const preview = item.post_text.slice(0, 120).replace(/\n/g, ' ');
        console.log(chalk_1.default.gray(`"${preview}${item.post_text.length > 120 ? '...' : ''}"`));
    }
    console.log(chalk_1.default.gray('─'.repeat(50)));
    if (item.message_text) {
        console.log('ข้อความ: ' + chalk_1.default.white(item.message_text));
    }
    else {
        console.log(chalk_1.default.gray('(ไม่มีข้อความที่เตรียมไว้)'));
    }
    console.log();
}
async function handleItemAction(item) {
    const action = await (0, prompt_1.askSelect)('เลือกการทำงาน:', [
        { name: '🔗 เปิด Post ใน Browser', value: 'open' },
        { name: '📋 แสดงข้อความ (Copy)', value: 'copy' },
        { name: chalk_1.default.green('✓ Mark as Done'), value: 'done' },
        { name: chalk_1.default.red('✗ Reject'), value: 'reject' },
        { name: '→ Skip ไปรายการถัดไป', value: 'skip' },
        { name: chalk_1.default.gray('← กลับเมนูหลัก'), value: 'exit' },
    ]);
    switch (action) {
        case 'open':
            (0, child_process_1.exec)(`start "" "${item.post_url}"`);
            console.log(chalk_1.default.gray(`เปิด: ${item.post_url}`));
            return 'next';
        case 'copy':
            console.log();
            console.log(chalk_1.default.bold('── ข้อความ ──────────────────────────────'));
            console.log(chalk_1.default.white(item.message_text ?? '(ไม่มีข้อความ)'));
            console.log(chalk_1.default.bold('─────────────────────────────────────────'));
            console.log(chalk_1.default.gray('(Copy ข้อความด้านบนแล้วไปวางในโพสต์)'));
            return 'next';
        case 'done': {
            const confirm = await (0, prompt_1.askConfirm)('ยืนยัน Mark as Done?', true);
            if (confirm) {
                (0, review_agent_1.markAsDone)(item);
                console.log(chalk_1.default.green('✓ บันทึกแล้ว'));
            }
            return 'next';
        }
        case 'reject': {
            const confirm = await (0, prompt_1.askConfirm)('ยืนยัน Reject โพสต์นี้?', false);
            if (confirm) {
                (0, review_agent_1.rejectPost)(item);
                console.log(chalk_1.default.red('✗ Rejected'));
            }
            return 'next';
        }
        case 'skip':
            return 'next';
        case 'exit':
            return 'exit';
    }
}
async function showReviewQueue() {
    while (true) {
        const queue = review_queue_repo_1.reviewQueueRepo.getPendingQueue();
        if (queue.length === 0) {
            console.log(chalk_1.default.gray('\nไม่มีรายการที่รอ Review'));
            break;
        }
        console.clear();
        console.log(chalk_1.default.bold.blue(`📋 Review Queue`) + chalk_1.default.yellow(`  (${queue.length} รายการ)`));
        let i = 0;
        while (i < queue.length) {
            // โหลดข้อมูลล่าสุดแต่ละรอบ (อาจมีการอัปเดต status)
            const fresh = review_queue_repo_1.reviewQueueRepo.getPendingQueue();
            if (i >= fresh.length)
                break;
            const item = fresh[i];
            console.clear();
            console.log(chalk_1.default.bold.blue(`📋 Review Queue`) + chalk_1.default.yellow(`  (${fresh.length} รายการ)`));
            printItem(item, i, fresh.length);
            const result = await handleItemAction(item);
            if (result === 'exit')
                return;
            // ถ้า done/reject → ไม่เพิ่ม i เพราะรายการถัดไปเลื่อนขึ้นมาเอง
            // ถ้า skip/copy/open → เพิ่ม i
            const isActioned = ['done', 'reject'].includes(review_queue_repo_1.reviewQueueRepo.getById(item.id)?.status ?? '');
            if (!isActioned)
                i++;
        }
        break;
    }
    console.log(chalk_1.default.gray('\nQueue ว่างแล้ว หรือทำครบทุกรายการแล้ว'));
}
//# sourceMappingURL=review-queue.view.js.map