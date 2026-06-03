"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSummary = showSummary;
const chalk_1 = __importDefault(require("chalk"));
function fmtDuration(sec) {
    if (sec < 60)
        return `${sec} วินาที`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${m} นาที ${s} วินาที` : `${m} นาที`;
}
function fmtTime(iso) {
    return iso.replace('T', ' ').split('.')[0];
}
function bar(count, total, width = 20) {
    if (total === 0)
        return chalk_1.default.gray('░'.repeat(width));
    const filled = Math.round((count / total) * width);
    return chalk_1.default.green('█'.repeat(filled)) + chalk_1.default.gray('░'.repeat(width - filled));
}
function showSummary(summary) {
    const { totalFound, duplicates, queued, done, rejected, errors, durationSec } = summary;
    console.log();
    console.log(chalk_1.default.bold.blue('╔══════════════════════════════════════════╗'));
    console.log(chalk_1.default.bold.blue('║') + chalk_1.default.bold('  📊 สรุปผลการทำงาน                       ') + chalk_1.default.bold.blue('║'));
    console.log(chalk_1.default.bold.blue('╚══════════════════════════════════════════╝'));
    console.log();
    console.log(chalk_1.default.gray(`Job ID  : ${summary.jobId}`));
    console.log(chalk_1.default.gray(`เริ่ม   : ${fmtTime(summary.startedAt)}`));
    console.log(chalk_1.default.gray(`จบ      : ${fmtTime(summary.endedAt)}`));
    console.log(chalk_1.default.gray(`ใช้เวลา : ${fmtDuration(durationSec)}`));
    console.log();
    console.log(chalk_1.default.bold('── โพสต์ ─────────────────────────────────'));
    console.log(`  พบทั้งหมด   : ${chalk_1.default.white(totalFound)}`);
    console.log(`  ใหม่         : ${chalk_1.default.green(queued)}`);
    console.log(`  ซ้ำ (Skip)   : ${chalk_1.default.gray(duplicates)}`);
    console.log();
    console.log(chalk_1.default.bold('── Review Queue ──────────────────────────'));
    if (queued > 0) {
        console.log(`  ${bar(done, queued)} Done     ${chalk_1.default.green(done)} / ${queued}`);
        console.log(`  ${bar(rejected, queued)} Rejected ${chalk_1.default.red(rejected)} / ${queued}`);
        const pending = queued - done - rejected;
        if (pending > 0) {
            console.log(`  ${bar(pending, queued)} รอ Review ${chalk_1.default.yellow(pending)} / ${queued}`);
        }
    }
    else {
        console.log(chalk_1.default.gray('  (ไม่มีโพสต์เข้า Queue)'));
    }
    if (errors > 0) {
        console.log();
        console.log(`  ${chalk_1.default.red('⚠')} Error : ${chalk_1.default.red(errors)} ครั้ง`);
    }
    console.log();
}
//# sourceMappingURL=summary.view.js.map